# ResumeIt — Frontend

Next.js (App Router) + TypeScript + Tailwind CSS frontend for ResumeIt.

Cross-project docs (product, design, journal) live at the repo root in [`../docs`](../docs/README.md). This README covers only what's needed to run and work on this app. See [`../resumeit-be/README.md`](../resumeit-be/README.md) for the backend API this talks to.

## Versions actually scaffolded

Scaffolded with `create-next-app@16.3.0` — check these before assuming a different config mechanism than what's below:

- **Next.js 16.3.0** (App Router, Turbopack, no `src/` directory).
- **React 19.2.8**.
- **Tailwind CSS v4** (`^4`) — configured **CSS-first**, via `@theme` in [`app/globals.css`](app/globals.css), *not* `tailwind.config.ts`. Tailwind v3's JS config file doesn't exist in this project; don't add one — extend `@theme` instead.
- TypeScript `^5`, ESLint `^9` (flat config, `eslint.config.mjs`).

## Setup

1. `npm install`
2. Create `.env.local` (already present in this repo for local dev, not committed) with:

   ```
   NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
   ```

   Point this at wherever `resumeit-be` is actually running. Must be `NEXT_PUBLIC_`-prefixed since it's read client-side (see `lib/api.ts`).
3. Make sure `resumeit-be` is running (see its own README — on Windows in particular, its Mongo DNS workaround lives in that service's code, not here, so nothing extra to do on the frontend side for that).
4. `npm run dev` — starts the dev server at `http://localhost:3000`.

## Scripts

| Script | Does |
|---|---|
| `npm run dev` | Start the dev server (Turbopack). |
| `npm run build` | Production build (also runs the TypeScript check). |
| `npm start` | Run the production build (`npm run build` first). |
| `npm run lint` | ESLint. |

## Project structure

```
app/
  layout.tsx            Root layout: loads IBM Plex Serif/Sans/Mono via next/font/google,
                         sets base html/body classes (canvas background, primary text color)
  icon.png                App icon / favicon (Phase 10b) — the branded dark-bg logo mark via
                         Next's file-based icon convention, replacing the stock default favicon
  globals.css            Tailwind v4 entry point + @theme design tokens (colors, radius scale)
                         + custom `label-md`/`label-sm` utilities (uppercase, tracked mono labels)
  page.tsx               `/` — landing page: logo, wordmark, tagline, Login/Sign up links
  login/page.tsx          `/login` — email+password form -> POST /auth/login -> store JWT -> /dashboard
  signup/page.tsx         `/signup` — email+password form -> POST /auth/register -> generic message -> prompt to log in
  admin/
    page.tsx               `/admin` (Phase 9) — a separate top-level surface, not a dashboard tab.
                           Client-side guard: no token or role !== "admin" (from GET /auth/me) ->
                           redirect /dashboard (UX guard only — requireAdmin server-side is the real
                           boundary). Template catalog: list with status badges, create/edit via
                           TemplateForm, Retire-with-confirm/Reactivate.
    TemplateForm.tsx        Shared create/edit form (name, optional description, font-mono latex
                           textarea styled identically to SourcePane.tsx's)
  dashboard/
    page.tsx               `/dashboard` — protected: token guard, owns collection/tree state and
                           mutation handlers (create/rename/delete/add-child), refetches the tree
                           after every mutation rather than reassembling it client-side; passes the
                           current user's role down to Sidebar for the admin-link check (Phase 9)
    Sidebar.tsx            Collection list + "+ New Collection", account footer/logout, an "Admin"
                           link (Phase 9) rendered only when userRole === "admin"
    ResumeTree.tsx          Canvas: collection title, orientation toggle, empty states,
                           "+ New Root Node" with a Blank/From-Template/Upload-Resume toggle
                           (Phase 9/10a) — From Template and Upload Resume both fetch/seed via the
                           same template list; Upload Resume also drives the intake extract→merge
                           flow (Phase 10a)
    TreeNode.tsx            Recursive node card: rename/add-child/delete, collapse/expand with
                           a "+N hidden" indicator, orientation-reversible flexbox connector lines
                           (extended, not replaced, for Phase 10b's visual polish); clicking a
                           node's title/card opens its editor (Phase 6). A real "Tailor with JD"
                           button opens AiEditDrawer directly from the dashboard without navigating
                           away (Phase 10b); "Preview" links to the real editor; "Diff" is a
                           genuinely-disabled placeholder (no backend diff endpoint exists yet); an
                           ATS-score gold badge renders only when `node.atsScore` is a real number
                           (no backend ever sets this field yet — nothing fabricated client-side)
    UploadResumeForm.tsx     File/paste-text sub-toggle, extracted-data preview, template picker,
                           merge preview, and node creation for the intake flow (Phase 10a)
    nodes/[nodeId]/
      page.tsx               `/dashboard/nodes/[nodeId]` — the LaTeX editor: owns source/save/
                             compile state, a mountedRef guard (see the Strict Mode note below)
      TopBar.tsx              Breadcrumb, Save, Compile (status dot), "AI Edit" entry point
      SourcePane.tsx          A real, editable font-mono textarea (transparent text, visible caret)
                             with a scroll-synced syntax-tint overlay behind it (LaTeX commands/
                             comments colored via a small regex tokenizer, no CodeMirror/Monaco —
                             Phase 10b) plus a line-number gutter, plus a failure panel
                             distinguishing a genuine compile error from a disallowed-construct
                             rejection from a timeout
      PreviewPane.tsx         Compiled PDF via a real blob: object URL (revoked on replacement),
                             wrapped in a warm off-white "paper" card with a soft shadow (Phase
                             10b) — the PDF itself is unchanged, only its container is restyled;
                             a real Download-PDF link sits below it (no fake zoom/page toolbar —
                             the browser's native PDF viewer already has one)
      AiEditDrawer.tsx        All three Model Access tiers are real: Free (rule-based, JD mode only,
                             Phase 7) plus Platform Key / Your API Key (Phase 8, both modes) — see
                             the Phase 8 section below. The JD/instruction textarea and the
                             mode-toggle/Model Access buttons are genuinely `disabled` while
                             `tailorPhase === "loading"`, for every tier that shares that state
                             machine (see the Phase 7 note below on why this matters).
      TailorPreview.tsx       Rule-based (`TailorResult`) preview: per-block reorder diff (moved
                             items tinted), matched/missing keyword chips (presence/absence only,
                             never a score), Save as New Version / Overwrite This Version
      AiEditPreview.tsx       Generative (`AiEditResult`) preview — sibling to TailorPreview.tsx, not
                             a replacement: the model's plain-English summary plus a real
                             line-level diff view of the full LaTeX (added/removed/unchanged lines,
                             via `lib/diff.ts` — Phase 10b closed the earlier gap where this showed
                             a plain, un-highlighted Before/After), then the same Save as New
                             Version / Overwrite buttons
components/
  ui/                     Shared component layer (Phase 10b) — Button, SegmentedToggle, TextField,
                         Card, Badge. Every screen in the app now goes through these instead of
                         hand-rolled Tailwind per file; see the Design tokens section below for
                         how their variants map to DESIGN.md's named patterns (e.g.
                         `SegmentedToggle`'s `variant: "neutral" | "mode"` is a direct
                         implementation of DESIGN.md's "Neutral selection toggles" vs.
                         "Mode/segmented toggles" distinction).
lib/
  api.ts                  API client: NEXT_PUBLIC_API_URL base, typed register/login/me (me now
                         includes role) plus collection/tree CRUD (createCollection, listCollections,
                         getCollectionTree, createNode — now takes an optional templateId or latex,
                         getNode, updateNode, deleteNode, compileNode, tailorNode), AI Edit
                         (getAiStatus, saveApiKey, deleteApiKey, aiEditNode), Templates (Phase 9:
                         createTemplate, listAllTemplates, getTemplate, updateTemplate,
                         retireTemplate, reactivateTemplate for admins; listTemplates for the
                         active-only user-facing list), Intake (Phase 10a: parseIntakeFile,
                         parseIntakeText, mergeIntake), ApiError/CompileError with the backend's
                         own `message` surfaced on failure. `ResumeTreeNode` carries an optional
                         `atsScore?: number` (Phase 10b, additive only — see TreeNode.tsx above).
  diff.ts                 Hand-rolled LCS line-diff (Phase 10b, no dependency) — `diffLines(before,
                         after)` plus the shared tint className constants used by both
                         AiEditPreview.tsx and TailorPreview.tsx's BlockDiff, so the two diff
                         views stay visually consistent from one source of truth.
  auth.ts                 Token storage helper (get/set/clear) — localStorage is an accepted
                         tradeoff (readable by any script on the page) rather than an ideal solution,
                         not XSS-hardened
public/
  logo-transparent.png   Brand logo (copied from ../docs/assets/brand/, then trimmed — the original
                         was a 500x500 canvas with the real ~397x130 artwork centered in ~70%
                         transparent padding, which is why every square CSS box made it look tiny
                         no matter the size) — rendered in the Sidebar, TopBar, and login/signup
                         cards as of Phase 10b (previously only on the landing page); every in-app
                         surface it sits on is dark, so the transparent asset works everywhere
                         except the favicon (see `app/icon.png` above). Every usage passes
                         `unoptimized` to next/image — Next's `/_next/image` optimizer's WebP
                         re-encoding path was found to genuinely square this specific asset (a real
                         Next.js bug, confirmed by decoding the actual response bytes with `sharp`,
                         not a rendering fluke), while its PNG passthrough path didn't; unoptimized
                         bypasses the optimizer entirely for this small, already-correctly-sized
                         asset rather than working around the bug. See ../docs/JOURNAL.md, 2026-08-13.
```

## Design tokens

Colors, type, and shape all come from [`../docs/DESIGN.md`](../docs/DESIGN.md) ("Antiquarian Logic" system), reproduced as Tailwind v4 `@theme` tokens in `app/globals.css`:

- **Colors** keep their full DESIGN.md token name as the Tailwind key (e.g. `--color-bg-canvas`, `--color-accent-strong`) rather than being shortened — a couple of short names (`sm`, bare `md`/DEFAULT-equivalent radius) would otherwise silently collide with Tailwind's own built-in scale at different pixel values. Use them as normal Tailwind utilities: `bg-bg-canvas`, `text-text-primary`, `border-border-subtle`, `bg-accent-strong`, etc.
- **Radius scale** is similarly namespaced (`rounded-radius-sm` / `-radius-default` / `-radius-md` / `-radius-lg` / `-radius-xl`) for the same collision-avoidance reason — see the comment at the top of `globals.css`.
- **Fonts** (`font-serif` / `font-sans` / `font-mono`) *do* override Tailwind's own default font-family keys on purpose — that's how the brand type system becomes the project default. IBM Plex Serif for headings/display, IBM Plex Sans for body/UI, IBM Plex Mono for labels/metadata.
- Mono labels render uppercase + letter-spaced via the custom `label-md` / `label-sm` utility classes (Tailwind v4 `@utility`), matching DESIGN.md's `type-label-md`/`type-label-sm`.
- Light theme isn't defined yet — DESIGN.md itself marks it `TBD`, so this app is dark-only for now (including Phase 10b's "paper" PDF-preview card, which is a warm off-white *element* inside an otherwise-dark UI, not a step toward an actual light theme).
- **`--color-accent-tailor: #7FB69E`** (Phase 10b) — a green not in the original shared token spec, added specifically for the dashboard tree's "Tailor with JD" button, kept distinct from `--color-accent-ai` since the two represent different actions (quick keyword-reorder from the tree vs. the full AI Edit drawer).

