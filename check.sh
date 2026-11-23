#!/usr/bin/env bash
# Single quality gate used by CI and by build-lab before every push:
# format check, type check, lint, tests, production build.
set -euo pipefail
cd "$(dirname "$0")"
npm ci --no-audit --no-fund
npm run format:check
npx tsc --noEmit
npm run lint
npm test
npm run build
