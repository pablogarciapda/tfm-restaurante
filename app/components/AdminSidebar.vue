<!--
  AdminSidebar — Permission-aware navigation for /cocina (PU-009)

  Shows all 7 links for admin. Editor sees only permitted resources.
  Active route highlighted via NuxtLink. Logout button at bottom.
  Mobile collapsible via hamburger toggle emitted from parent.
-->
<script setup lang="ts">
import { computed } from 'vue'

const emit = defineEmits<{
  navigate: []
}>()

const role = useState<string | null>('cocina-role')
const permissions = useState<Record<string, boolean> | null>('cocina-permissions')
const { signOut } = useAuth()

function handleNavigate() {
  emit('navigate')
}

// ── Nav items with permission keys ──
interface NavItem {
  label: string
  to: string
  resource: string | null // null = always visible (Dashboard)
}

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/cocina/dashboard', resource: null },
  { label: 'Carta', to: '/cocina/carta', resource: 'carta' },
  { label: 'Menú Diario', to: '/cocina/menu-diario', resource: 'menu_diario' },
  { label: 'Eventos', to: '/cocina/eventos', resource: 'eventos' },
  { label: 'Reservas', to: '/cocina/reservas', resource: 'reservas' },
  { label: 'Configuración', to: '/cocina/configuracion', resource: 'configuracion' },
  { label: 'Usuarios', to: '/cocina/usuarios', resource: 'usuarios' },
]

// ── Permission-aware filter ──
const visibleItems = computed(() =>
  navItems.filter((item) => {
    if (item.resource === null) return true // Dashboard always visible
    if (role.value === 'admin') return true
    return permissions.value?.[item.resource] === true
  }),
)

// ── Logout ──
async function handleLogout() {
  await signOut()
}
</script>

<template>
  <nav
    class="flex h-full flex-col bg-slate text-cream"
    aria-label="Panel de administración"
  >
    <!-- App brand -->
    <div class="border-b border-slate-700 px-4 py-4">
      <span class="font-serif text-lg font-bold text-terracotta">La Zíngara</span>
    </div>

    <!-- Navigation links -->
    <ul class="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      <li v-for="item in visibleItems" :key="item.to">
        <NuxtLink
          :to="item.to"
          class="block rounded-md px-3 py-2 text-sm font-medium text-cream/80 transition-colors hover:bg-slate-700 hover:text-cream"
          active-class="bg-terracotta text-white"
          @click="handleNavigate"
        >
          {{ item.label }}
        </NuxtLink>
      </li>
    </ul>

    <!-- Logout -->
    <div class="border-t border-slate-700 px-3 py-4">
      <button
        data-testid="sidebar-logout"
        class="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-cream/60 transition-colors hover:bg-slate-700 hover:text-cream"
        @click="handleLogout"
      >
        Cerrar sesión
      </button>
    </div>
  </nav>
</template>
