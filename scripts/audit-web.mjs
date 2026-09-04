import { spawnSync } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';

// Only registry/network failures may retry. An unavailable audit never passes.
for (let attempt = 1; attempt <= 3; attempt++) {
  console.log(`Auditoria npm: tentativa ${attempt}/3`);
  const result = spawnSync('npm', [
    'audit', '--omit=dev', '--audit-level=high', '--json',
    '--fetch-timeout=20000', '--fetch-retries=0',
  ], {
    cwd: new URL('../web/', import.meta.url), encoding: 'utf8',
    timeout: 60000, maxBuffer: 4 * 1024 * 1024,
  });
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  console.log(output);
  let report;
  try { report = JSON.parse(result.stdout); } catch { /* fail closed below */ }
  const counts = report?.metadata?.vulnerabilities;
  const valid = counts && ['high', 'critical'].every(key => Number.isInteger(counts[key]) && counts[key] >= 0)
    && report.vulnerabilities && typeof report.vulnerabilities === 'object' && !report.error;
  if (valid && (counts.high > 0 || counts.critical > 0)) {
    console.error(`::error::Auditoria bloqueou a publicação: ${counts.high} vulnerabilidades altas e ${counts.critical} críticas.`);
    process.exit(1);
  }
  if (result.status === 0 && valid) process.exit(0);
  const temporary = result.error?.code === 'ETIMEDOUT'
    || /network timeout|fetch failed|ETIMEDOUT|ESOCKETTIMEDOUT|ECONNRESET|ECONNREFUSED|EAI_AGAIN|ENOTFOUND|E429|E50[234]/i.test(output);
  if (!temporary) {
    console.error('::error::Auditoria npm falhou ou retornou um relatório inválido. Consulte o log; a publicação permanece bloqueada.');
    process.exit(1);
  }
  if (attempt === 3) {
    console.error('::error::Serviço de auditoria npm indisponível após 3 tentativas. A publicação permanece bloqueada; tente novamente mais tarde.');
    process.exit(1);
  }
  console.warn('Falha temporária de conexão com o npm; a auditoria será repetida.');
  await setTimeout(attempt * 2000);
}
