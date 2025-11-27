const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

/*CORS PRODUCCIÓN + LOCAL*/

const allowedOrigins = [
  "http://localhost:3000",
  "https://frontend-pos-teal.vercel.app" 
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir peticiones internas (sin origen), como Postman
      if (!origin) return callback(null, true);

      // Revisar si el dominio está permitido
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        console.log("❌ CORS bloqueado para origen:", origin);
        return callback(new Error("CORS bloqueado"));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

/*RECIBIR JSON*/
app.use(express.json());

/*RUTAS*/
app.use('/api/auth', require('./routes/auth'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/ventas', require('./routes/ventas'));
app.use('/api/reportes', require('./routes/reportes'));

/*HEALTH CHECK*/
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', port: process.env.PORT });
});

/*INICIAR SERVIDOR*/
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ API lista en puerto ${PORT}`);
});
