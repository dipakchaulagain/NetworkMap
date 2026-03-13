import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../data');

export function readData(filename) {
  const file = join(DATA_DIR, filename);
  if (!existsSync(file)) return [];
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

export function writeData(filename, data) {
  const file = join(DATA_DIR, filename);
  writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}
