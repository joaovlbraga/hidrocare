# Editorial Clinical Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign all HidroCare frontend surfaces into a responsive, editorial clinical interface without changing backend contracts or credentials.

**Architecture:** Keep Next.js App Router and the existing `apiFetch` contract. Extract visual composition into shared client-side shell and presentational components, while pages retain their existing request, form submission, and RBAC behavior. Centralize the visual language in Tailwind tokens and global CSS.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 3, Radix primitives, CVA, Lucide, Recharts, Vitest, Testing Library.

## Global Constraints

- Do not edit `backend/`, `.env`, `DATABASE_URL`, `JWT_SECRET`, API routes, JWT behavior, RBAC rules, or PostgreSQL code.
- Keep current endpoint paths and payloads: `/auth/me`, `/auth/login`, `/patients`, `/auth/users`, and `/balances/records`.
- Preserve the existing blue/white clinical palette and use semantic status colors only for clinical state.
- Use keyboard-accessible controls, visible focus states, labels, and text/icon status indicators.
- Do not add external fonts, image assets, gradients, glassmorphism, or decorative metric cards.

---

## File Structure

- Create `frontend/components/app-shell.tsx`: responsive sidebar/topbar and role-filtered navigation.
- Create `frontend/components/page-header.tsx`: shared title, description and optional action region.
- Create `frontend/components/form-panel.tsx`: presentational form page surface and section heading.
- Create `frontend/tests/setup.ts`: Testing Library matchers.
- Create `frontend/vitest.config.ts`: Vitest jsdom configuration and `@/` alias.
- Create `frontend/components/page-header.test.tsx`: page-header accessibility/render tests.
- Create `frontend/components/app-shell.test.tsx`: navigation visibility tests with mocked API.
- Create `frontend/app/login/login.test.tsx`: login form semantic regression test.
- Create `frontend/app/registros/records.test.tsx`: clinical movement control regression test.
- Modify `frontend/package.json`: add test dependencies and scripts.
- Modify `frontend/tailwind.config.ts` and `frontend/app/globals.css`: editorial clinical design tokens and base styles.
- Modify `frontend/app/layout.tsx`: set document metadata and body typography class.
- Modify `frontend/components/app-header.tsx`: replace with a re-export of `AppShell` to avoid breaking existing imports.
- Modify `frontend/app/login/page.tsx`, `frontend/app/page.tsx`, `frontend/app/registros/page.tsx`, `frontend/app/pacientes/page.tsx`, and `frontend/app/usuarios/page.tsx`: adopt shared layout and preserve data behavior.

## Task 1: Add a focused frontend test harness

**Files:**
- Create: `frontend/vitest.config.ts`
- Create: `frontend/tests/setup.ts`
- Create: `frontend/components/page-header.test.tsx`
- Modify: `frontend/package.json`

**Interfaces:**
- Produces `npm run test` and global `describe`, `it`, and `expect` APIs for later component tests.
- Consumes the Next.js alias `@/*` defined in `tsconfig.json`.

- [ ] **Step 1: Add a failing page-header test**

```tsx
import { render, screen } from "@testing-library/react";
import { PageHeader } from "@/components/page-header";

it("exposes one accessible page heading and its supporting copy", () => {
  render(<PageHeader title="Registrar balanço hídrico" description="Registre ganhos e perdas." />);
  expect(screen.getByRole("heading", { name: "Registrar balanço hídrico" })).toBeInTheDocument();
  expect(screen.getByText("Registre ganhos e perdas.")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test and confirm the expected failure**

Run: `cd frontend && npm run test -- page-header.test.tsx`

Expected: FAIL because `@/components/page-header` does not exist.

- [ ] **Step 3: Configure Vitest and test scripts**

Add `"test": "vitest run"` and `"test:watch": "vitest"` to `scripts`; add `vitest`, `jsdom`, `@vitejs/plugin-react`, `@testing-library/react`, and `@testing-library/jest-dom` to `devDependencies`. Configure jsdom and setup file:

```ts
// frontend/vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", setupFiles: ["./tests/setup.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```

```ts
// frontend/tests/setup.ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Run the test and confirm it still fails only for the missing component**

Run: `cd frontend && npm install && npm run test -- page-header.test.tsx`

Expected: FAIL with module-not-found for `page-header`, proving the harness is active.

- [ ] **Step 5: Commit the harness only**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vitest.config.ts frontend/tests/setup.ts frontend/components/page-header.test.tsx
git commit -m "test: add frontend component test harness"
```

## Task 2: Establish the editorial clinical foundation and shared page header

