import { ref, readonly, computed, toValue, type MaybeRefOrGetter } from 'vue'

export interface ImageUploadOptions {
  /** Max width in px for compression (200-4096). Default: 1200 */
  maxWidth?: number
  /** WebP quality 0-1. Default: 0.8 */
  quality?: number
  /** Max file size in MB (1-20). Default: 5 */
  maxSizeMB?: number
  /** Whether to auto-compress via Canvas re-encode. Default: true */
  autoCompress?: boolean
}

/**
 * useImageUpload — Image upload to Supabase Storage with client-side compression
 *
 * SECURITY: Canvas re-encode is the primary sanitizer:
 *   1. Decodes image via Image() → draws to Canvas → re-encodes as WebP
 *   2. Strips ALL metadata (EXIF, XMP, ICC profiles, comments)
 *   3. Drops non-image payloads (polyglot, steganographic data)
 *   4. Fails on SVGs (browser blocks Canvas drawImage for SVG)
 *   5. Produces clean WebP — uniform format, no script injection vector
 *
 * Accepts optional reactive overrides for maxWidth, quality, maxSizeMB, autoCompress.
 * These can come from configuracion table via PlatoForm:
 *   const uploadOpts = ref<ImageUploadOptions>({ maxWidth: 1200 })
 *   onMounted(async () => { uploadOpts.value = await loadConfig() })
 *   const { uploading, uploadFromFile } = useImageUpload(uploadOpts)
 */

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
const BUCKET = 'plato-images'

