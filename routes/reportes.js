const { Router } = require("express");
const pool = require("../db/connection");
const auth = require("../middleware/authMiddleware");

const router = Router();

/*
   GET /api/reportes/ventas?inicio=YYYY-MM-DD&fin=YYYY-MM-DD
*/
router.get("/ventas", auth, async (req, res) => {
  try {
    const { inicio, fin } = req.query;

    if (!inicio || !fin)
      return res.status(400).json({ error: "Debes enviar fechas inicio y fin" });

    if (isNaN(Date.parse(inicio)) || isNaN(Date.parse(fin)))
      return res.status(400).json({ error: "Formato de fecha inválido" });

    if (new Date(inicio) > new Date(fin))
      return res.status(400).json({ error: "La fecha inicio no puede ser mayor que fin" });

    const query = `
      SELECT 
        id,
        usuario_id,
        total,
        creado_en::date AS fecha
      FROM ventas
      WHERE creado_en::date BETWEEN $1 AND $2
      ORDER BY creado_en ASC;
    `;

    const result = await pool.query(query, [inicio, fin]);

    return res.json({ ventas: result.rows });

  } catch (error) {
    console.error("Error en reporte de ventas:", error);
    res.status(500).json({ error: "Error al generar el reporte" });
  }
});

/* 
   GET /api/reportes/mas-vendidos
 */
router.get("/mas-vendidos", auth, async (req, res) => {
  try {
    const { inicio, fin } = req.query;

    if (!inicio || !fin)
      return res.status(400).json({ error: "Debes enviar fechas inicio y fin" });

    if (isNaN(Date.parse(inicio)) || isNaN(Date.parse(fin)))
      return res.status(400).json({ error: "Formato de fecha inválido" });

    if (new Date(inicio) > new Date(fin))
      return res.status(400).json({ error: "La fecha inicio no puede ser mayor que fin" });

    const query = `
      SELECT 
        p.nombre,
        SUM(d.cantidad) AS cantidad_vendida,
        SUM(d.subtotal) AS total_generado
      FROM detalle_venta d
      INNER JOIN productos p ON p.id = d.producto_id
      INNER JOIN ventas v ON v.id = d.venta_id
      WHERE v.creado_en::date BETWEEN $1 AND $2
      GROUP BY p.nombre
      ORDER BY cantidad_vendida DESC;
    `;

    const result = await pool.query(query, [inicio, fin]);

    return res.json({ productos: result.rows });

  } catch (error) {
    console.error("Error en reporte productos más vendidos:", error);
    res.status(500).json({ error: "Error al generar el reporte" });
  }
});

/*
   GET /api/reportes/inventario
*/
router.get("/inventario", auth, async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id,
        p.nombre,
        p.precio,
        i.existencia
      FROM productos p
      INNER JOIN inventario i ON i.producto_id = p.id
      ORDER BY p.nombre ASC;
    `;

    const result = await pool.query(query);

    return res.json({ inventario: result.rows });

  } catch (error) {
    console.error("Error en reporte inventario:", error);
    return res.status(500).json({ error: "Error al generar el reporte" });
  }
});

module.exports = router;
