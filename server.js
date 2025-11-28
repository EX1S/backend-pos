const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

/* CORS PRODUCCIÓN + LOCAL (VERSIÓN ESTABLE) */
const allowedOrigins = [
  "http://localhost:3000",
  "https://frontend-pos-teal.vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir peticiones internas o sin origin (Postman, Railway, Vercel prefetch)
      if (!origin) return callback(null, true);

      // Permitir orígenes válidos
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Permitir peticiones de producción sin origin definido
      if (origin.includes("vercel.app")) return callback(null, true);

      console.log("❌ CORS bloqueado para origen:", origin);
      return callback(new Error("CORS bloqueado"));
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  })
);

/* RECIBIR JSON */
app.use(express.json());

/* RUTAS */
app.use("/api/auth", require("./routes/auth"));
app.use("/api/productos", require("./routes/productos"));
app.use("/api/ventas", require("./routes/ventas"));
app.use("/api/reportes", require("./routes/reportes"));

/* HEALTH CHECK */
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", port: process.env.PORT });
});

/* INICIAR SERVIDOR */
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 API corriendo en puerto ${PORT}`);
});