## Auth flow (Phase 4)

- **Register** (`/signup`) — the backend *always* returns `201` with an identical generic message whether the email was new or already registered (deliberate anti-enumeration design, see `resumeit-be`'s `auth.controller.ts` and `../docs/PRODUCT.md`). The frontend shows that message verbatim and prompts the user to log in — no auto-login, no branching on "new" vs. "existing" account.
- **Login** (`/login`) — on success, stores the returned JWT and redirects to `/dashboard`. On failure, shows the backend's own generic `"Invalid email or password"` message as-is (also anti-enumeration — don't replace it with anything more specific).
- **Token storage** — `localStorage`, via `lib/auth.ts`. This is an accepted tradeoff for this phase (readable by any script on the page, i.e. not XSS-hardened) rather than an ideal solution — see that file's comments.
- **Dashboard guard** (`/dashboard`) — purely client-side: no token in storage -> redirect to `/login`; token present -> `GET /auth/me` to confirm it's still valid and fetch the current user. There's no server-side/middleware-level protection on this route, so it's a UX guard, not a security boundary — the backend's own `requireAuth` middleware is what actually protects data.

## Dashboard / resume tree (Phase 5)

- The sidebar and tree canvas are both visible at once — no separate page navigation between "pick a collection" and "view its tree" (matching the Stitch mockup).
- The tree connectors are a real flexbox layout (a fixed-length "stem" plus an auto-sized "bar"), not a rotated image — the orientation toggle actually swaps `flex-col`/`flex-row` per node, genuinely re-laying out the tree rather than applying a cosmetic transform.
- "Edit" on a node means renaming its title (`PATCH .../nodes/:id`) — full LaTeX content editing is Phase 6's split-view editor, not built here.
- The ATS-score badge and "Tailor with JD" button visible in the Stitch mockup were deliberately omitted at this phase (neither had real backend data yet — no ATS scoring, no JD Editor). **Tailor with JD is real as of Phase 10b** (opens `AiEditDrawer` directly from the dashboard); the **ATS-score badge is still UI-ready but unwired** — the frontend type has the field and `TreeNode.tsx` renders it whenever present, but no backend endpoint sets it yet, so it correctly never appears today.
- A collection can have more than one root node — each renders as its own independent tree, not merged under a fake shared parent.

