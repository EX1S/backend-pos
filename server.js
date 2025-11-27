const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Configurar CORS para permitir conexión desde el frontend
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Recibir JSON
app.use(express.json());

// Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/ventas', require('./routes/ventas'));
app.use('/api/reportes', require('./routes/reportes'));

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', port: process.env.PORT });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ API lista en puerto ${PORT}`);
});
