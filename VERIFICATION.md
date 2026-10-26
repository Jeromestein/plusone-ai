# PlusOne AI verification history

The latest project-copy checks are recorded first. Previous UI evidence belongs to the source checkout; generated screenshots and browser reports were not copied into this project. Later sections preserve historical reconstruction, package-manager migration, and opening-preview evidence; they do not describe the current content or imply that a new production build was run.

## Background music — October 26, 2026

- Copied the user-provided DAKOOKA MP3 to `public/audio/dakooka-anime-vibe-slow.mp3` without transcoding. SHA-256 matches the original; size is 5,559,231 bytes. Track metadata and its checksum are recorded alongside the asset.
- Added an icon-only header control: musical notes animate during playback, with a Play/Pause symbol. No visible Music on/off text or volume control. Reduced-motion styling disables the note animation.
- Codex in-app browser at `http://127.0.0.1:3001/`: a fresh reload showed no audio source, paused state, and position 0. Clicking Play decoded the MP3 (duration 153.947619 seconds), advanced playback, and changed the button to Pause. Pausing stopped the note animation and retained position 27.116315; resuming advanced to 34.297726. The audio element has looping enabled. Space on the focused control paused playback.
- Desktop, 390 px, and 320 px layouts were inspected. At 320 px the document remained 320 px wide and the music control and menu did not overlap. Temporary viewport overrides were reset.
- Captures: `output/playwright/music-mobile.png`, `music-header-mobile.png`, and `music-desktop.png`.
- `pnpm typecheck` and whitespace checks passed. No production build, commit, push, or deployment was performed. Physical-device audio output and a complete song-length loop were not tested.
- The original port 3000 server belongs to the earlier checkout. A preview for this directory was started with `pnpm exec next dev --hostname 127.0.0.1 --port 3001` and remains running. Its first restricted run failed to start the macOS file watcher; the approved local process started successfully.

## Independent project directory — October 26, 2026

- Created the separate `plusone-ai/` project from 1,158 tracked files in the existing preview. The source checkout was left unchanged.
- Copied no `.git`, `node_modules`, `.next`, screenshots, browser sessions, logs, or dependency caches. Started an empty `main` repository and recorded seven module commits; no existing commits or Git objects were imported.
- SHA-256 comparison verified the copied files. Only `README.md`, `REBRAND_CHECKLIST.md`, and this verification history were then updated for the new directory; application and visual resource bytes match the source snapshot.
- Installed dependencies from the pinned pnpm lockfile in the new directory. Type checking, all 927 asset checks, and whitespace checks passed there. No production build was run.
- No remote, push, deployment, or new development server was created. Browser checks were not repeated because no frontend code changed; prior UI evidence is recorded below.

## Modular Git baseline in the previous checkout — October 26, 2026

- Backed up the old repository metadata, tracked working diff, untracked source files, and a SHA-256 workspace inventory outside the checkout before initialization.
- Created a new independent `main` history for the current preview, organized into seven module commits. The earlier commit IDs in this document refer to the archived history.
- The new repository has no remote. No push or deployment was performed.
- Application source and visual resources were preserved; only repository documentation was updated for this operation. Provenance and existing third-party notices remain intact.
- `pnpm typecheck`, `pnpm assets:verify` (927 resources and 13 timelines), and whitespace checks passed. No production build was run. Browser checks were not repeated because this operation did not change the UI; the preceding preview checks are recorded below.

## PlusOne AI service chapters — October 26, 2026

The approved first-screen preview was committed as `54e72f5`. Subsequent service-content changes are uncommitted for review. The previous pnpm migration remains in the working tree; no push or deployment was performed.

### Content coverage

