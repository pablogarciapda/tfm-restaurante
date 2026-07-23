# Slidev Headmatter Options (deck-level frontmatter)

All options go in the first YAML frontmatter block of `slides.md`.

## Theme & Layout

| Option | Default | Description |
|--------|---------|-------------|
| `theme` | `default` | Theme name (npm package or built-in: `default`, `seriph`) |
| `layout` | `default` | Default layout for all slides (`default`, `cover`, `center`, `image`, `iframe-left`, `iframe-right`, `full`, `fact`, `statement`) |
| `aspectRatio` | `16/9` | Slide aspect ratio |
| `canvasWidth` | `980` | Canvas width in px |

## Presentation Info

| Option | Description |
|--------|-------------|
| `title` | Presentation title |
| `author` | Author name |
| `description` | Short description |
| `keywords` | Comma-separated keywords |
| `info` | Custom info (supports HTML) |

## Appearance

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `colorSchema` | string | `auto` | `light`, `dark`, or `auto` |
| `background` | string | — | Background image URL |
| `fonts.sans` | string | — | Sans-serif font name |
| `fonts.mono` | string | — | Monospace font name |
| `fonts.weights` | string | `300,400,600,700` | Font weights |
| `fonts.italic` | boolean | `false` | Include italic |
| `fonts.local` | string | — | Local font path |

## Code & Editor

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `highlighter` | string | `shiki` | Code highlighter |
| `lineNumbers` | boolean | `false` | Show line numbers |
| `monaco` | boolean/string | `false` | Monaco editor (`true`, `dev`, `build`) |
| `twoslash` | boolean | `false` | TypeScript TwoSlash |
| `monacoTypesSource` | string | `local` | Type source: `local`, `cdn`, or `none` |
| `color` | string | — | Code highlighting color theme |
| `codeCopy` | boolean | `true` | Show copy button on code blocks |

## Transitions & Animations

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `transition` | string | `fade` | Slide transition (`fade`, `slide-left`, `slide-right`, `slide-up`, `slide-down`, `view-transition`, or custom CSS) |
| `motion` | object | — | Motion/motion preset config |
| `zoom` | number | `1` | Zoom level for current slide |

## Presenter & Recording

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `presenter` | boolean/string | `true` | Enable presenter mode (`true`, `dev`, `build`) |
| `recording` | string | — | Recording config |
| `duration` | string | `30min` | Presentation duration (for timer) |
| `timer` | string | `stopwatch` | Timer mode (`stopwatch` or `countdown`) |

## Drawing

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `drawings.enabled` | boolean | `true` | Enable drawing mode |
| `drawings.persist` | boolean | `false` | Persist drawings across slides |

## Export & Build

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `download` | boolean | `false` | Allow PDF download in built SPA |
| `browserExporter` | string | `dev` | Browser export mode (`true`, `dev`, `build`) |
| `routerMode` | string | `history` | Router mode (`history` or `hash`) |
| `remote` | string | — | Remote access config |

## Defaults (per-slide overrides)

```yaml
defaults:
  layout: default
  transition: fade
  class: text-base
```

## Per-Slide Frontmatter Options

| Option | Description |
|--------|-------------|
| `layout` | Override layout for this slide |
| `background` | Background image URL |
| `class` | CSS classes for this slide |
| `transition` | Override transition for this slide only |
| `clicks` | Number of click steps |
| `hideInToc` | Hide from table of contents |
| `zoom` | Zoom level |
| `preload` | Preload next slide |
| `src` | Include content from an external Markdown file |
| `image` | Image path (for `image` layout) |
| `url` | URL (for `iframe` layout) |
| `iframeScrolling` | Enable iframe scrolling |