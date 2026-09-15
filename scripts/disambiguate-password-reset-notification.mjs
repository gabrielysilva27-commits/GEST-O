import fs from 'node:fs/promises';

const path = 'recovered/runtime.js';
let source = await fs.readFile(path, 'utf8');
const marker = '    const passwordResetNotification = path.match(/^\\/api\\/password-reset\\/notifications\\/([^/]+)\\/read$/);';
const response = '      return Response.json({ success: true, item });';
const replacement = '      return Response.json({ success: true, notification: item });';
const start = source.indexOf(marker);
if (start < 0) throw new Error('Rota de notificação de redefinição não encontrada');
const end = source.indexOf('    }\n', start);
if (end < 0) throw new Error('Fim da rota de notificação não encontrado');
const block = source.slice(start, end + 6);
if (!block.includes(replacement)) {
  if (!block.includes(response)) throw new Error('Resposta da notificação não encontrada');
  source = source.slice(0, start) + block.replace(response, replacement) + source.slice(end + 6);
  await fs.writeFile(path, source);
}
console.log('Marcador de live-actions preservado para controle de revisão.');