- Five service categories, with E-commerce between Apps and Marketing.
- Twelve revised chapters, 36 service offerings, six selectable concept studies, and a new footer.
- Public anchors explicitly map to the original 13 artwork handles. Scene order, camera data, shaders, and interaction algorithms remain in place. Chapter heights and editorial layouts have changed; old reference-geometry equality results do not apply to this revision.
- Shopify and TikTok are retained as service platforms. The original release announcements, search data, skill/app dialogs, video promotions, and external merchandise checkout are removed from the rendered site.
- One labeled Shop Pay Rive illustration is retained. Concept studies are identified as illustrations rather than client work; no customer results, platform certifications, or contact details are invented.
- TikTok channel wording was checked against [Shopify's setup guidance](https://help.shopify.com/en/manual/online-sales-channels/social-commerce/tiktok/setup); market/product eligibility and supported integrations are qualified in the service copy.

### Checks completed

- `pnpm typecheck` and `git diff --check`: passed. No production build was run for this change.
- Codex in-app browser: desktop and 390 × 844 mobile homepage, five-category menu, E-commerce chapter, TikTok concept selection, Shopify service copy, the footer and its chapter links, and the retained Shop Pay illustration. The general partnership action opened the full five-service overview. The Rive reported `ready` and was visibly rendered.
- `qa-plusone-content.js`: all 13 scenes at both 1280 × 720 and 390 × 844, no horizontal overflow; all six concept selectors switched content; mobile menu linked to E-commerce; reduced-motion styling disabled the concept animation; no external HTTP anchors remained in the rendered page. Zero runtime/console errors and zero HTTP error responses in this run.
- `qa-plusone-artwork.js`: hat hover and click opened the new concept dialog, the action pointed to `#ecommerce`, and no external checkout link remained. Globe hover/drag worked. The keyboard-accessible key popup loaded with state `picked-up` and closed normally. Zero runtime errors. Full key insertion/coin choreography was not repeated; its earlier evidence is historical.
- The first scene-check attempt stopped at the 50 px anchor scroll margin, before entering the next scene's measured bounds. The test was corrected to scroll inside the actual section boundary; the complete rerun passed.

Evidence: `output/playwright/qa-plusone-content.json`, `qa-plusone-artwork.json`, `plusone-content-ecommerce.png`, `plusone-content-mobile.png`, `plusone-five-services-mobile.png`, `plusone-shopify-service.png`, `plusone-storefront-concept.png`, and `plusone-key-popup.png`.

### Boundaries

Mobile checks use viewport emulation, not a physical device. Existing source artwork, embedded branding, font licensing, unused mirrored files, final contact flow, and old Editions URLs remain checklist items. The existing `pnpm dev` server at `http://127.0.0.1:3000` was reused and left running; it was not restarted.

## pnpm migration — October 26, 2026

- Pinned `pnpm@9.7.1` in `package.json` and replaced `package-lock.json` with `pnpm-lock.yaml` using `pnpm import`.
- Compared all 70 locked package versions and integrity hashes against the npm lockfile; all were preserved.
- `pnpm install --frozen-lockfile`: passed with a clean `node_modules` directory.
- `pnpm typecheck`: passed, including Next.js route type generation.
- `pnpm assets:verify`: passed for all 927 files totaling 465,039,957 bytes.
- No UI or application code was changed. Browser checks were not repeated, and no production build or deployment was performed during the initial migration check. The subsequent build check is recorded below.

## Production build and disk comparison — October 26, 2026

- `pnpm build`: passed on Node.js 20.20.2 and pnpm 9.7.1 in 7.66 seconds, including TypeScript checking and static page generation. `/editions/winter2026` and `/editions/winter2026/key` were prerendered; `/` remains dynamic.
- Compared the migrated installation with a temporary clean `npm ci --no-audit --no-fund` installation using npm 10.8.2 and the original tracked `package.json` and `package-lock.json`. The temporary installation and its cache were removed after measurement.

| Directory | Size reported by `du -sk` | Approximate decimal MB |
| --- | ---: | ---: |
| pnpm `node_modules` | 417,624 KiB | 427.6 |
| npm comparison `node_modules` | 438,244 KiB | 448.8 |
| `.next`, including existing development output and caches | 260,024 KiB | 266.3 |
| `public` | 456,128 KiB | 467.1 |

The pnpm dependency directory was approximately 21.1 MB (4.7%) smaller in this comparison. npm installed 40 packages and pnpm installed 38; the additional npm packages were the optional `@emnapi/runtime@1.11.3` and `@img/sharp-wasm32@0.35.5`. All common installed package versions matched. Package-manager caches and the shared pnpm store are excluded from the dependency-directory comparison. Directory sizes do not establish exclusive physical disk usage when filesystem blocks are shared. pnpm's main space-saving benefit is dependency reuse across projects; see the [pnpm explanation](https://pnpm.io/motivation).

This validates a local production build, not a Vercel deployment or a fresh browser interaction pass. No application code was changed.

## Implementation coverage

The native Next.js page now covers all 12 Edition chapters and 200 product entries, with 13 art scenes including the hero. It uses React components, Three.js and the npm Rive runtime. It does not execute the archived Remix application bundles or inject the original document as the application.

- Original responsive content, typography, product links and chapter layouts.
- All scene models, backgrounds, local preview videos, Theatre timelines and principal scroll transitions.
- 22 embedded Rive canvases, five app demonstrations, 20 skill dialogs, five video dialogs, complete product search and chapter navigation.
- Hat merchandise interaction, draggable globe, butterfly effects and a native key window with unlock/coin interaction.
- Touch artwork, reduced-motion behavior, keyboard dialogs, and recoverable artwork loading.

## Local verification

- `npm run typecheck`: passed, including Next.js route type generation.
- `npm run assets:verify`: passed for 927 files totaling 465,039,957 bytes. This includes 50 GLBs, 46 KTX2 textures, 13 Theatre timelines, one HDR environment, 27 Rive files, 61 MP4s and 41 WebMs.
- Both `/editions/winter2026` and `/editions/winter2026/key` return HTTP 200 with native components and Next.js scripts. Neither response includes archived `/oxygen-v2/` application scripts.
- This October 23 verification used npm and `package-lock.json`; the October 26 migration above supersedes that package-manager selection.
- No production build, deployment or push was performed during this verification.

## Opening, camera and key fidelity pass

Compared the published reference source and live opening captures with the native implementation. Updated the SVG geometry and dashed strokes, title/loading/sidebar timing, independent camera clock, camera orbit and mouse damping, animation clip mapping, original particle defaults, eight-level mipmap bloom and HDR screen blend. The camera begins 100 ms after the hero timeline is available; each asset has its own 400 ms reveal. Sidebar completion follows asset readiness without imposing a fixed minimum loading delay.

Rebuilt the key popup as native Three.js with a session-scoped local WebRTC canvas stream. Verified actual browser window positioning and alignment, gold prop pickup/drop, blacklight graffiti, ribbon particles, keyhole insertion, box opening, 150 modelled coins, and closing/resetting the main scene. No camera/microphone permission or external signaling service is used.

| Current check                | Result and evidence                                                                                                                                                                |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Opening and first transition | All opening phases, hero and scroll positions 100/450/850/1080; zero runtime errors or missing local HTTP resources. `qa-opening-fidelity.json` and `fidelity-opening-phase-*.png` |
| Layout preservation          | All 12 chapter top positions/heights still match the reference at 1280 × 720. `fidelity-geometry-comparison.json`                                                                  |
| Reduced motion and retry     | Opening completes immediately; deliberately aborted hero model shows fallback; retry restores the canvas without replaying the opening. `qa-opening-fidelity.json`                 |
| Stalled load and touch       | Held hero request reaches usable fallback, then recovers when released; coarse-pointer emulation displays mobile artwork without overflow. `qa-opening-recovery.json`              |
| All desktop scenes           | Re-ran hero and all 12 chapter scenes after camera/bloom changes; zero runtime/console errors, missing HTTP resources or horizontal overflow. `qa-full-desktop.json`               |
| Native key flow              | Aligned popup, inserted key, full box opening, 150 coins, then progress 0 / coins 0 / disconnected after close; zero runtime or popup console errors. `qa-key-fidelity.json`       |
| In-app visual check          | Desktop hero and Sidekick, mobile Sidekick and navigation; `fidelity-in-app-*.png`. Viewport override reset afterward.                                                             |

The automated checks use the required Playwright CLI wrapper and the existing user-owned local server. Screenshots and machine-readable evidence live in `output/playwright/` (Git-ignored).

## Earlier complete-page browser verification

The Codex in-app browser was used for desktop Retail and Operations artwork, chapter navigation, full product search, and the 390 × 844 mobile Sidekick page and navigation menu. Final screenshots are saved under `output/playwright/full-in-app-*.png`. The viewport override was reset after verification. A final in-app check exercised a Rive card, resized to the mobile layout, and opened/closed the menu; it recorded zero browser errors after the pointer lifecycle fix.

Supplemental automated checks use the required Playwright CLI wrapper and isolated browser contexts:

| Check                    | Coverage                                                                                                     | Evidence                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| Desktop, 1280 × 720      | Hero and all 12 chapter scenes; no horizontal overflow or missing HTTP resources                             | `qa-full-desktop.json`         |
| Mobile layout, 390 × 844 | All 13 scenes, search, skill dialog, Rive loading and horizontal layout                                      | `qa-full-mobile.json`          |
| Content                  | 200 entries, all 22 embedded Rive modules, skill and app dialogs, product search                             | `qa-full-content.json`         |
| Artwork interactions     | Hat hit target, quantity/subtotal, checkout URL and globe drag; key evidence superseded by the fidelity pass | `qa-artwork-interactions.json` |
| Touch and recovery       | Coarse-pointer emulation, all chapter artwork, reduced motion, deliberate model failure and successful retry | `qa-touch-and-recovery.json`   |
| Header contrast          | Operations chapter boundary and Developer artwork; dark text on light header, correct SVG title color        | `qa-header-themes.json`        |

Final desktop, mobile, content and artwork reports recorded zero runtime errors or missing HTTP resources.

At 1280 × 720, all 12 section top positions and heights match the live reference capture exactly. `full-geometry-comparison.json` records zero geometric delta. This checks layout geometry, not pixel equality. `full-http-check.json` records the native routes and script checks.

The merchandise test inspected the cart URL and quantity; no purchase was submitted. External Shopify account, checkout and documentation destinations were not exercised as backend transactions.

## Fidelity and validation boundaries

The reconstruction is not certified pixel-identical. Camera and particle algorithms now follow the reference, but random initialization, GPU/antialiasing differences, decode timing and WebRTC video compression can change individual frames. The popup implements the default key experience with original chapter shaders; its legacy scan-only URL mode and inactivity auto-close behavior remain unimplemented. Header menus and dialogs are native implementations.

Touch and reduced motion were tested in browser emulation, not on a physical phone. Production packaging, low-end GPU performance, Shopify backend behavior and cross-browser rendering were not verified. Local video resources were checked, while third-party YouTube playback remains dependent on its external service.

The existing user-owned development server at `http://127.0.0.1:3000` was reused and left running. The sibling Remix project was not modified. Earlier `native-*` reports describe the former hero-only milestone and are superseded by the `full-*` and `qa-full-*` evidence.


## PlusOne AI opening preview — 2026-10-26

This pass changes the header, hero, service introduction panel, loading mark, homepage metadata, and favicon. The original artwork, camera timing, drawing lines, and downstream Shopify chapters remain; see `REBRAND_CHECKLIST.md` for the remaining migration. Earlier search/edition-menu checks above describe the previous interface.

- `pnpm typecheck` and `git diff --check` passed. The initial type check encountered a stale generated route reference after removing the root redirect; starting the dev server regenerated it, and subsequent checks passed. No production build was run for this change.
- Codex in-app browser: checked the desktop homepage, 390 × 844 mobile homepage, service panel, mobile menu, direct Marketing selection, sticky close button, Escape dismissal, and restored trigger focus. Mobile document width was 390 px without horizontal overflow. Verified the retained first artwork transition and brand sidebar.
- Playwright CLI supplemental checks: observed the opening orbit advance from 4.240° to 7.721° during loading, then settle to `rotate(0 64 64)` with status `ready` and motion `idle`.
- Reduced-motion emulation: artwork status `ready`, opening `complete`, both marks idle at zero rotation.
- Recovery: dispatched a simulated `webglcontextlost` event; status became `fallback` and the retry button appeared. Clicking it restored `ready` and removed the notice. This verifies the recovery handler, not a physical GPU failure.
- The normal homepage exposes `https://plusoneai.net` as its canonical URL and `/brand/plusone-icon.svg` as its icon. The SVG returned HTTP 200; `/favicon.ico` redirects to that SVG.
- The retained downstream Rive demos emit existing missing-text-run warnings when visited. Their replacement is tracked in Phase 2. No all-chapter or production regression pass was performed in this iteration.

Screenshots are stored in `output/playwright/plusone-hero-desktop.png`, `plusone-hero-mobile.png`, `plusone-loading.png`, and `plusone-fallback.png`. The Codex-started `pnpm dev` server remains running at `http://127.0.0.1:3000` for review. No commit, push, or deployment was performed.

## Service chapter navigation — 2026-10-26

The sidebar and header now link to service chapters. The overview CTA retains its service dialog. Scroll selection follows the chapter's service group independently of the artwork renderer, with no service selected in the hero, process, partnership, or footer.

- Reused the existing `plusone-ai` development server at `http://127.0.0.1:3001`; no server restart or production build.
- `pnpm typecheck` and `git diff --check` passed.
- Codex in-app browser, desktop 1280 × 720: checked all five sidebar destinations, header clearance, normal-weight inactive entries, plus/underline selection, light-paper and dark-artwork colors, and a distinct keyboard focus outline. Scrolling through Connected workflows retained AI selection; Shopify content retained E-commerce selection. Process and footer cleared the selection. The overview dialog still opened and closed.
- Mobile viewport checks at 390 × 844 and 320 × 640: chapter menu fit without horizontal overflow. Selecting Websites closed the menu, restored document scrolling, and navigated below the header. Escape closed the menu and restored focus to its trigger. These are viewport emulations, not physical-device tests.
- No browser error-level logs were recorded in this preview. The artwork renderer, scene sequence, source assets, and audio behavior were not changed; no comprehensive artwork regression was performed.
- Screenshots: `output/playwright/navigation-desktop.png` and `output/playwright/navigation-mobile.png`. Verification was performed locally; production deployment has not been verified.
