const { Router } = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db/connection');
const auth = require('../middleware/authMiddleware');
const bcrypt = require('bcryptjs');

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email?.trim() || !password) {
    return res.status(400).json({ error: 'Email y password requeridos' });
  }

  try {
    const emailLower = email.toLowerCase().trim();

    const q = `
      SELECT id, nombre, email, password_hash
      FROM usuarios
      WHERE LOWER(email)=LOWER($1)
      LIMIT 1
    `;
    const r = await pool.query(q, [emailLower]);

    if (r.rowCount === 0)
      return res.status(401).json({ error: 'Credenciales inválidas' });

    const user = r.rows[0];

    // Comparar hash real
    const ok = await bcrypt.compare(password, user.password_hash);

    if (!ok)
      return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        nombre: user.nombre
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      usuario: {
        id: user.id,
        email: user.email,
        nombre: user.nombre
      },
    });

  } catch (e) {
    console.error('Error en login:', e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});


// Ruta temporal para resetear contraseña
router.get('/reset-password', async (req, res) => {
  try {
    const nueva = await bcrypt.hash("123456", 10);

    await pool.query(`
      UPDATE usuarios
      SET password_hash=$1
      WHERE email='dede117gamer@gmail.com'
    `, [nueva]);

    res.json({ ok: true, msg: "Contraseña cambiada a 123456" });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
