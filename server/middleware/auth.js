const jwt = require('jsonwebtoken');
const { db } = require('../database/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Check if user has required role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (Array.isArray(roles)) {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
    } else {
      if (req.user.role !== roles) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
    }

    next();
  };
};

// Check if user is admin
const requireAdmin = requireRole('admin');

// Check if user is teacher or admin
const requireTeacherOrAdmin = requireRole(['teacher', 'admin']);

// Check if user is student, parent, or admin
const requireStudentParentOrAdmin = requireRole(['student', 'parent', 'admin']);

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireTeacherOrAdmin,
  requireStudentParentOrAdmin
}; 