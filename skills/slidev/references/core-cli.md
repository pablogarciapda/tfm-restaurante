# Slidev CLI Commands

## Init

```bash
npm init slidev
pnpm create slidev
```

## Development

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server (http://localhost:3030) |
| `pnpm dev --remote [password]` | Remote access (control from another device) |
| `pnpm dev --port 8080` | Custom port |

## Build (SPA)

```bash
pnpm build                     # Default build to dist/
pnpm build --out public        # Custom output dir
pnpm build --base /my-talk/    # Custom base URL for deployment
pnpm build --download          # Include PDF download button
pnpm build --without-notes     # Exclude presenter notes
pnpm build slides1.md slides2.md  # Multiple builds
```

## Export

| Command | Description |
|---------|-------------|
| `pnpm export` | Export to PDF (default) |
| `pnpm export --format pptx` | Export to PowerPoint (slides as images) |
| `pnpm export --format png` | Export each slide as PNG |
| `pnpm export --format md` | Export to standalone Markdown |
| `pnpm export --with-clicks` | Include click animation steps |
| `pnpm export --range 1,4-7` | Export specific slide range |
| `pnpm export --dark` | Dark mode export |
| `pnpm export --output talk.pdf` | Custom output filename |
| `pnpm export --timeout 60000` | Custom timeout per slide (ms) |
| `pnpm export --wait 2000` | Wait ms before capturing |
| `pnpm export --with-toc` | Include PDF table of contents |
| `pnpm export --omit-background` | Transparent background |

## Other

| Command | Description |
|---------|-------------|
| `pnpm format` | Format slides.md |
| `npx slidev --help` | Show all CLI options |
| `npx slidev theme list` | List available local themes |

## Package.json Scripts (recommended)

```json
{
  "scripts": {
    "dev": "slidev",
    "build": "slidev build",
    "export": "slidev export",
    "format": "slidev format"
  }
}
```

## GitHub Actions Deploy

```yaml
name: Deploy
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 'lts/*'
      - run: npm install
      - run: npm run build -- --base /${{ github.event.repository.name }}/
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - uses: actions/deploy-pages@v4
```