## LaTeX editor (Phase 6)

- `/dashboard/nodes/[nodeId]` fetches the node directly via the backend's `GET /resume/nodes/:nodeId` (added this phase) — works on a page refresh or a pasted link, not just client-side navigation from the dashboard tree.
- Compile is explicit (a Save then a Compile click) — no auto-compile on load, and the preview stays a placeholder until the user compiles at least once.
- Three distinct compile failure states, each with different copy: a genuine LaTeX syntax error (422, Tectonic's own log), a disallowed-construct rejection (400 — a real security boundary from Phase 3's deny list, not a broken compile), and a timeout (504). Don't collapse these into one generic error message — a resume author needs to know which one happened.
- **Known dev-mode gotcha, fixed but worth knowing about**: the editor's `mountedRef` guard (prevents state updates after unmount, e.g. mid-compile navigation) must be reset to `true` at the *start* of its mount effect, not only set `false` in the cleanup — otherwise React Strict Mode's dev-only mount→unmount→remount cycle leaves it permanently `false` after the first page load, silently no-opping every future compile's success/error handling. See `../docs/JOURNAL.md` (2026-08-12) for the full diagnosis. If a "successful" network response ever seems to do nothing in dev mode, check this pattern first.
- The AI Edit drawer's Job Description mode is real end to end, all three Model Access tiers included — see Phase 8 below for Platform Key / Your API Key and Free Edit mode.

