# Project Guidelines

## Architecture
- This workspace is split into three areas: the Express API in `backend/`, the React 18 + Vite client in `frontend/`, and SQL migrations plus setup scripts in `database/` and the root migration runners.
- Backend route modules live in `backend/src/routes/` and are registered centrally in `backend/src/app.js`. When adding or renaming an API surface, update both the route file and the registration.
- Frontend routes are declared in `frontend/src/App.jsx`. Admin navigation is defined separately in `frontend/src/layouts/AdminLayout.jsx`, so route changes often require matching nav updates.
- Admin and member flows are intentionally separate. Admin auth uses `forti_token` with `AuthContext`; member auth uses `forti_member_token` with `MemberContext`. Do not mix those session models.

## Build And Validation
- Install dependencies per package: run `npm install` in `backend/` and separately in `frontend/`.
- Backend local run commands: `npm run dev` or `npm start` from `backend/`.
- Frontend local run commands: `npm run dev`, `npm run build`, and `npm run preview` from `frontend/`.
- Prefer validating frontend changes with `npm run build` in `frontend/`.
- Database changes should stay additive and align with the existing migration pattern in `database/migration_v*.sql` and the root or backend migration runner scripts.

## Conventions
- Backend code uses CommonJS and the shared helpers in `backend/src/utils/helpers.js`. Preserve the existing JSON response shape built around `ok(...)` and `fail(...)` when editing routes.
- Backend data access uses the shared MySQL pool and commonly builds filters and pagination with `buildWhere(...)` and `paginate(...)` rather than ad hoc response formats.
- Frontend code uses function components, React Router guards, and the shared Axios client in `frontend/src/api/client.js`. Reuse that client instead of creating one-off fetch logic for admin APIs.
- Keep API and asset URLs consistent with the existing proxy setup: `/api`, `/uploads`, and `/storage` are forwarded by Vite to the backend.
- Preserve role-based behavior already encoded in `frontend/src/App.jsx` and `frontend/src/layouts/AdminLayout.jsx`. If a page is role-restricted, update both route protection and visible navigation intentionally.

## Environment And Pitfalls
- The backend loads environment variables from `backend/.env` and defaults CORS to `http://localhost:3000`. If frontend or backend ports change, update the environment values instead of hardcoding new origins.
- Rate limiting is active for general API traffic, auth, OTP, and membership uploads. Treat HTTP 429 as a possible configuration or throttling issue before debugging business logic.
- Uploaded files and generated assets are served directly from `/uploads` and `/storage`. Keep those public path shapes stable when changing file-handling code.
- This codebase contains many task-specific scripts and migration runners. Before adding a new standalone script, check whether the existing migration or seed script pattern already covers the task.

---

<!-- skill: caveman -->
Respond terse like smart caveman. All technical substance stay. Only fluff die.

**Persistence:** ACTIVE EVERY RESPONSE when triggered. Off only: "stop caveman" / "normal mode".

**Triggers:** "caveman mode", "talk like caveman", "use caveman", "less tokens", "be brief", `/caveman`.

**Rules:** Drop articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries (sure/certainly/of course/happy to), hedging. Fragments OK. Short synonyms. Technical terms exact. Code blocks unchanged. Errors quoted exact.

**Intensity levels:**
- `/caveman lite` — Drop filler. Keep articles + full sentences. Professional but tight.
- `/caveman` (default/full) — Drop articles, fragments OK, short synonyms. Classic caveman.
- `/caveman ultra` — Abbreviate (DB/auth/config/req/res/fn/impl), strip conjunctions, arrows for causality (X → Y).

**Auto-Clarity:** Drop caveman for security warnings, irreversible action confirmations. Resume after.

---

<!-- skill: caveman-commit -->
Write commit messages terse and exact. Conventional Commits format. No fluff. Why over what.

**Triggers:** "write a commit", "commit message", "generate commit", `/caveman-commit`.

**Subject line:** `<type>(<scope>): <imperative summary>` — ≤50 chars, no trailing period.
Types: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `build`, `ci`, `style`, `revert`.

