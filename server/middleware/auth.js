import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'networkmap-secret-key-2024';

export function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const token = auth.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

export function requireEditor(req, res, next) {
  if (!['admin', 'editor'].includes(req.user?.role)) {
    return res.status(403).json({ message: 'Editor or Admin access required' });
  }
  next();
}
