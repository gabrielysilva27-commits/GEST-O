import fs from 'node:fs/promises';

const path = 'assets/js/api.js';
let source = await fs.readFile(path, 'utf8');
const before = '      existingUser.passwordHash = seededUser.passwordHash;';
const after = '      existingUser.passwordHash = existingUser.passwordHash || seededUser.passwordHash;';
if (!source.includes(after)) {
  if (!source.includes(before)) throw new Error('Marcador de senha dos usuários seed não encontrado');
  source = source.replace(before, after);
  await fs.writeFile(path, source);
}
if (!source.includes(after)) throw new Error('Senha local redefinida não será preservada');
console.log('Preservação da senha redefinida no cache local aplicada.');