**Files:**
- Create: `frontend/components/page-header.tsx`
- Modify: `frontend/tailwind.config.ts`
- Modify: `frontend/app/globals.css`
- Modify: `frontend/app/layout.tsx`
- Modify: `frontend/components/ui/card.tsx`

**Interfaces:**
- Produces `PageHeader({ title, description, actions? })`.
- Produces reusable `surface`, `eyebrow`-free type hierarchy, and semantic color tokens consumed by all screens.

- [ ] **Step 1: Implement the smallest PageHeader required by Task 1**

```tsx
type PageHeaderProps = { title: string; description: string; actions?: React.ReactNode };

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between"><div><h1 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p></div>{actions && <div className="shrink-0">{actions}</div>}</header>;
}
```

- [ ] **Step 2: Update design tokens and base styling**

Use a cool `slate-50` canvas, white surfaces, `hospital-900` primary ink, thin borders, restrained shadows, 8px-based spacing, and 12px default control radius. Keep `:focus-visible` ring treatment and add `selection` and reduced-motion behavior. Update Card to use `rounded-xl border border-slate-200 bg-white shadow-card` without hover elevation unless the component is interactive.

- [ ] **Step 3: Add metadata and typography class in RootLayout**

Keep `lang="pt-BR"`; update metadata to include the product name and clinical application description. Apply a single `font-sans` body class rather than per-page font overrides.

- [ ] **Step 4: Run the Task 1 test**

Run: `cd frontend && npm run test -- page-header.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the visual foundation**

```bash
git add frontend/tailwind.config.ts frontend/app/globals.css frontend/app/layout.tsx frontend/components/ui/card.tsx frontend/components/page-header.tsx
git commit -m "feat: establish editorial clinical design foundation"
```

## Task 3: Replace the header with a responsive clinical app shell

**Files:**
- Create: `frontend/components/app-shell.tsx`
- Create: `frontend/components/app-shell.test.tsx`
- Modify: `frontend/components/app-header.tsx`
- Modify: `frontend/app/page.tsx`
- Modify: `frontend/app/registros/page.tsx`
- Modify: `frontend/app/pacientes/page.tsx`
- Modify: `frontend/app/usuarios/page.tsx`

**Interfaces:**
- Produces `AppShell({ children })`, which owns sidebar/mobile navigation, sign-out and `/auth/me` role visibility.
- Existing pages consume `AppShell` instead of adding their own `AppHeader` and page container.

- [ ] **Step 1: Write the failing role-navigation test**

```tsx
vi.mock("@/lib/api", () => ({ apiFetch: vi.fn().mockResolvedValue({ role: "CLINICAL" }) }));

