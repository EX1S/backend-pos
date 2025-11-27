const { Router } = require("express");
const pool = require("../db/connection");
const auth = require("../middleware/authMiddleware");

const router = Router();

/*
   POST /api/ventas
   Registrar venta con transacción
*/
router.post("/", auth, async (req, res) => {
  const { items, total } = req.body;

  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: "No hay productos en la venta" });

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const usuarioId = req.user?.id;

    //Crear venta principal
    const venta = await client.query(
      `INSERT INTO ventas (usuario_id, total, fecha)
       VALUES ($1, $2, NOW())
       RETURNING id, fecha`,
      [usuarioId, total]
    );

    const venta_id = venta.rows[0].id;

    //Insertar cada producto
    for (const it of items) {
      const { producto_id, cantidad, precio } = it;

      if (!producto_id || cantidad <= 0 || precio <= 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Datos de producto inválidos" });
      }

      const subtotal = Number(cantidad) * Number(precio);

      await client.query(
        `INSERT INTO detalle_venta
         (venta_id, producto_id, cantidad, precio, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [venta_id, producto_id, cantidad, precio, subtotal]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      id: venta_id,
      total,
      fecha: venta.rows[0].fecha,
    });

  } catch (e) {
    await client.query("ROLLBACK");

    console.error("Error al registrar venta:", e);

    if (e.message?.includes("Existencia insuficiente")) {
      return res.status(400).json({ error: "Existencia insuficiente" });
    }

    res.status(500).json({ error: "Error del servidor" });
  } finally {
    client.release();
  }
});

/*    GET /api/ventas/diarias
   Ventas agrupadas por día
*/
router.get("/diarias", auth, async (req, res) => {
  try {
    const q = `
      SELECT 
        DATE(fecha) AS dia,
        COUNT(*) AS num_ventas,
        SUM(total)::numeric(12,2) AS total_dia
      FROM ventas
      GROUP BY 1
      ORDER BY 1 DESC;
    `;

    const r = await pool.query(q);
    res.json(r.rows);

  } catch (e) {
    console.error("Error GET /ventas/diarias:", e);
    res.status(500).json({ error: "Error del servidor" });
  }
});

module.exports = router;
