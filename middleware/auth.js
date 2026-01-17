const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../config/constants');

const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user.userType !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }
  next();
};

const requireONG = (req, res, next) => {
  if (req.user.userType !== 'ong' && req.user.userType !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas ONGs.' });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireONG
};
