import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultFile = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'state.json');
const dataFile = process.env.DEMO_DATA_FILE ?? defaultFile;

async function exists(path) {
  try { await readFile(path, 'utf8'); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

async function writeAtomically(path, content) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  // 迁移写入使用临时文件替换；任何中断都不会产生半份 V0.3 状态文件。
  await writeFile(temporary, content, { encoding: 'utf8', mode: 0o600 });
  await rename(temporary, path);
}

if (await exists(dataFile)) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = join(dirname(dataFile), `state.v02.backup.${timestamp}.json`);
  // 旧演示记录仅作本地可回滚备份，不迁移旧路由含义以免与 P3.5 规则混淆。
  await copyFile(dataFile, backup);
  console.log(JSON.stringify({ migration: 'backup_created', data_file: dataFile, backup_file: backup }));
}

await writeAtomically(dataFile, `${JSON.stringify({ schema_version: '0.3', applications: {}, audit_actions: [] }, null, 2)}\n`);
console.log(JSON.stringify({ migration: 'v03_initialized', data_file: dataFile, schema_version: '0.3' }));
