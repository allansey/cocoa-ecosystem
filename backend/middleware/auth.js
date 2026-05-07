const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkey');
    req.user = decoded; // { userId, role }
    next();
  } catch (ex) {
    res.status(400).json({ error: 'Invalid token.' });
  }
};

const farmerRoleMiddleware = (req, res, next) => {
  if (req.user?.role !== 'FARMER') {
    return res.status(403).json({ error: 'Access denied. Only FARMERS can perform this action.' });
  }
  next();
};

module.exports = { authMiddleware, farmerRoleMiddleware };
