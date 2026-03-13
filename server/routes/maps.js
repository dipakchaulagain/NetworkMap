import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readData, writeData } from '../utils/storage.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const maps = readData('maps.json');
  res.json(maps.map(({ nodes, edges, ...m }) => m));
});

router.get('/:id', (req, res) => {
  const maps = readData('maps.json');
  const map = maps.find((m) => m.id === req.params.id);
  if (!map) return res.status(404).json({ message: 'Map not found' });
  res.json(map);
});

router.post('/', (req, res) => {
  const { name, type, description } = req.body;
  if (!name) return res.status(400).json({ message: 'Name required' });
  if (!['static', 'active'].includes(type)) return res.status(400).json({ message: 'Type must be static or active' });

  const maps = readData('maps.json');
  const map = {
    id: uuidv4(),
    name,
    type,
    description: description || '',
    nodes: [],
    edges: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  maps.push(map);
  writeData('maps.json', maps);
  const { nodes, edges, ...summary } = map;
  res.status(201).json(summary);
});

router.put('/:id', (req, res) => {
  const maps = readData('maps.json');
  const idx = maps.findIndex((m) => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Map not found' });

  const { name, description, nodes, edges } = req.body;
  if (name !== undefined) maps[idx].name = name;
  if (description !== undefined) maps[idx].description = description;
  if (nodes !== undefined) maps[idx].nodes = nodes;
  if (edges !== undefined) maps[idx].edges = edges;
  maps[idx].updatedAt = new Date().toISOString();

  writeData('maps.json', maps);
  res.json(maps[idx]);
});

router.delete('/:id', (req, res) => {
  const maps = readData('maps.json');
  const filtered = maps.filter((m) => m.id !== req.params.id);
  if (filtered.length === maps.length) return res.status(404).json({ message: 'Map not found' });
  writeData('maps.json', filtered);
  res.json({ message: 'Map deleted' });
});

export default router;
