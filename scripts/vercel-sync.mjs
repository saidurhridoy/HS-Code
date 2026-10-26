import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const REPO = process.env.GITHUB_REPO || 'saidurhridoy/HS-Code';
const REF = process.env.GITHUB_REF_NAME || 'arena/e36e10f8-hs-code';

async function main() {
  const cwd = process.cwd();
  const marker = path.join(cwd, 'data', 'wco-hs2022.csv');
  if (fs.existsSync(marker) && fs.existsSync(path.join(cwd, 'src', 'App.tsx'))) {
    console.log('[vercel-sync] Full workspace already present on disk, skipping download.');
    return;
  }

  const url = `https://codeload.github.com/${REPO}/tar.gz/${REF}`;
  console.log(`[vercel-sync] Hydrating repository files from ${url} ...`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`[vercel-sync] Failed to fetch tarball (${res.status} ${res.statusText})`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  const tmpTar = path.join(cwd, '.repo-sync.tar.gz');
  fs.writeFileSync(tmpTar, buf);

  // Extract into temp dir so we never overwrite vercel.json supplied by deployment API if newer
  const extractDir = path.join(cwd, '.repo-extract');
  fs.mkdirSync(extractDir, { recursive: true });
  execFileSync('tar', ['-xzf', tmpTar, '--strip-components=1', '-C', extractDir], {
    stdio: 'inherit',
  });

  for (const item of fs.readdirSync(extractDir)) {
    if (item === 'vercel.json') continue;
    const srcPath = path.join(extractDir, item);
    const destPath = path.join(cwd, item);
    fs.cpSync(srcPath, destPath, { recursive: true, force: true });
  }

  fs.rmSync(tmpTar, { force: true });
  fs.rmSync(extractDir, { recursive: true, force: true });
  console.log('[vercel-sync] Workspace hydrated successfully.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