**Body:** Skip if subject self-explanatory. Add only for: non-obvious why, breaking changes, migration notes. Wrap 72 chars.

**Never:** "This commit does X", emoji (unless project uses it), AI attribution, restating file name when scope covers it.

Output as code block ready to paste. Does not run `git commit`.

---

<!-- skill: caveman-review -->
Write code review comments terse and actionable. One line per finding. Location, problem, fix. No throat-clearing.

**Triggers:** "review this PR", "code review", "review the diff", `/caveman-review`.

**Format:** `L<line>: <problem>. <fix>.` or `<file>:L<line>: ...` for multi-file diffs.

**Severity prefix (optional):**
- `🔴 bug:` — broken behavior
- `🟡 risk:` — works but fragile
- `🔵 nit:` — style, naming, micro-optim
- `❓ q:` — genuine question

**Drop:** "I noticed that...", "You might want to consider...", hedging, restating what the line does.

**Auto-Clarity:** Full explanation for security findings (CVE-class), architectural disagreements, onboarding contexts.

Output comment(s) ready to paste. Does not approve/request-changes, does not run linters.

---

<!-- skill: caveman-help -->
Display this reference card when invoked. One-shot — does NOT change mode or persist anything.

**Triggers:** `/caveman-help`, "caveman help", "what caveman commands".

| Mode | Trigger | What changes |
|------|---------|--------------|
| Lite | `/caveman lite` | Drop filler. Keep structure. |
| Full | `/caveman` | Drop articles, fragments OK. Default. |
| Ultra | `/caveman ultra` | Extreme compression. Abbreviate all. |

| Skill | Trigger | What it does |
|-------|---------|--------------|
| caveman-commit | `/caveman-commit` | Terse commit messages. Conventional Commits. ≤50 char subject. |
| caveman-review | `/caveman-review` | One-line PR comments: `L42: 🔴 bug: user null. Add guard.` |
| caveman-help | `/caveman-help` | This reference card. |

Deactivate: "stop caveman" or "normal mode".

---

<!-- skill: build-graph (code-review-graph) -->
Build or incrementally update the persistent code knowledge graph for this repository.

**Triggers:** "build the code review graph", "build graph", "update graph", `/build-graph`.

**Steps:**
1. Check graph status via `list_graph_stats_tool` MCP tool.
2. Build: `build_or_update_graph_tool(full_rebuild=True)` for first-time, `build_or_update_graph_tool()` for updates.
3. Verify with `list_graph_stats_tool` — report files parsed, nodes/edges, languages, errors.

Graph stored as SQLite at `.code-review-graph/graph.db`. Auto-updates via hooks on edit/commit.

---

<!-- skill: review-pr (code-review-graph) -->
Perform a comprehensive code review of a pull request or branch diff using the knowledge graph.

**Triggers:** "review this PR", "review branch diff", `/review-pr [branch]`.

**Steps:**
1. Identify changed files (from PR number/branch or auto-detect from current branch vs main).
2. `build_or_update_graph_tool(base="main")` to update graph.
3. `get_review_context_tool(base="main")` for full context.
4. `get_impact_radius_tool(base="main")` for blast radius.
5. Deep-dive each changed file; use `query_graph_tool` for callers and test coverage.
6. Output structured review: Summary, Risk Assessment, File-by-File Review, Missing Tests, Recommendations.

**Token optimization:** Before starting, call `get_docs_section_tool(section_name="review-pr")`.

---

<!-- skill: review-delta (code-review-graph) -->
Perform a focused, token-efficient review of only the changed code and its blast radius.

**Triggers:** "review changes", "review delta", `/review-delta`.

**Steps:**
1. `build_or_update_graph_tool()` incremental update.
2. `get_review_context_tool()` — returns changed files, blast radius, source snippets, test coverage gaps.
3. Analyze blast radius: functions whose callers changed, inheritance changes, high-dependency files.
4. Report: Summary, Risk level (Low/Medium/High), Issues found, Blast radius, Recommendations.

5-10x fewer tokens than full-repo review. Only sends changed + impacted code.