export function useImageUpload(options?: MaybeRefOrGetter<ImageUploadOptions | undefined>) {
  const supabase = useSupabaseClient()
  const uploading = ref(false)
  const uploadError = ref<string | null>(null)

  // Resolve reactive options — supports ref, getter, or plain object
  const resolvedOpts = computed<ImageUploadOptions>(() => {
    const raw = toValue(options)
    return {
      maxWidth: raw?.maxWidth ?? 1200,
      quality: raw?.quality ?? 0.8,
      maxSizeMB: raw?.maxSizeMB ?? 5,
      autoCompress: raw?.autoCompress ?? true,
    }
  })

  // Computed helpers from resolved options
  const maxWidth = computed(() => resolvedOpts.value.maxWidth!)
  const quality = computed(() => resolvedOpts.value.quality!)
  const maxSizeBytes = computed(() => (resolvedOpts.value.maxSizeMB!) * 1024 * 1024)
  const autoCompress = computed(() => resolvedOpts.value.autoCompress!)

  /**
   * Validate file is a supported image
   */
  function validateImage(file: File): string | null {
    // Explicitly block SVGs — can't be sanitized by Canvas re-encode
    if (file.type === 'image/svg+xml') {
      return 'No se permiten imágenes SVG por riesgo de seguridad. Usa JPEG, PNG, WebP o AVIF.'
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Formato no soportado. Usa JPEG, PNG, WebP o AVIF.'
    }
    const maxMB = resolvedOpts.value.maxSizeMB!
    if (file.size > maxSizeBytes.value) {
      return `La imagen excede los ${maxMB}MB (tamaño actual: ${(file.size / 1024 / 1024).toFixed(1)}MB)`
    }
    return null
  }

  /**
   * Compress image to WebP using Canvas
   *
   * SECURITY (defense in depth after server-side checks):
   * - Canvas.drawImage() blocks SVG via SecurityError (origin-clean check)
   * - Re-encoding strips ALL metadata and non-image data
   * - Produces clean WebP — no script injection vector
   *
   * Honors options.maxWidth and options.quality from config.
   * If autoCompress is false, returns the original file as-is (no re-encode).
   */
  async function compressToWebP(file: File): Promise<Blob> {
    // Skip compression if disabled
    if (!autoCompress.value) return file

    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      const currentMaxWidth = maxWidth.value
      const currentQuality = quality.value

      img.onload = () => {
        URL.revokeObjectURL(url)

        let { width, height } = img
        if (width === 0 || height === 0) {
          reject(new Error('La imagen tiene dimensiones inválidas'))
          return
        }
        if (width > currentMaxWidth) {
          height = Math.round((height * currentMaxWidth) / width)
          width = currentMaxWidth
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('No se pudo crear el contexto canvas'))
          return
        }

        // Security: drawImage strips metadata & non-image data.
        // For SVGs, this throws a SecurityError (tainted canvas).
        try {
          ctx.drawImage(img, 0, 0, width, height)
        } catch {
          reject(new Error('El archivo no se puede procesar como imagen segura'))
          return
        }

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob)
            else reject(new Error('Error al comprimir la imagen'))
          },
          'image/webp',
          currentQuality,
        )
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        // SVGs typically trigger onerror with SecurityError
        reject(new Error('Formato de imagen no válido o bloqueado por seguridad'))
      }

      img.src = url
    })
  }

  /**
   * Upload a File to Supabase Storage (compresses to WebP)
   * Returns the public URL or null on error
   */
  async function uploadFromFile(file: File, fileName?: string): Promise<string | null> {
    uploading.value = true
    uploadError.value = null

    try {
      const err = validateImage(file)
      if (err) {
        uploadError.value = err
        return null
      }

      const processedBlob = await compressToWebP(file)
      const isWebP = autoCompress.value
      const ext = isWebP ? 'webp' : file.name.split('.').pop() ?? 'jpg'
      const contentType = isWebP ? 'image/webp' : file.type
      const uniqueName = fileName ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

      const { data, error } = await supabase.storage
        .from(BUCKET)
        .upload(`public/${uniqueName}`, processedBlob, {
          contentType,
          upsert: true,
        })

      if (error) {
        uploadError.value = error.message
        return null
      }

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path)
      return urlData.publicUrl
    } catch (e) {
      uploadError.value = e instanceof Error ? e.message : 'Error al subir la imagen'
      return null
    } finally {
      uploading.value = false
    }
  }

  /**
   * Download an external URL to Supabase Storage
   * Uses a Nitro proxy endpoint to avoid CORS restrictions in the browser.
   *
   * SECURITY PIPELINE:
   *   Server (fetch-image proxy):
   *     - Blocks SVG content-type
   *     - Validates magic bytes (JPEG/PNG/WebP/GIF/BMP)
   *     - SSRF protection (blocks private IPs)
   *     - Size limit (10MB)
   *   Client (this function):
   *     - validateImage() blocks SVGs explicitly
   *     - compressToWebP() re-encodes via Canvas → strips ALL non-image data
   *     - Final upload is clean WebP — uniform format, no metadata, no scripts
   */
  async function uploadFromUrl(imageUrl: string): Promise<string | null> {
    uploading.value = true
    uploadError.value = null

    try {
      // Download via server-side proxy (avoids CORS)
      const proxyUrl = `/api/fetch-image?url=${encodeURIComponent(imageUrl)}`
      const response = await fetch(proxyUrl)
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        uploadError.value = err?.message ?? 'No se pudo descargar la imagen de la URL'
        return null
      }

      const blob = await response.blob()
      const file = new File([blob], 'downloaded', { type: blob.type })

      const err = validateImage(file)
      if (err) {
        uploadError.value = err
        return null
      }

      const processedBlob = await compressToWebP(file)
      const isWebP = autoCompress.value
      const ext = isWebP ? 'webp' : 'jpg'
      const contentType = isWebP ? 'image/webp' : file.type
      const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

      const { data, error } = await supabase.storage
        .from(BUCKET)
        .upload(`public/${uniqueName}`, processedBlob, {
          contentType,
          upsert: true,
        })

      if (error) {
        uploadError.value = error.message
        return null
      }

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path)
      return urlData.publicUrl
    } catch (e) {
      uploadError.value = e instanceof Error ? e.message : 'Error al procesar la imagen'
      return null
    } finally {
      uploading.value = false
    }
  }

  return {
    uploading: readonly(uploading),
    uploadError: readonly(uploadError),
    uploadFromFile,
    uploadFromUrl,
    validateImage,
    compressToWebP,
  }
}
