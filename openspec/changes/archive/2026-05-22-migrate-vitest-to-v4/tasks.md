## 1. Version bump

- [x] 1.1 `pnpm add -D vitest@^4 @vitest/coverage-v8@^4` (single command so the majors install in lockstep)
- [x] 1.2 Confirm `pnpm exec vitest --version` prints `vitest/4.x.x`
- [x] 1.3 Confirm `package.json` shows both packages on a `^4` range; lockfile reflects matching majors
- [x] 1.4 Check `pnpm install` output for any peer-warning on `vite-tsconfig-paths`. If absent, no further action. If present, bump `vite-tsconfig-paths` to the version that satisfies and note the bump in this tasks list as task 1.5

## 2. Verification — no expected code or config changes

- [x] 2.1 Run `pnpm test:logic`; expect `22 tests passed (22)` and `Test Files  3 passed (3)`
- [x] 2.2 Run `pnpm test:logic` two more times back-to-back; confirm no flakes, no test-count drift, and warm-run timing within a small multiple of the prior ~264 ms baseline (pause if > 2×)
- [x] 2.3 Run `pnpm test:logic --coverage`; confirm report still emits with similar percentages as on 3.x (solver ~96%, demo data 100%, store ~83%). Note any new "uncovered files" entries vs 3.x — purely informational
- [x] 2.4 Run `pnpm lint`; expect only the unrelated `.remember/tmp/` warning
- [x] 2.5 Run `pnpm build`; expect a clean Next.js production build (Vitest 4's transitive Vite 6 should not affect the Next build, but verify)

## 3. Config drift check (defensive — only act if verification surfaces an issue)

- [x] 3.1 If task 2.1 fails because Vitest 4 rejects something in `vitest.config.ts`, capture the error here and patch the config minimally. Otherwise mark this group N/A
- [x] 3.2 If task 2.3's coverage report uses removed options (`coverage.all` / `coverage.extensions`) — we don't set these today, so expect no action
- [x] 3.3 If the `@/*` alias suddenly fails to resolve, the fallback is to replace `vite-tsconfig-paths` with explicit `resolve.alias` in `vitest.config.ts` (one-file fix per design.md)
- [x] 3.4 (Unanticipated, surfaced during verification): `@vitest/coverage-v8@4.x` writes `coverage/block-navigation.js` which triggers an "unused eslint-disable directive" lint warning. Add `coverage/**` to the ESLint `globalIgnores` list. `coverage/` is already git-ignored, so this is purely an ESLint scope fix.

## 4. Wrap-up

- [x] 4.1 No changes to `__tests__/` files expected; verify `git status` after task group 2 shows only `package.json`, `pnpm-lock.yaml` changed (and potentially `vitest.config.ts` if task group 3 fired)
- [x] 4.2 Note the upgrade in CLAUDE.md if any user-visible behavior changed (e.g., test output format). Skip if everything is identical
