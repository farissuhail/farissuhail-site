// Manage MTR DRILLTECH accounts (rig explorer + HWU Level 2 simulator).
//
//   node tools/mtr-access.mjs list
//   node tools/mtr-access.mjs add <username> [password]   (no password: one is generated)
//   node tools/mtr-access.mjs remove <username>
//
// Passwords are never stored: only a salted PBKDF2-SHA256 hash goes into
// tools/mtr-drilltech-access/users.json and the published access.js.
// A change is live only after it is committed and pushed.
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readUsers, writeAccessList, USERS_FILE } from './mtr-drilltech-access/apply.mjs';

const TARGET = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'mtr-drilltech');
const ITERATIONS = 200000;
const [command, rawName, rawPassword] = process.argv.slice(2);
const name = (rawName || '').trim().toLowerCase();

function usage() {
  console.log('Usage: node tools/mtr-access.mjs list | add <username> [password] | remove <username>');
  process.exit(1);
}

async function save(users) {
  await writeFile(USERS_FILE, JSON.stringify(users, null, 2) + '\n');
  await writeAccessList(TARGET);
}

const users = await readUsers();

if (command === 'list') {
  if (!users.length) console.log('No accounts yet.');
  for (const user of users) console.log(`${user.u.padEnd(24)} added ${user.added}${user.note ? '  ' + user.note : ''}`);
} else if (command === 'add') {
  if (!/^[a-z0-9._@-]{2,40}$/.test(name)) {
    console.error('Username: 2-40 characters from a-z, 0-9, dot, dash, underscore, @.');
    process.exit(1);
  }
  const generated = !rawPassword;
  const password = rawPassword || randomBytes(9).toString('base64url');
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, Buffer.from(salt, 'hex'), ITERATIONS, 32, 'sha256').toString('hex');
  const entry = { u: name, s: salt, n: ITERATIONS, h: hash, added: new Date().toISOString().slice(0, 10) };
  const existing = users.findIndex((user) => user.u === name);
  if (existing >= 0) users[existing] = entry; else users.push(entry);
  await save(users);
  console.log(`${existing >= 0 ? 'Password changed for' : 'Added'} ${name}.`);
  if (generated) console.log(`Password: ${password}   (shown once, not stored)`);
  console.log('Commit and push for it to take effect on the live site.');
} else if (command === 'remove') {
  const left = users.filter((user) => user.u !== name);
  if (left.length === users.length) {
    console.error(`No account named ${name}.`);
    process.exit(1);
  }
  await save(left);
  console.log(`Removed ${name}. Commit and push for it to take effect on the live site.`);
} else {
  usage();
}
