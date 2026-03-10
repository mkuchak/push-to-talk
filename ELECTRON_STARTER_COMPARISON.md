# Electron Starter Kits & Boilerplates: Comprehensive Comparison (2025-2026)

## Table of Contents

1. [Build Tools & Packaging Ecosystem](#1-build-tools--packaging-ecosystem)
2. [Top Boilerplates & Starter Kits](#2-top-boilerplates--starter-kits)
3. [Comparison Table](#3-comparison-table)
4. [Detailed Analysis](#4-detailed-analysis)
5. [Community Sentiment & Recommendations](#5-community-sentiment--recommendations)
6. [Recommendation Matrix](#6-recommendation-matrix)

---

## 1. Build Tools & Packaging Ecosystem

Before evaluating starter kits, it is important to understand the three core build/packaging tools in the Electron ecosystem:

### electron-builder
- **GitHub:** https://github.com/electron-userland/electron-builder
- **Stars:** 14,500+
- **Weekly Downloads:** ~1,450,000
- **Latest:** v26.8.2 (March 2026)
- **Role:** Packaging & distribution tool (creates installers, code signing, auto-update)
- **Formats:** DMG, PKG, MAS (macOS), AppImage, snap, deb, rpm (Linux), NSIS, portable, AppX, MSI (Windows)
- **Auto-update:** Built-in via electron-updater
- **Status:** Most widely adopted packaging solution by far

### Electron Forge (Official)
- **GitHub:** https://github.com/electron/forge
- **Stars:** 7,000+
- **Weekly Downloads:** ~1,900 (note: the main `@electron-forge/*` scoped packages have higher numbers)
- **Latest:** v7.11.1 (January 2026)
- **Role:** Complete lifecycle tool (scaffold, build, package, publish)
- **Packaging:** Uses @electron/packager internally, supports multiple "Makers" (Squirrel, ZIP, DEB, RPM, DMG, etc.)
- **Plugins:** Vite plugin (experimental as of v7.5.0), Webpack plugin
- **Status:** Official Electron team project, actively maintained, 116+ contributors

### electron-vite (Build Tool)
- **GitHub:** https://github.com/alex8088/electron-vite
- **Stars:** 5,250+
- **Weekly Downloads:** ~241,600
- **Latest:** v5.0.0 (December 2025)
- **Role:** Build tool only (bundles main/preload/renderer via Vite; pairs with electron-builder or Electron Forge for packaging)
- **Status:** Rapidly growing, actively maintained

#### Key Distinction: electron-vite vs Electron Forge

| Aspect | electron-vite | Electron Forge + Vite Plugin |
|--------|--------------|------------------------------|
| **Type** | Build tool (needs separate packager) | Full lifecycle tool (build + package + publish) |
| **Vite Integration** | Deep, native Vite integration | Plugin-based, experimental |
| **Configuration** | Single `electron.vite.config.js` | Separate `vite.main.config.js` + `vite.renderer.config.js` + `forge.config.js` |
| **Source Code Protection** | V8 bytecode compilation built-in | Not available |
| **Packaging** | Pairs with electron-builder or Electron Forge | Built-in makers |
| **HMR** | Full HMR for renderer, hot reload for main/preload | HMR via global variables pattern |
| **Framework Templates** | Vue, React, Svelte, Solid, Vanilla | Vite + Vite-TypeScript templates |
| **Maturity** | Stable (v5.0) | Vite plugin marked "experimental" |
| **Community Adoption** | Higher download count | Official backing from Electron team |

---

## 2. Top Boilerplates & Starter Kits

### Tier 1: Most Popular (10,000+ stars)

#### electron-react-boilerplate
- **GitHub:** https://github.com/electron-react-boilerplate/electron-react-boilerplate
- **Stars:** 24,200+
- **Forks:** 4,000+
- **Framework:** React
- **Build Tool:** Webpack
- **Packager:** electron-builder
- **TypeScript:** Yes
- **Auto-update:** Yes
- **HMR:** React Fast Refresh
- **Last Active:** Actively maintained
- **Pros:** Largest community, mature, battle-tested, comprehensive documentation
- **Cons:** Uses Webpack (slower than Vite), heavier configuration, can feel over-engineered for small projects

---

### Tier 2: Major Players (3,000-10,000 stars)

#### angular-electron
- **GitHub:** https://github.com/maximegris/angular-electron
- **Stars:** 5,700+
- **Framework:** Angular 21
- **Build Tool:** Webpack + Angular CLI
- **Packager:** electron-builder
- **TypeScript:** Yes (native with Angular)
- **Testing:** Vitest + Playwright
- **Last Active:** March 2026 (v17.1.0)
- **Pros:** Best option for Angular developers, hot reload, VSCode debugging, browser mode
- **Cons:** Angular-only, heavier framework overhead

#### electron-vite (build tool + templates)
- **GitHub:** https://github.com/alex8088/electron-vite
- **Stars:** 5,250+
- **Used by:** 11,400+ projects
- **Frameworks:** Vue, React, Svelte, Solid, Vanilla (via scaffolding)
- **Build Tool:** Vite (native)
- **Packager:** electron-builder (default) or Electron Forge
- **TypeScript:** Yes (out of the box)
- **Auto-update:** Via electron-updater (when paired with electron-builder)
- **HMR:** Full HMR for renderer, hot reload for main/preload
- **Source Code Protection:** V8 bytecode compilation
- **Last Active:** March 2026 (v5.0.0)
- **Pros:** Fastest build times, framework-agnostic, source code protection, excellent DX, active maintenance
- **Cons:** Not an official Electron project, requires separate packaging tool

#### electron-vite-vue
- **GitHub:** https://github.com/electron-vite/electron-vite-vue
- **Stars:** 4,900+
- **Framework:** Vue 3
- **Build Tool:** Vite
- **Packager:** electron-builder
- **TypeScript:** Yes
- **HMR:** Yes
- **Last Active:** April 2024 (v28.0.0)
- **Pros:** Simple and focused, easy to understand, good Vue integration, native addon support
- **Cons:** Vue-only, slightly less recent updates

#### vite-electron-builder
- **GitHub:** https://github.com/cawa-93/vite-electron-builder
- **Stars:** 3,000+
- **Frameworks:** Vue, React, Angular, Svelte, Vanilla
- **Build Tool:** Vite
- **Packager:** electron-builder
- **TypeScript:** Yes
- **Auto-update:** Yes (CI-triggered builds with auto-update)
- **Security:** Built following Electron's official security guidelines
- **Testing:** Playwright E2E
- **Structure:** Monorepo (packages: main, preload, renderer)
- **Last Active:** Actively maintained through 2026
- **Pros:** Security-focused, framework-agnostic, monorepo structure, auto-update out of the box
- **Cons:** No renderer included by default (you must create one), steeper initial setup

#### szwacz/electron-boilerplate
- **GitHub:** https://github.com/szwacz/electron-boilerplate
- **Stars:** 3,100+
- **Build Tool:** Webpack + Babel
- **Packager:** electron-builder
- **TypeScript:** No
- **Status:** ARCHIVED (December 2022)
- **Pros:** Minimal, easy to understand, good educational resource
- **Cons:** No longer maintained, no TypeScript, uses Webpack, outdated

---

### Tier 3: Notable Options (500-3,000 stars)

#### electron-vite-react
- **GitHub:** https://github.com/electron-vite/electron-vite-react
- **Stars:** 2,400+
- **Framework:** React
- **Build Tool:** Vite
- **Packager:** electron-builder
- **TypeScript:** Yes (81.2% of codebase)
- **HMR:** Yes
- **Extras:** Tailwind CSS, PostCSS, Playwright testing, electron-updater
- **Last Active:** March 2026
- **Pros:** React + Vite + Electron with minimal config, native addon support, multi-window support
- **Cons:** Less opinionated (some may want more structure)

#### secure-electron-template
- **GitHub:** https://github.com/reZach/secure-electron-template
- **Stars:** 1,700+
- **Framework:** React + Redux
- **Build Tool:** Webpack
- **Packager:** electron-builder
- **TypeScript:** Yes
- **Security:** Implements ALL 17 official Electron security recommendations
- **Extras:** i18next, secure store, context menu, license keys module
- **Last Active:** July 2022 (v22.0.0)
- **Pros:** Most security-focused option, SonarCloud integration, A-rated security
- **Cons:** Not recently updated, Webpack-based, React-only

#### sindresorhus/electron-boilerplate
- **GitHub:** https://github.com/sindresorhus/electron-boilerplate
- **Stars:** 1,600+
- **Pros:** Minimal and clean
- **Cons:** Very basic, no framework, limited features

#### diego3g/electron-typescript-react
- **GitHub:** https://github.com/diego3g/electron-typescript-react
- **Stars:** 1,400+
- **Framework:** React
- **Build Tool:** Webpack
- **TypeScript:** Yes
- **Testing:** Jest + ESLint
- **Pros:** TypeScript + React focused, includes testing
- **Cons:** Webpack-based, not recently updated

#### daltonmenezes/electron-app
- **GitHub:** https://github.com/daltonmenezes/electron-app
- **Stars:** 792
- **Framework:** React 19
- **Build Tool:** electron-vite
- **Packager:** electron-builder
- **TypeScript:** TypeScript 5
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Extras:** Biome linter, GitHub Actions releases, window routing, source code protection
- **Last Active:** December 2025 (v3.0.3)
- **Pros:** Most modern stack (React 19, Tailwind v4, shadcn/ui), excellent DX, automated releases, opinionated but flexible
- **Cons:** Smaller community, requires Node 22 + pnpm 10

#### electron-vite-monorepo
- **GitHub:** https://github.com/buqiyuan/electron-vite-monorepo
- **Stars:** 726
- **Framework:** Vue
- **Build Tool:** Vite
- **Structure:** Turborepo monorepo with pnpm
- **Pros:** Monorepo architecture, good for larger projects
- **Cons:** Vue-only, smaller community

---

## 3. Comparison Table

| Starter Kit | Stars | Framework | Build Tool | Packager | TypeScript | Auto-Update | Security Focus | HMR | Source Protection | Last Updated | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **electron-react-boilerplate** | 24.2k | React | Webpack | electron-builder | Yes | Yes | Medium | Fast Refresh | No | Active | Maintained |
| **angular-electron** | 5.7k | Angular | Webpack/CLI | electron-builder | Yes | - | Medium | Hot Reload | No | Mar 2026 | Maintained |
| **electron-vite** (tool) | 5.3k | Any | Vite | e-builder/Forge | Yes | Via packager | Medium | Full HMR | V8 Bytecode | Mar 2026 | Maintained |
| **electron-vite-vue** | 4.9k | Vue 3 | Vite | electron-builder | Yes | - | Low | Yes | No | Apr 2024 | Maintained |
| **Electron Forge** (tool) | 7.0k | Any | Vite/Webpack | Built-in makers | Yes | Via makers | Medium | Plugin-based | No | Jan 2026 | Official |
| **vite-electron-builder** | 3.0k | Any | Vite | electron-builder | Yes | Yes | High | Yes | No | Active | Maintained |
| **electron-vite-react** | 2.4k | React | Vite | electron-builder | Yes | Yes | Low | Yes | No | Mar 2026 | Maintained |
| **secure-electron-template** | 1.7k | React/Redux | Webpack | electron-builder | Yes | - | Very High | - | No | Jul 2022 | Stale |
| **daltonmenezes/electron-app** | 792 | React 19 | electron-vite | electron-builder | Yes | Yes | Medium | Yes | Yes | Dec 2025 | Maintained |
| **vite-solid-electron** | 48 | SolidJS | Vite | - | Yes | - | Low | Yes | No | Feb 2026 | Niche |

---

## 4. Detailed Analysis

### Build Tool Comparison: Vite vs Webpack in Electron

| Aspect | Vite | Webpack |
|--------|------|---------|
| **Dev Server Speed** | Near-instant (ESBuild pre-bundling) | Slower (full bundle on start) |
| **HMR Speed** | Sub-second | Seconds |
| **Configuration** | Minimal (convention-based) | Verbose (explicit config) |
| **Ecosystem Maturity** | Rapidly maturing | Fully mature |
| **Plugin Ecosystem** | Growing | Extensive |
| **Production Build** | Rollup-based (tree-shaking) | Comprehensive |
| **Learning Curve** | Lower | Higher |

**Verdict:** Vite is the clear winner for new projects in 2025-2026. Webpack-based starters are legacy choices maintained for backward compatibility.

### Packaging Comparison: electron-builder vs Electron Forge

| Aspect | electron-builder | Electron Forge |
|--------|-----------------|----------------|
| **Downloads/week** | ~1,450,000 | ~1,900 (core package) |
| **Format Support** | Extensive (NSIS, DMG, AppImage, snap, deb, rpm, MSI, etc.) | Good (via Makers: Squirrel, ZIP, DEB, RPM, DMG) |
| **Auto-update** | Built-in (electron-updater) | Via publishers |
| **Code Signing** | Built-in | Built-in |
| **Publish Targets** | GitHub, S3, DigitalOcean, generic | GitHub, S3, Snapcraft, others |
| **Configuration** | JSON/JS config | JS config |
| **Docker Cross-build** | Yes | Limited |
| **Maturity** | 11 years, very stable | 9 years, official backing |
| **Community Adoption** | Dominant | Growing (official recommendation) |

### Security Best Practices Comparison

| Feature | secure-electron-template | vite-electron-builder | electron-vite | daltonmenezes/electron-app |
|---------|-------------------------|----------------------|---------------|---------------------------|
| Context Isolation | Yes | Yes | Recommended | Yes |
| Node Integration Disabled | Yes | Yes | Default | Yes |
| Content Security Policy | Yes | Yes | User config | Yes |
| Preload Scripts | Yes | Yes (Context Bridge) | Yes | Yes (Context Bridge) |
| ASAR Integrity | No | No | Supported (v5.0) | No |
| V8 Bytecode Protection | No | No | Yes | Yes (via electron-vite) |
| Security Audit Tool | SonarCloud | No | No | No |
| All 17 Electron Recommendations | Yes | Partial | Partial | Partial |

---

## 5. Community Sentiment & Recommendations

### General Consensus (from GitHub discussions, blogs, and forums)

1. **electron-vite is the rising star** -- Its rapid adoption (241k weekly downloads, 11.4k dependent projects) reflects strong community preference for Vite-based development in Electron. The unified config file and framework-agnostic approach make it versatile.

2. **electron-react-boilerplate remains the "safe" choice** -- With 24k+ stars and years of community support, it is the most battle-tested option, but its Webpack foundation is increasingly seen as a drawback.

3. **Electron Forge is the official recommendation** but its Vite plugin being marked "experimental" creates hesitation. Many developers prefer electron-vite for Vite integration due to its maturity and deeper feature set.

4. **electron-builder dominates packaging** -- Despite Electron Forge being the official tool, electron-builder's 1.4M+ weekly downloads and extensive format support make it the de facto standard for production packaging.

5. **Security is often an afterthought** -- Most boilerplates implement basic security (context isolation, disabled node integration) but few implement all of Electron's 17 security recommendations. The secure-electron-template is the gold standard but is no longer actively maintained.

6. **Vite has won the build tool war** -- Virtually all new Electron starters in 2025-2026 use Vite. Webpack-based starters are maintained for existing projects but are not recommended for new ones.

### Common Pain Points Mentioned

- **Native module handling** remains tricky across all tools
- **Cross-platform builds** (especially ARM64 for macOS) require careful CI/CD configuration
- **Auto-update** implementation is consistently cited as one of the more difficult aspects
- **Monorepo structure** is increasingly preferred for separating main/preload/renderer concerns

---

## 6. Recommendation Matrix

### By Use Case

| Scenario | Recommended Starter | Why |
|----------|-------------------|-----|
| **New project, React, modern stack** | `daltonmenezes/electron-app` or `electron-vite` + React template | React 19, Tailwind v4, shadcn/ui, electron-vite, automated releases |
| **New project, Vue** | `electron-vite` + Vue template or `electron-vite-vue` | Best Vue + Electron integration, fast HMR |
| **New project, Svelte/Solid** | `electron-vite` scaffolding | Only major tool with official Svelte/Solid templates |
| **New project, Angular** | `angular-electron` | Only well-maintained Angular + Electron option |
| **Maximum security** | `vite-electron-builder` + security hardening | Security-first design, follows official guidelines |
| **Source code protection** | `electron-vite` with bytecode compilation | Only tool offering V8 bytecode compilation |
| **Enterprise / large team** | `Electron Forge` + Vite plugin | Official backing, full lifecycle, mature ecosystem |
| **Quick prototype** | `electron-vite` scaffolding (`npm create @quick-start/electron`) | Single command setup, minimal config |
| **Existing Webpack project** | `electron-react-boilerplate` | Mature, well-documented, large community |
| **Framework-agnostic** | `electron-vite` or `vite-electron-builder` | Support any frontend framework |

### The "Best Overall" Pick for 2025-2026

**electron-vite** (the build tool at https://github.com/alex8088/electron-vite) paired with **electron-builder** for packaging is the strongest combination for new projects:

- Fastest development experience (Vite-native)
- Framework-agnostic (React, Vue, Svelte, Solid, Vanilla)
- Source code protection (V8 bytecode)
- 5,250+ stars and 241k+ weekly npm downloads
- Active maintenance (v5.0.0, December 2025)
- Pairs with the most popular packager (electron-builder)
- Single config file (`electron.vite.config.js`)
- Out-of-the-box TypeScript support
- Full HMR for renderer + hot reload for main/preload

**Runner-up for React projects:** `daltonmenezes/electron-app` -- the most opinionated and modern all-in-one template with React 19, Tailwind v4, shadcn/ui, and automated GitHub releases.

**Official/Enterprise pick:** **Electron Forge** with its Vite plugin -- backed by the Electron team, but note the Vite plugin is still marked experimental.

---

## Quick Start Commands

```bash
# electron-vite (recommended - framework-agnostic)
npm create @quick-start/electron@latest

# Electron Forge with Vite + TypeScript
npx create-electron-app@latest my-app -- --template=vite-typescript

# electron-react-boilerplate
git clone https://github.com/electron-react-boilerplate/electron-react-boilerplate.git
cd electron-react-boilerplate && npm install && npm start

# daltonmenezes/electron-app (React 19 + Tailwind v4 + shadcn/ui)
npx degit daltonmenezes/electron-app/template my-app
cd my-app && pnpm install && pnpm dev

# vite-electron-builder (security-focused)
git clone https://github.com/cawa-93/vite-electron-builder.git
cd vite-electron-builder && npm run init && npm start
```

---

*Research conducted March 2026. Star counts and download figures are approximate and subject to change.*
