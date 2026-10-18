<!--
Sync Impact Report
- Version change: 2.0.0 → 2.1.0 (MINOR: new principle added; existing principles refined, none
  removed or redefined)
- Modified principles:
  - III. Tested Game Logic, Playtested Presentation — "game logic" now means the domain and
    application layers defined in Principle VII; tests must run without the game page
  - V. Simplicity Under Time Pressure — clarifies that the Principle VII layering is a required
    structure, not an optional abstraction
- Added principles:
  - VII. Clean Architecture (new): domain / application / adapters / infrastructure layers,
    inward-only dependencies, single composition root
- Modified sections:
  - Technology & Platform Constraints — new "Code organisation" item; Testing item refers to the
    domain and application layers
  - Development Workflow & Quality Gates — new gate 7 (dependency rule respected)
- Removed sections: none
- Templates reviewed (read at runtime, not modified by this command):
  - .specify/templates/plan-template.md (Constitution Check gate) ✅ compatible — plans now
    include Principle VII in their Constitution Check
  - .specify/templates/spec-template.md ✅ compatible
  - .specify/templates/tasks-template.md ✅ compatible
- Downstream artifacts affected:
  - specs/001-isometric-map-system, specs/002-main-menu — ⚠ existing code predates Principle VII:
    js/core/game-map.js depends on asset-path code (autotile/catalog art) and js/main.js holds
    application logic (pause/resume, attract). To be brought into compliance by a refactor
    feature (see Next Actions); not changed by this amendment.
- Follow-up TODOs: none
-->

# MyCityWorking Constitution

## Core Principles

### I. Always-Playable Build

- The main line of development MUST always launch into a playable state in a current desktop
  browser.
- A change that breaks startup or the core loop MUST be fixed or reverted before any other work
  continues.
- Unfinished features MUST be hidden behind a flag or kept off the main line rather than
  shipped half-working.

**Rationale**: In a hackathon, the demo can happen at any moment. A playable build at every
point guarantees there is always something to show judges.

### II. Core Loop First (MVP Scope)

- Every feature spec MUST state which part of the core gameplay loop it serves; features that
  serve none are deferred.
- The smallest playable version of the core loop MUST be complete before secondary systems
  (menus, polish, extra content, meta-progression) are started.
- When time runs short, scope MUST be cut before quality: drop features, not stability.
- Each user story MUST be independently playable and demoable on its own.

**Rationale**: A small game that is fun and finished beats a large game that is unfinished.

### III. Tested Game Logic, Playtested Presentation

- Game rules and simulation logic (economy, city/work systems, scoring, routing, state
  transitions, save data, screen flow) MUST live in the **domain** and **application** layers
  defined in Principle VII, with no dependency on rendering, the DOM, canvas, asset files, or
  the game framework.
- Domain and application code MUST have automated unit tests that run from a test page in the
  repository with no install step and without loading the game page itself; those tests MUST
  pass before a change merges.
- Rendering, input, audio, and UI are verified by a manual playtest; each feature MUST ship
  with a short playtest checklist (steps + expected result).

**Rationale**: Separating logic from presentation keeps the rules testable and fast to
change, while avoiding expensive tests for visuals that change constantly during a jam.

### IV. Performance Budget

- The game MUST hold a steady 60 FPS on a mid-range laptop in a current Chromium or Firefox
  browser during normal play.
- Initial load to first interactive screen MUST take no more than 5 seconds on a typical
  broadband connection; total shipped assets SHOULD stay under 20 MB.
- Per-frame code MUST NOT allocate unboundedly or perform blocking work; heavy work is
  batched, cached, or spread across frames.
- Any feature that measurably breaks the budget MUST be optimized or cut before merge.

**Rationale**: Stutter and long loads ruin the first impression a judge or player gets.

### V. Simplicity Under Time Pressure

- Choose the simplest approach that works; abstractions, plugins, and dependencies MUST be
  justified by a present need, not a hypothetical one (YAGNI). The four layers of Principle VII
  are a required structure, not an optional abstraction; within a layer, keep code as simple as
  possible (no extra interfaces, base classes, or indirection without a present need).
- New third-party libraries MUST be noted in the feature plan with the reason they are needed,
  and MUST satisfy Principle VI.
- Any deviation from these principles MUST be recorded in the plan's Complexity Tracking
  table with justification.

**Rationale**: Every extra layer costs hours that a hackathon team does not have.

### VI. Browser-Only, Zero-Install Stack

- The game MUST be written only in HTML, CSS, and JavaScript. Languages that need compiling
  or transpiling (TypeScript, JSX, Sass, etc.) MUST NOT be used.
- The game MUST run entirely in the browser (front end only). It MUST NOT need a backend,
  server-side code, database server, or online service to be played.
- Playing, developing, and testing the game MUST NOT require installing anything or running
  any setup: no package manager install, no build or bundling step, no local tool chain. The
  files in the repository are the files the browser runs.
