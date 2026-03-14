import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { readData, writeData } from '../utils/storage.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', (req, res) => {
  const users = readData('users.json');
  res.json(users.map(({ password, ...u }) => u));
});

router.post('/', requireAdmin, async (req, res) => {
  const { username, password, role, email, fullName } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Username and password required' });

  const users = readData('users.json');
  if (users.find((u) => u.username === username)) {
    return res.status(409).json({ message: 'Username already exists' });
  }

  const hashed = await bcrypt.hash(password, 10);
  const newUser = {
    id: uuidv4(),
    username,
    password: hashed,
    role: role || 'viewer',
    email: email || '',
    fullName: fullName || '',
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  writeData('users.json', users);
  const { password: _, ...safe } = newUser;
  res.status(201).json(safe);
});

router.put('/:id', requireAdmin, async (req, res) => {
  const users = readData('users.json');
  const idx = users.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'User not found' });

  const { username, password, role, email, fullName } = req.body;
  if (username) users[idx].username = username;
  if (role) users[idx].role = role;
  if (email !== undefined) users[idx].email = email;
  if (fullName !== undefined) users[idx].fullName = fullName;
  if (password) users[idx].password = await bcrypt.hash(password, 10);

  writeData('users.json', users);
  const { password: _, ...safe } = users[idx];
  res.json(safe);
});

router.delete('/:id', requireAdmin, (req, res) => {
  if (req.params.id === '1') return res.status(403).json({ message: 'Cannot delete default admin' });
  const users = readData('users.json');
  const filtered = users.filter((u) => u.id !== req.params.id);
  if (filtered.length === users.length) return res.status(404).json({ message: 'User not found' });
  writeData('users.json', filtered);
  res.json({ message: 'User deleted' });
});

export default router;
