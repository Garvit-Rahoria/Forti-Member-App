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