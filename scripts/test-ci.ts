import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// The existing workflow runs npm test. Its posttest hook also checks compiled
// translations in CI, whose runner provides Python, Java and C++ toolchains.
if (process.env.CI === 'true') {
  execFileSync(
    process.execPath,
    ['--import', 'tsx', fileURLToPath(new URL('./test-code-languages.ts', import.meta.url))],
    { stdio: 'inherit' },
  );
}
