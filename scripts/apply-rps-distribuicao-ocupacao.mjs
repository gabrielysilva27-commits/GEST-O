import fs from 'node:fs/promises';

const runtimePath = 'recovered/runtime.js';
let runtime = await fs.readFile(runtimePath, 'utf8');

if (!runtime.includes('RPS_DISTRIBUICAO_OCUPACAO_V1')) {
  const seedMarker = 'var meetingSubjectSeed = ';
  if (!runtime.includes(seedMarker)) throw new Error('Cadastro central de assuntos não encontrado.');
  runtime = runtime.replace(seedMarker, '// RPS_DISTRIBUICAO_OCUPACAO_V1\n' + seedMarker);

  const rpsTail = '"Cx Viagem FF e Spot"]';
  if (!runtime.includes(rpsTail)) throw new Error('RPS Distribuição não encontrada no cadastro de assuntos.');
  runtime = runtime.replace(rpsTail, '"Cx Viagem FF e Spot", "Ocupação"]');

  const versionBefore = 'var meetingSubjectSeedVersion = 2;';
  if (!runtime.includes(versionBefore)) throw new Error('Versão do cadastro de assuntos não encontrada.');
  runtime = runtime.replace(versionBefore, 'var meetingSubjectSeedVersion = 3;');
  await fs.writeFile(runtimePath, runtime);
}

const builderPath = 'scripts/build-recovered.mjs';
let builder = await fs.readFile(builderPath, 'utf8');
const initBefore = 'const initializeActions = async () => { await prepareReviewedActionImport(state); await prepareReviewedActionImportB(state); await removeActions2025(state); };';
const initAfter = 'const initializeActions = async () => { await this.ensureMeetingSubjects(); await prepareReviewedActionImport(state); await prepareReviewedActionImportB(state); await removeActions2025(state); };';
if (!builder.includes(initAfter)) {
  if (!builder.includes(initBefore)) throw new Error('Inicialização do SharedStore não encontrada.');
  builder = builder.replace(initBefore, initAfter);
  await fs.writeFile(builderPath, builder);
}

console.log('Ocupação adicionada ao cadastro central da RPS Distribuição e migração automática habilitada.');
