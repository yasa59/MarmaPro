// server/middleware/auth.js
const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  try {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'No token' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userId = payload.userId || payload.id || payload._id;
    if (!userId) return res.status(401).json({ message: 'Invalid token payload' });

    req.user = {
      userId,
      role: payload.role,
      email: payload.email,
      name: payload.name,
    };
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// Generic role guard
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user?.role || req.user.role !== role) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}

// Any signed-in user (regardless of role)
function requireUser(req, res, next) {
  if (!req.user?.userId) return res.status(401).json({ message: 'Unauthorized' });
  next();
}

const requireAdmin    = requireRole('admin');
const requireDoctor   = requireRole('doctor');
const requireUserRole = requireRole('user'); // exactly role "user"

module.exports = {
  verifyToken,
  requireRole,
  requireUser,     // any logged-in user
  requireAdmin,    // admin only
  requireDoctor,   // doctor only
  requireUserRole, // user role only
};
