# PlusOne AI

A Next.js company website for **AI & Automation, Websites, Apps, E-commerce, and Marketing**, with Renaissance artwork, scroll-driven Three.js scenes, and a custom animated PlusOne mark. The intended domain is `plusoneai.net`.

## Development

Use **pnpm 9.7.1**, pinned in `package.json`, with Node.js 20.9 or newer. Keep `pnpm-lock.yaml` as the dependency lockfile.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open http://127.0.0.1:3000/. The previous `/editions/winter2026` route remains available for compatibility. Reload the homepage without a hash at the top of the page to replay the opening. Prefer running the development server from your own terminal; reuse an existing server for checks.

For Vercel, use the Next.js preset, automatic install detection, and the default output directory. Remove old `npm ci` or `npm install` overrides. Deployment and domain configuration are separate from local preview work.

## Content and interactions

- Five service categories in the header, responsive menu, sidebar, and service panel.
- Twelve editorial chapters covering AI, automation, websites, apps, e-commerce, Shopify, operations, social commerce, B2B commerce, marketing, process, and partnership.
- Six interactive concept studies, explicitly labeled as illustrations rather than client projects. There are no fabricated clients or performance results.
- Shopify and TikTok are platforms within the e-commerce offering. One labeled Shop Pay platform illustration remains; the former Shopify release announcements and external merchandise checkout are removed.
- The retained hat interaction opens an illustrative storefront panel. Globe dragging, the key popup, camera motion, composition lines, and scene transitions remain.
- The PlusOne loading dot orbits the numeral and returns to its upper-right position when the artwork is ready. Reduced motion, fallback recovery, focus management, and Escape dismissal are supported.
- The header has an icon-only background-music player: animated notes and Play/Pause, with no volume slider. The local MP3 is loaded on demand, loops, and retains its position when paused; a reload starts with music off. Track details are in `public/audio/README.md`.
- Inquiry buttons currently open service information. A real email or booking destination has not been provided.

## Source map

| Location | Responsibility |
| --- | --- |
| `app/page.tsx` | Branded homepage |
| `lib/brand/content.ts` | Brand metadata and five service definitions |
| `lib/brand/chapters.ts` | Editorial copy and explicit section-to-artwork bindings |
| `components/brand/BrandChapters.tsx` | Chapter layout and footer |
| `components/brand/ServiceStudy.tsx` | Selectable illustrative journeys |
| `components/brand/ServicesDialog.tsx` | Service overview and chapter navigation |
| `components/brand/PlusOneMark.tsx` | Static and animated brand mark |
| `app/editions/winter2026/plusone-brand.css` | Header, hero, mark, and panel styling |
| `app/editions/winter2026/plusone-chapters.css` | Editorial chapter, study, and footer styling |
| `components/renaissance/RenaissanceExperience.tsx` | Canvas lifecycle, scrolling, themes, and fallback |
| `components/renaissance/InteractiveContent.tsx` | Artwork dialogs and key window |
| `lib/renaissance/create-stage.ts` | Scene loading, cameras, transitions, and pointer interactions |
| `lib/renaissance/create-key-stage.ts` | Key popup and scene alignment |
| `lib/renaissance/key-transport.ts` | Session-scoped local WebRTC canvas exchange |

Public section IDs and original artwork handles are separate. The renderer uses `data-artwork-scene` to find section bounds. Keep the original scene manifest order until the renderer's positional transitions and artwork interactions are redesigned.

## Artwork provenance and remaining work

The visual foundation was reconstructed from [Shopify Winter 2026](https://www.shopify.com/editions/winter2026). Its local mirror includes original fonts, models, textures, images, videos, and animation data. These are still reference assets; replacing them with original or appropriately licensed material and auditing embedded branding remain open checklist items. Keeping Shopify as a service does not establish permission to reuse its source artwork.

The app does not execute archived Remix bundles. Historical extraction scripts and earlier fidelity checks document the reconstruction; they are not the current content source. Do not regenerate chapter JSX from the old reference HTML: that would restore obsolete Shopify announcements. Unused mirrored resources have not yet been pruned.

See `REBRAND_CHECKLIST.md` for remaining work. Contact, final launch metadata, asset review, and deployment are unfinished.

## Verification

```sh
pnpm typecheck
pnpm assets:verify
```

Follow `AGENTS.md`; do not run a production build for this task. `VERIFICATION.md` distinguishes current checks from historical reconstruction evidence. The latest rebrand browser checks use `scripts/qa-plusone-content.js` and `scripts/qa-plusone-artwork.js` through the required Playwright CLI wrapper. Screenshots and reports belong in `output/playwright/` (Git-ignored).

## Repository history

This repository starts from the current PlusOne AI preview, organized into seven module commits: project configuration, visual resources, the scene engine, brand components, service pages, tooling, and documentation. These commits organize an existing working snapshot; they are not a chronological record of original asset creation. Resource provenance remains documented above and in the asset manifests.

This independent project lives in `plusone-ai/`. Source files were copied from the existing preview without its `.git`, dependencies, generated output, or caches. A new Git repository was initialized here from an empty history; no commits were cloned, imported, or cherry-picked. The previous `my-renaissance-next/` checkout remains unchanged. No remote is configured. Connect the intended PlusOne AI remote explicitly before publishing.
