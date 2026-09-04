import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

function check(scenario) {
  const directory = mkdtempSync(join(tmpdir(), 'orbit-audit-'));
  try {
    writeFileSync(join(directory, 'count'), '0');
    writeFileSync(join(directory, 'npm'), `#!/usr/bin/env node
const fs = require('node:fs');
const count = Number(fs.existsSync(process.env.COUNTER) ? fs.readFileSync(process.env.COUNTER, 'utf8') : 0) + 1;
fs.writeFileSync(process.env.COUNTER, String(count));
const mode = process.env.SCENARIO;
if (!process.argv.includes('--omit=dev') || !process.argv.includes('--audit-level=high')) process.exit(9);
if (mode === 'vulnerability') {
 console.log(JSON.stringify({metadata:{vulnerabilities:{high:1,critical:0}},vulnerabilities:{example:{severity:'high'}}})); process.exit(1);
}
if (mode === 'invalid') { console.log('not an audit report'); process.exit(0); }
if (mode === 'config') { console.log(JSON.stringify({error:{code:'ENOLOCK',summary:'lockfile required'}})); process.exit(1); }
if (mode === 'unavailable' || (mode === 'recover' && count === 1)) {
 console.log(JSON.stringify({message:'network timeout at: https://registry.npmjs.org/-/npm/v1/security/audits/quick'})); process.exit(1);
}
console.log(JSON.stringify({metadata:{vulnerabilities:{high:0,critical:0}},vulnerabilities:{}}));
`, { mode: 0o700 });
    const result = spawnSync(process.execPath, [resolve('scripts/audit-web.mjs')], {
      encoding: 'utf8', timeout: 45000,
      env: { ...process.env, PATH: `${directory}:${process.env.PATH}`, SCENARIO: scenario, COUNTER: join(directory, 'count') },
    });
    return { ...result, count: Number(readFileSync(join(directory, 'count'), 'utf8')) };
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

test('a temporary registry timeout is retried and only a clean audit succeeds', () => {
  const result = check('recover');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.count, 2);
});
test('a high vulnerability blocks publication immediately', () => {
  const result = check('vulnerability');
  assert.equal(result.status, 1);
  assert.equal(result.count, 1);
  assert.match(result.stderr, /vulnerabil/i);
});
test('persistent registry failure remains a failed gate after three attempts', () => {
  const result = check('unavailable');
  assert.equal(result.status, 1);
  assert.equal(result.count, 3);
  assert.match(result.stderr, /indisponível/i);
});
test('configuration errors are not retried', () => {
  const result = check('config');
  assert.equal(result.status, 1);
  assert.equal(result.count, 1);
});
test('a successful process with an invalid audit report cannot pass the gate', () => {
  const result = check('invalid');
  assert.equal(result.status, 1);
  assert.equal(result.count, 1);
});