it("hides administrative links from clinical users", async () => {
  render(<AppShell><p>Conteúdo</p></AppShell>);
  expect(await screen.findByRole("link", { name: /registros/i })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /usuários/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `cd frontend && npm run test -- app-shell.test.tsx`

Expected: FAIL because `AppShell` is not exported.

- [ ] **Step 3: Implement AppShell and retain compatibility**

Build a desktop left rail with the HidroCare mark, Dashboard/Registrar links for all roles, and Pacientes/Usuários for admins. Render children inside a `max-w-7xl` content frame. On screens below `lg`, use the existing menu button and a labelled mobile nav. Keep `sessionStorage.removeItem("access_token")` and redirect to `/login` unchanged. Make `AppHeader` a thin wrapper returning `<AppShell>{children}</AppShell>` or migrate all imports in this task and remove it only after no imports remain.

- [ ] **Step 4: Run shell tests**

Run: `cd frontend && npm run test -- app-shell.test.tsx page-header.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the app shell**

```bash
git add frontend/components/app-shell.tsx frontend/components/app-shell.test.tsx frontend/components/app-header.tsx frontend/app/page.tsx frontend/app/registros/page.tsx frontend/app/pacientes/page.tsx frontend/app/usuarios/page.tsx
git commit -m "feat: add responsive clinical application shell"
```

## Task 4: Redesign login and dashboard composition

**Files:**
- Create: `frontend/app/login/login.test.tsx`
- Modify: `frontend/app/login/page.tsx`
- Modify: `frontend/app/page.tsx`

**Interfaces:**
- Consumes `apiFetch`, `PageHeader`, existing chart types, thresholds and login payloads.
- Produces unchanged login and dashboard behavior with editorial clinical layout.

- [ ] **Step 1: Write a failing login behavior test**

```tsx
it("keeps the login submit control available with labelled credentials", () => {
  render(<LoginPage />);
  expect(screen.getByLabelText("E-mail")).toHaveAttribute("name", "email");
  expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
});
```

- [ ] **Step 2: Run test and record its initial status**

Run: `cd frontend && npm run test -- login.test.tsx`

Expected: PASS before visual refactor; the test is the guardrail for preserving login form semantics.

- [ ] **Step 3: Implement visual composition without altering requests**

Login: use a two-column desktop composition with a restrained brand/assurance panel and a compact form surface; collapse to one column on mobile. Keep the fetch URL, POST payload, Zod schema and session storage logic exact.

Dashboard: use `PageHeader`; turn the three metrics into a single quiet data strip with separators, place the chart in the dominant left reading column, and present patient status as a clinical list with clear row dividers. Preserve calculations, loading state, API calls, threshold disclaimer and Recharts data keys.

- [ ] **Step 4: Run test and production build**

Run: `cd frontend && npm run test -- login.test.tsx && npm run build`

Expected: PASS and Next.js production build exits 0.

- [ ] **Step 5: Commit dashboard and login**

```bash
git add frontend/app/login/page.tsx frontend/app/page.tsx frontend/app/login/login.test.tsx
git commit -m "feat: redesign clinical login and dashboard"
```

## Task 5: Redesign records and administrative forms

**Files:**
- Create: `frontend/components/form-panel.tsx`
- Create: `frontend/app/registros/records.test.tsx`
- Modify: `frontend/app/registros/page.tsx`
- Modify: `frontend/app/pacientes/page.tsx`
- Modify: `frontend/app/usuarios/page.tsx`

**Interfaces:**
- Produces `FormPanel({ title, description, children, aside? })`.
- Consumes existing submit handlers and state; sends identical API bodies.

- [ ] **Step 1: Write a failing record form assertion**

```tsx
it("keeps entry and output choices as labelled controls", async () => {
  render(<RecordsPage />);
  expect(screen.getByRole("button", { name: /ganhos/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /perdas/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run it to verify the baseline**

Run: `cd frontend && npm run test -- records.test.tsx`

Expected: PASS before refactor; it guards the core clinical choice controls.

- [ ] **Step 3: Implement FormPanel and apply it consistently**

FormPanel uses `PageHeader`, a main white form surface and an optional narrow clinical-context aside on large screens. Records uses numbered/labelled sections for patient, movement, details and notes; it keeps the current input/output buttons, Select state and JSON payload unchanged. Patients and Users use the same field grouping, admin/security notices and primary action placement; no generic copy or extra fields are added.

- [ ] **Step 4: Run targeted tests and build**

Run: `cd frontend && npm run test -- records.test.tsx && npm run build`

Expected: PASS and build exits 0.

- [ ] **Step 5: Commit the form surfaces**

```bash
git add frontend/components/form-panel.tsx frontend/app/registros/page.tsx frontend/app/pacientes/page.tsx frontend/app/usuarios/page.tsx frontend/app/registros/records.test.tsx
git commit -m "feat: unify clinical and administrative form layouts"
```

## Task 6: Responsive, accessibility and visual QA

**Files:**
- Modify: files from Tasks 2–5 only when a QA finding requires it.

**Interfaces:**
- Consumes complete frontend and running local API.
- Produces verified desktop/mobile layouts without backend changes.

- [ ] **Step 1: Run all automated checks**

Run: `cd frontend && npm run test && npm run build`

Expected: all tests pass and build exits 0.

- [ ] **Step 2: Run the application and inspect five routes**

Run: `cd frontend && npm run dev`

Inspect at 1440px and 390px widths: `/login`, `/`, `/registros`, `/pacientes`, `/usuarios`.

Expected: no horizontal overflow; keyboard focus is visible; desktop sidebar becomes a usable mobile menu; chart remains readable; form labels and messages are visible.

- [ ] **Step 3: Check protected UI behavior**

Log in once as `CLINICAL` and once as `ADMIN`.

Expected: clinical navigation contains Dashboard/Registrar only; admin navigation also contains Pacientes/Usuários; existing backend 403 behavior remains the authority for direct route access.

- [ ] **Step 4: Commit QA fixes**

```bash
git add frontend
git commit -m "fix: polish responsive clinical interface"
```

## Plan self-review

- Spec coverage: Tasks 2–5 cover tokens, shared components, app shell, all five screens, status semantics and responsive layouts. Task 6 covers accessibility and runtime verification. Backend and credential boundaries are repeated in Global Constraints.
- Placeholder scan: no `TODO`, `TBD`, or undefined future work remains.
- Type consistency: `PageHeader`, `AppShell`, and `FormPanel` props are defined at first use; all existing API calls remain within their current page boundaries.