## JD Editor free tier (Phase 7)

- `POST /resume/nodes/:nodeId/tailor` reorders `\item` entries within `\itemize` blocks by whole-word job-description keyword match count. It never rewrites wording and never computes a match score — `TailorPreview.tsx` shows matched/missing keywords as presence/absence lists only, on purpose (see `../docs/PRODUCT.md`).
- Preview-only: the drawer shows the reorder diff and keyword lists, then the user chooses **Save as New Version** (branches via the existing `createNode`) or **Overwrite This Version** (via the existing `updateNode`) — there's no separate persistence endpoint.
- **The JD textarea and the mode-toggle buttons are genuinely `disabled` while `tailorPhase === "loading"`, not just visually dimmed.** This isn't decorative: without it, editing the job description text while a tailor request is in flight produces a preview computed from the stale, already-submitted text once the response resolves, with no indication to the user that it no longer matches what's in the box. This was a real bug found during Phase 7 review — and notably, a workflow resume (after hitting the org's usage-credit limit mid-run) silently dropped this exact finding from its final aggregated output on the second resume attempt, even though the first attempt's review had genuinely found it. Caught only by reading the raw workflow journal directly instead of trusting its "clean" summary — see `../docs/JOURNAL.md` (2026-08-13) for the full diagnosis of why the resume mechanics dropped it.
- Only "Free (rule-based)" was real in Model Access this phase — "Platform Key" and "Your API Key" kept a genuine `disabled` attribute, pointing at Phase 8. Both are real as of Phase 8, below.

## AI Edit — generative tiers (Phase 8)

- **Platform Key** and **Your API Key** are both real now, for **both** modes — Job Description (alongside the existing free tier) and Free Edit (which has no rule-based option at all, so it needs one of these two to do anything). Wiring:
  - `GET /ai/status` is fetched once per drawer open (non-blocking — a failed fetch degrades Platform Key to "unavailable" and leaves the rest of the drawer, including the free tier, working normally).
  - **Platform Key** is selectable only when `status.platformAvailable`; while selected it shows a small usage line (`12 / 20 used this month — resets Sep 12`) derived from `status.usage`. When unavailable, the button stays genuinely `disabled` with honest copy ("Not configured by the platform yet") — not a placeholder claiming the feature is unbuilt, since it now is.
  - **Your API Key** is always selectable — nothing server-side gates *choosing* it, only using it without a saved key does (a normal `400` from the edit call itself). Selecting it with no key saved shows an inline key-entry form (`PUT /ai/api-key`); once saved it shows `Key saved: ••••••<last four>` with a **Remove** link (`DELETE /ai/api-key`) that reverts to the form.
  - `POST /resume/nodes/:nodeId/ai-edit` is the generative call — preview-only, same as `tailorNode`, never persisting on its own. It returns `{ latex, summary }`, a deliberately different shape from `tailorNode`'s `TailorResult`, rendered by the new `AiEditPreview.tsx` (model's plain-English summary + a plain read-only Before/After of the LaTeX) rather than `TailorPreview.tsx`. Both preview components end in the same **Save as New Version** / **Overwrite This Version** choice, calling the same `createNode`/`updateNode`.
  - Both new tiers reuse the *same* `tailorPhase` state machine the free tier already had, rather than a second one — and the textarea / mode-toggle / Model Access buttons stay genuinely `disabled` while `tailorPhase === "loading"` for every tier, including "Free (rule-based)" itself, which was missing that check before this phase.
