const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Acceso denegado, token faltante' });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified; //  id, email, rol, nombre 
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
}

module.exports = authMiddleware;
