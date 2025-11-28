const { Router } = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db/connection');
const auth = require('../middleware/authMiddleware');

const router = Router();

/* ============================================
   POST /api/auth/login
   Login con comparación de contraseña en texto plano
   ============================================ */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email?.trim() || !password) {
    return res.status(400).json({ error: 'Email y password requeridos' });
  }

  try {
    const emailLower = email.toLowerCase().trim();

    const q = `
      SELECT id, nombre, email, password
      FROM usuarios
      WHERE LOWER(email)=LOWER($1)
      LIMIT 1
    `;
    const r = await pool.query(q, [emailLower]);

    if (r.rowCount === 0)
      return res.status(401).json({ error: 'Credenciales inválidas' });

    const user = r.rows[0];

    // Comparación simple (texto plano)
    const ok = password === user.password;
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

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

/* ============================================
   GET /api/auth/me
   Verificar usuario logueado
   ============================================ */
router.get('/me', auth, async (req, res) => {
  const { id } = req.user;

  try {
    const r = await pool.query(
      'SELECT id, nombre, email FROM usuarios WHERE id=$1',
      [id]
    );

    if (!r.rowCount)
      return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json(r.rows[0]);

  } catch (e) {
    console.error('Error en /me:', e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/* ============================================
   ⚠️ RUTA TEMPORAL DE EMERGENCIA
   Restablece la contraseña para pruebas en producción.
   Úsala SOLO para entrar la primera vez.
   Luego ELIMÍNALA.
   ============================================ */
router.get("/reset-password", async (req, res) => {
  try {
    const email = "dede117gamer@gmail.com";  // cambia aquí si ocupas otro user
    const nueva = "123456";                 // contraseña temporal

    await pool.query(
      "UPDATE usuarios SET password = $1 WHERE email = $2",
      [nueva, email]
    );

    res.json({
      ok: true,
      msg: "Contraseña actualizada a 123456 (texto plano)"
    });

  } catch (e) {
    console.error("Error reset-password:", e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