- **Verified end to end with a real, working Gemini key**: drove a real browser through every UI state — status fetch, Platform Key's real usage counter, the own-key pre-flight guard (confirmed via request interception that it sends zero network calls), save/masked-display/remove, and Free Edit correctly barring the rule-based option. Getting a working key took two rounds of Google-side troubleshooting (an account/project access restriction, then Google's own model availability changing twice — see `../resumeit-be/README.md`'s Gemini-model note and `../docs/JOURNAL.md`, 2026-08-13) — none of it a code defect here. Once a key genuinely worked, a real Platform Key request returned a genuine `200` with model-generated LaTeX, the quota counter incremented correctly for that successful call, and the result was saved and compiled through the real Tectonic pipeline to a genuine PDF. The earlier (denied-key) testing pass was still useful in its own right: it confirmed the loading-disabled state and the graceful-error UI against a real in-flight request and a real failure, and confirmed a failed attempt does *not* consume quota — both proven against real behavior, not a simulation.

## RBAC + Template admin panel (Phase 9)

- `role` (`"customer" | "admin"`) comes from `GET /auth/me` — the same field the backend's `requireAdmin` middleware enforces server-side. The frontend's role checks (`Sidebar.tsx`'s Admin link, `admin/page.tsx`'s guard) are UX convenience only, same non-security-boundary caveat as the existing dashboard token guard — the real enforcement is always server-side.
- `/admin` is a genuinely separate top-level route, not a dashboard tab, since it's a different surface for a different audience.
- Templates are admin-authored LaTeX skeletons, managed at `/admin` (create/edit/retire/reactivate — retire is reversible, never a hard delete) and consumed by any user via the "+ New Root Node" flow's Blank/From-Template toggle. Picking a template seeds the new node's `latex` server-side; there's no preview/diff UI for this yet, by design (see PRODUCT.md/TASKS.md for what's deferred to Phase 10 alongside the full PDF/OCR intake pipeline).
- There is no UI anywhere for a user to become an admin — that's an intentional gap, not a missing feature (see `../resumeit-be/README.md`'s note on this).