- Any HTML, CSS, or JavaScript library or framework MAY be used if it runs fully in the
  browser and is loaded either from a file committed to the repository or from a public CDN
  with a pinned exact version. Committing the library file is preferred so the game works
  offline.
- The game MUST work when served by any plain static file host. It SHOULD also start when
  `index.html` is opened directly from disk; features that cannot work that way MUST be noted
  in the feature plan.

**Rationale**: Judges and teammates must be able to play the game by opening a link or a
file, with no environment to set up and nothing that can fail to install.

### VII. Clean Architecture

Code MUST be organised in four layers, each in its own folder under `js/`:

| Layer | Contains | May depend on |
|---|---|---|
| **domain** | Entities and rules: map, tiles, terrain, collision, coordinates, map objects | nothing outside the domain |
| **application** | Use cases and game flow: screen flow, pause/resume, camera, attract mode, future routing/dispatch | domain |
| **adapters** | Translation between the game and the screen/player: rendering, art mapping (autotile, asset paths for terrain and objects), input, menu UI, rain drawing | application, domain |
| **infrastructure** | Browser and file specifics: image loading, map registry, map definition files | application, domain |

- **Dependency rule**: dependencies MUST point inward only (adapters / infrastructure →
  application → domain). Domain code MUST NOT reference the browser (`window` other than the
  shared namespace, `document`, canvas, images, timers), asset file paths, or any outer layer.
  Application code MUST NOT reference the DOM, canvas or asset paths.
- When an inner layer needs something from outside (e.g. "what image is this tile?"), the outer
  layer asks the inner layer for plain data and does the translation itself; inner layers never
  call outward.
- `js/main.js` MUST be the single composition root: the only place that creates objects from
  several layers and wires them together. It MUST NOT contain game rules or flow logic.
- Domain and application code MUST be unit-testable from the test page without loading
  `index.html`, the renderer, or any image.
- Each feature plan MUST state which layer every new or changed file belongs to.

**Rationale**: Clear layers keep game rules independent of how they are drawn or controlled, so
rules can be tested in isolation, art and UI can change without touching the rules, and team
members can work in different layers without conflicts.

## Technology & Platform Constraints

- **Platform**: Web browser (HTML5), current desktop Chromium and Firefox. The game MUST be
  playable from a URL with no install.
- **Languages**: HTML, CSS, and JavaScript (ES2020 or later, as supported natively by the
  target browsers). JSDoc comments MAY be used for type hints; they MUST NOT require a build.
- **Rendering**: Canvas/WebGL directly or a browser-only 2D game library (e.g. Phaser or
  PixiJS loaded by `<script>` tag); the choice is made once in the first feature plan and not
  changed without an amendment-level reason.
- **Code organisation**: `js/domain/`, `js/application/`, `js/adapters/`, `js/infrastructure/`
  and the composition root `js/main.js` (Principle VII). Script tags in `index.html` load the
  layers inside-out (domain first).
- **Testing**: Unit tests for the domain and application layers run from a test HTML page in
  the browser, using a browser-only test library loaded the same way as other libraries, or a
  minimal in-repo test harness.
- **Persistence**: Browser storage only (e.g. localStorage). No server-side saves.
- **Deploy**: The repository folder itself is deployable as-is to any static host.
- **Input**: Mouse and keyboard on desktop MUST be supported; touch support is optional.

## Development Workflow & Quality Gates

Every change MUST pass these gates before it is merged into the main line:

1. The game loads in the browser with no errors in the developer console.
2. All game-logic unit tests pass on the test page.
3. The feature's playtest checklist has been run and passes.
4. The game still starts and the core loop is playable end to end (Principle I).
5. No obvious frame-rate regression is observed during the playtest (Principle IV).
6. No install, build step, backend, or non-browser language has been introduced (Principle VI).
7. Every changed file sits in the right layer and respects the inward-only dependency rule;
   no game rules or flow logic were added to `js/main.js` (Principle VII).

Spec Kit flow: `/speckit-specify` → `/speckit-plan` (must pass the Constitution Check) →
`/speckit-tasks` → `/speckit-implement`. Plans MUST reference the principles they rely on.

## Governance

- This constitution supersedes other project practices. Where a spec, plan, or task conflicts
  with it, the constitution wins until it is amended.
- **Amendments**: Proposed via `/speckit-constitution`, agreed by the team, and recorded with
  an updated version and Last Amended date.
- **Versioning**: Semantic versioning. MAJOR for removing or redefining a principle, MINOR for
  adding a principle or section or materially expanding guidance, PATCH for clarifications.
- **Compliance**: Every plan's Constitution Check and every merge review MUST confirm the
  gates above; justified exceptions are recorded in Complexity Tracking.

**Version**: 2.1.0 | **Ratified**: 2026-10-14 | **Last Amended**: 2026-10-17
