## MODIFIED Requirements

### Requirement: Vitest 4.x is the unit-test runner

The repository SHALL adopt Vitest (`^4.0.0`) as the unit-test runner. The dev-dependency set SHALL include `vitest`, `@vitest/coverage-v8`, and `vite-tsconfig-paths`. `vitest` and `@vitest/coverage-v8` SHALL share the same major version. No other test-runner (Jest, mocha, `node:test`) SHALL be installed in parallel. The host SHALL run Node.js `>= 20.0.0` (Vitest 4 requirement).

#### Scenario: Installation produces a working 4.x runner

- **WHEN** a fresh contributor runs `pnpm install`
- **THEN** `pnpm exec vitest --version` SHALL print a 4.x version
- **AND** `@vitest/coverage-v8` SHALL resolve to a 4.x version (same major as `vitest`)
- **AND** no Jest or other runner config files SHALL exist at the repo root

#### Scenario: Node version meets the runtime floor

- **WHEN** the runner starts up
- **THEN** the process SHALL be on Node.js `>= 20`
- **AND** SHALL NOT print any "unsupported Node version" warnings from Vitest
