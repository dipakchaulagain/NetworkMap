import express from 'express';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { authenticate, requireEditor } from '../middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, '../data/settings.json');

const DEFAULTS = { snmpPollInterval: 60 };

function load() {
  try {
    if (!existsSync(DATA_FILE)) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(readFileSync(DATA_FILE, 'utf8')) };
  } catch { return { ...DEFAULTS }; }
}

function save(data) {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

const router = express.Router();

router.use(authenticate);

router.get('/', (req, res) => {
  res.json(load());
});

router.put('/', requireEditor, (req, res) => {
  const current = load();
  const updated = { ...current, ...req.body };
  save(updated);
  res.json(updated);
});

export default router;
