// Adds the account gate to the published MTR DRILLTECH folder.
//
// Called by tools/build-mtr-drilltech.mjs after the folder is regenerated,
// and by tools/mtr-access.mjs whenever the account list changes.
//
// The gate is a front-door lock for a static site (see gate.js): accounts
// are stored as salted PBKDF2 hashes in users.json, never as passwords.
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const USERS_FILE = path.join(HERE, 'users.json');
const GATE_TAGS = '<script src="access.js"></script><script src="gate.js"></script>';

export async function readUsers() {
  try {
    return JSON.parse(await readFile(USERS_FILE, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

/** Writes the public account list (username, salt, iterations, hash). */
export async function writeAccessList(target) {
  const users = (await readUsers()).map(({ u, s, n, h }) => ({ u, s, n, h }));
  await writeFile(path.join(target, 'access.js'), `window.MTR_ACCESS=${JSON.stringify(users)};\n`);
  return users.length;
}

export async function applyAccessGate(target) {
  const indexPath = path.join(target, 'index.html');
  let html = await readFile(indexPath, 'utf8');
  if (html.includes('gate.js')) throw new Error('Access gate is already applied to ' + indexPath);
  const anchor = '<link rel="stylesheet" href="style.css" />';
  if (html.split(anchor).length !== 2) throw new Error('Expected pattern missing: access gate anchor');
  html = html.replace(anchor, `${GATE_TAGS}\n  ${anchor}`);
  await writeFile(indexPath, html);
  await copyFile(path.join(HERE, 'gate.js'), path.join(target, 'gate.js'));
  await copyFile(path.join(HERE, 'login.html'), path.join(target, 'login.html'));
  return writeAccessList(target);
}
