# Rambots Design System — sync notes

## Origin
- Repo started EMPTY. This design system is authored from scratch from the
  Rambots brand guidelines (https://docs.rambots.org/business/Branding/guidelines.html),
  not converted from a pre-existing component library.

## Brand facts
- Names: "Rambots" or "RAMBOTS" only. NEVER "RamBots" or "Ram Bots".
  Also: 2204 Rambots, Team 2204, The Rambots, Team 2204 "The Rambots".
- Rambot Red  #A31F36 — primary background / school color.
- Rambot Yellow #F4A81C — opposite of red; used for text/logo accents.
- Font: Helvetica Neue (proprietary — cannot embed; stack fallback used until
  licensed webfonts are dropped in assets/fonts/).
- Logos: "gearhead" = Robo Ram main logo; "graffiti"/"streetwear" = the wordmark
  formerly called the stussy logo (trademark reference to be removed).

## Pending from user (via assets/ folder in repo)
- Logo source files -> assets/logos/
- Licensed Helvetica Neue webfonts -> assets/fonts/

## Build / sync setup
- shape=package. buildCmd="npm run build" → esbuild (dist/index.es.js, react external)
  + tsc --emitDeclarationOnly (dist .d.ts) + copies src/styles.css → dist/styles.css.
- Converter entry: --entry ./dist/index.es.js --node-modules ./node_modules
  (repo self-package isn't in node_modules, so --entry is required).
- cssEntry=dist/styles.css. docsDir=docs/components (category frontmatter → group).
  guidelinesGlob=docs/*.md (brand-guidelines.md → guidelines/).
- runtimeFontPrefixes=["Helvetica"] suppresses [FONT_MISSING] for the Helvetica
  Neue system-font stack (no webfont shipped yet).
- overrides: Button + Input use cardMode:"column" (their multi-item stories
  overflowed the grid cell in row mode).
- Playwright render check: chromium build 1194 pre-installed at /opt/pw-browsers;
  install playwright-core@1.56.0 + playwright@1.56.0 in .ds-sync (only 1.56.0
  pins build 1194).

## Known render warns
- None. Render check exits 0 with 0 bad / 0 thin / 0 variantsIdentical.

## Re-sync risks (watch-list for the next run)
- **Logo mark is a placeholder gear**, not the official Robo Ram. When the real
  gearhead SVG lands in assets/logos/, replace the inline SVG in
  src/components/Logo.tsx and rebuild. Same for the graffiti/streetwear wordmark
  if it becomes a component.
- **Fonts**: Helvetica Neue is a fallback stack only. When licensed webfonts are
  dropped in assets/fonts/, add @font-face CSS and wire via cfg.extraFonts (or an
  @font-face block imported from styles.css); then drop runtimeFontPrefixes.
- Colors/type are the source of truth in src/styles.css (tokens) — keep the
  guidelines doc, ColorPalette defaults, and TypeSpecimen scale in sync with it.
- The whole DS is authored (not from an upstream lib), so previews won't drift
  from external code; they only change when we edit src/.
