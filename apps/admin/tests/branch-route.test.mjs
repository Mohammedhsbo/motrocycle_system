import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const apiSource = readFileSync(new URL('./api.ts', import.meta.url), 'utf8');
const branchContextSource = readFileSync(new URL('./contexts/BranchContext.tsx', import.meta.url), 'utf8');

test('admin branch selector uses the verified admin-config route', () => {
  assert.match(apiSource, /\/admin\/config\/branches/);
  assert.match(apiSource, /listBranches:\s*async\s*\(\)/);
  assert.match(branchContextSource, /configuration\.listBranches\(\)/);
  assert.doesNotMatch(branchContextSource, /branches\.list\(\{\s*page:\s*1,\s*limit:\s*100\s*\}\)/);
});