## Resume intake — upload → extract → merge (Phase 10a)

- A third root-node mode, **Upload Resume**, sits alongside Blank and From Template in `AddRootNodeForm` (in `ResumeTree.tsx`). `UploadResumeForm.tsx` owns a File/Paste-Text sub-toggle, calls `POST /intake/parse` (multipart file, or `{text}`) to get back a structured `ExtractedResumeData` (`name`/`contact`/`summary`/`sections`, each nullable — the backend is instructed to never fabricate a field it can't find, and the UI shows an explicit "No content could be extracted…" message rather than an ambiguous blank card when everything comes back empty).
- The extracted preview is followed by the same template picker used by "From Template." Picking one calls `POST /intake/merge` (extracted data + templateId) to get back real merged LaTeX, which is run through the backend's `findDisallowedConstruct` deny list before ever reaching the client — the same defense-in-depth rule that gates every other path that can produce compilable LaTeX.
- Node creation reuses the existing `createNode(token, selectedId, { title, latex })` exactly as-is — no new persistence model or endpoint was needed for this step.
- Switching root-node tabs or clicking Cancel while an extract/merge/create request is in flight is blocked (an `uploadBusy` flag reported up via `onBusyChange`) rather than silently discarding the in-progress work — a real bug found and fixed during this phase's review.

## Frontend redesign — shared components + mockup fidelity (Phase 10b)

Built from two Stitch mockups the user pointed at directly (local Downloads folders, not re-uploaded) — one for the dashboard/version-tree screen, one for the LaTeX editor + AI-edit-drawer screen. Both shared one design-token spec already faithfully implemented in this app's `globals.css`, so the actual gap was visual structure, logo placement, and a missing shared component layer, not colors/fonts.

- **Shared components** (`components/ui/`) — see the Project structure section above. Formalizes patterns DESIGN.md already named (the two toggle "active" styles) as real, reusable code instead of copy-pasted Tailwind per screen.
- **Dashboard tree** — `TreeNode.tsx`'s existing pure-CSS connector system (see Phase 5 above) was extended, not replaced, to add card polish, the real "Tailor with JD" flow, a real "Preview" link, a genuinely-disabled "Diff" placeholder, and the UI-ready ATS-score badge slot (see the Phase 5 section above for what's real vs. still unwired).
- **Editor screen** — `AiEditPreview.tsx` gained a real diff view (`lib/diff.ts`), `PreviewPane.tsx` gained a "paper" container around the unchanged real PDF plus a working download link, and `SourcePane.tsx` gained syntax-tinted LaTeX (a transparent-text textarea with a scroll-synced colored overlay behind it, no new editor-library dependency).
- **Logo** — now rendered in `Sidebar.tsx`, `TopBar.tsx`, and the login/signup cards (previously only on the landing page); the app icon/favicon was swapped to the branded dark-bg mark via `app/icon.png`.
- **Deliberately not built**: the editor mockup's file-tree sidebar (`images/`, `main.tex`, `style.cls`) — there's no multi-file-per-node backend to back it, so nothing cosmetic was built in its place.

## What's next

Still open, per `../docs/TASKS.md`: light theme, an actual icon set (still plain Unicode glyphs), a document-outline panel + light LaTeX formatting toolbar (seen in the editor mockup, never built), a real ATS-scoring backend field/endpoint (frontend slot exists — see Phase 10b above), a real diff-retrieval/diff-against-parent endpoint (the tree's "Diff" button is a genuine, honest placeholder today), multi-file LaTeX projects, and billing for the platform-key path (Phase 8 wires up the tier and its usage display, not billing itself).
