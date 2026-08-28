const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

  const secrets = [
    process.env.JWT_SECRET,
    'devsecret',
    'supersecretjwtkey'
  ].filter(Boolean);

  let decoded = null;
  for (const secret of secrets) {
    try {
      decoded = jwt.verify(token, secret);
      if (decoded) break;
    } catch (e) {
      // try next secret
    }
  }

  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }

  req.user = decoded; // { userId, role }
  next();
};

const farmerRoleMiddleware = (req, res, next) => {
  if (req.user?.role !== 'FARMER') {
    return res.status(403).json({ error: 'Access denied. Only FARMERS can perform this action.' });
  }
  next();
};

module.exports = { authMiddleware, farmerRoleMiddleware };
