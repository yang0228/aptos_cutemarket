# Phase 5: Polish Implementation Plan

**Goal:** Add loading skeletons, error boundaries, and responsive polish.

**Tech Stack:** React 18, TypeScript, Tailwind CSS

---

### Task 1: Loading Skeleton Components

**Files:**
- Create: `src/components/Skeleton.tsx`
- Modify: `src/pages/Home.tsx` (use skeleton while loading)
- Modify: `src/pages/Portfolio.tsx` (use skeleton while loading)
- Modify: `src/pages/ProjectDetail.tsx` (use skeleton while loading)

- [ ] Create reusable Skeleton component
- [ ] Replace "加载中..." text with skeleton cards on Home
- [ ] Replace "加载中..." text with skeleton cards on Portfolio
- [ ] Replace "加载中..." text with skeleton on ProjectDetail
- [ ] Verify build, commit

---

### Task 2: Error Boundary

**Files:**
- Create: `src/components/ErrorBoundary.tsx`
- Modify: `src/App.tsx` (wrap routes with ErrorBoundary)

- [ ] Create ErrorBoundary component
- [ ] Wrap app with ErrorBoundary
- [ ] Verify build, commit

---

### Task 3: Responsive Polish

**Files:**
- Modify: `src/pages/Home.tsx` (mobile improvements)
- Modify: `src/pages/ProjectDetail.tsx` (mobile improvements)
- Modify: `src/components/OrderPanel.tsx` (mobile improvements)

- [ ] Review and fix mobile layout issues
- [ ] Verify build, commit

---

### Task 4: Empty State Improvements

**Files:**
- Modify: `src/pages/Home.tsx` (better empty state)
- Modify: `src/pages/Portfolio.tsx` (better empty state)

- [ ] Add illustrations/CTA to empty states
- [ ] Verify build, commit
