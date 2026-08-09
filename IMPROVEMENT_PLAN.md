# Improvement Roadmap

## Phases
1. **Immediate Fixes** - Resolve critical bugs, security findings, and push a hot‑fix branch.
2. **Test Coverage Boost** - Raise unit‑test coverage to ≥ 80 % on API and key Web components.
3. **Code‑Quality Refactor** - Clean up duplication, improve readability, extract shared utilities.
4. **Dependency Modernisation** - Upgrade packages to latest stable versions and resolve conflicts.
5. **Documentation Refresh** - Update README, API docs, and add contribution guide.
6. **Long‑Term Architecture Review** - Evaluate scalability, code‑splitting, and future‑proofing.

## Phase 1 – Immediate Fixes (Tasks)
- **Run lint & type‑check** – execute `npm run lint && npm run typecheck`
- **Run test suite with coverage** – execute `npm run test -- --coverage`
- **Perform code review** – invoke the `code-review` skill (medium effort) on `apps/api` and `apps/web`
- **Consolidate findings** – merge review + coverage results into a findings file
- **Prioritize & plan fixes** – create issue tickets for each prioritized item

## Phase 2 – Test Coverage Boost
- Add missing tests for error paths
- Refactor flaky tests
- Ensure coverage threshold is enforced

## Phase 3 – Code‑Quality Refactor
- Extract shared utilities into `packages/shared`
- Replace nested callbacks with async/await patterns
- Introduce stricter lint rules (`eslint-plugin-security`)

## Phase 4 – Dependency Modernisation
- Update `dependencies` and `devDependencies`
- Resolve version conflicts
- Verify compatibility with CI

## Phase 5 – Documentation Refresh
- Update README with setup steps (Docker, env vars)
- Add API contract section (OpenAPI/Swagger)
- Add contribution guide

## Phase 6 – Long‑Term Architecture Review
- Review folder structure for potential code‑splitting
- Assess benefits of worktree workflow
- Document migration path

---  
*Created on 2026‑08‑09. Adjust phases as needed.*