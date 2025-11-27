const { Pool } = require("pg");

// Railway usa DATABASE_URL
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false, 
  },
  max: 10,          // conexiones máximas
  idleTimeoutMillis: 30000, 
  connectionTimeoutMillis: 2000, 
});

//Log de conexión
pool
  .connect()
  .then((client) => {
    return client
      .query("SELECT NOW()")
      .then((res) => {
        console.log("PostgreSQL conectado:", res.rows[0].now);
        client.release();
      })
      .catch((err) => {
        client.release();
        console.error("Error en consulta inicial:", err.message);
      });
  })
  .catch((err) => console.error("Error conectando a PostgreSQL:", err.message));

module.exports = pool;
