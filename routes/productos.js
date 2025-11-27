const { Router } = require('express');
const pool = require('../db/connection');
const auth = require('../middleware/authMiddleware');

const router = Router();

/*
   GET /api/productos
   Obtener todos los productos con inventario
 */
router.get('/', auth, async (req, res) => {
  try {
    const q = `
      SELECT 
        p.id, p.nombre, p.unidad, p.precio, p.activo,
        COALESCE(i.existencia, 0) AS existencia,
        to_char(p.actualizado_en, 'YYYY-MM-DD HH24:MI:SS') AS actualizado_en
      FROM productos p
      LEFT JOIN inventario i ON i.producto_id = p.id
      ORDER BY p.nombre;
    `;
    const r = await pool.query(q);
    res.json(r.rows);
  } catch (e) {
    console.error("Error GET /productos:", e);
    res.status(500).json({ error: "Error del servidor" });
  }
});

/*
   GET /api/productos/:id
   Obtener un producto específico
*/
router.get('/:id', auth, async (req, res) => {
  try {
    const r = await pool.query(
      `
      SELECT p.*, COALESCE(i.existencia,0) AS existencia
      FROM productos p 
      LEFT JOIN inventario i ON i.producto_id = p.id
      WHERE p.id=$1
      `,
      [req.params.id]
    );

    if (!r.rowCount)
      return res.status(404).json({ error: "No encontrado" });

    res.json(r.rows[0]);
  } catch (e) {
    console.error("Error GET /productos/:id:", e);
    res.status(500).json({ error: "Error del servidor" });
  }
});

/*
   POST /api/productos
   Crear producto + inventario (con transacción)
*/
router.post('/', auth, async (req, res) => {
  const client = await pool.connect();

  try {
    const { nombre, unidad, precio, existencia = 0 } = req.body;

    if (!nombre?.trim() || !unidad || precio == null)
      return res.status(400).json({ error: "nombre, unidad, precio son requeridos" });

    if (!["kg", "pieza"].includes(unidad))
      return res.status(400).json({ error: "unidad inválida (kg|pieza)" });

    await client.query("BEGIN");

    //Insertar producto
    const r = await client.query(
      `
        INSERT INTO productos (nombre, unidad, precio, activo)
        VALUES ($1, $2, $3, TRUE)
        RETURNING id, nombre, unidad, precio, activo
      `,
      [nombre.trim(), unidad, precio]
    );

    const productoId = r.rows[0].id;

    //Insertar inventario
    await client.query(
      `
      INSERT INTO inventario (producto_id, existencia)
      VALUES ($1, $2)
      ON CONFLICT (producto_id) DO UPDATE
      SET existencia = EXCLUDED.existencia
      `,
      [productoId, existencia]
    );

    await client.query("COMMIT");

    res.status(201).json({ ...r.rows[0], existencia });

  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Error POST /productos:", e);

    if (e.code === "23505")
      return res.status(409).json({ error: "El nombre ya existe" });

    res.status(500).json({ error: "Error del servidor" });
  } finally {
    client.release();
  }
});

/*   PATCH /api/productos/:id
   Actualizar parcialmente un producto
*/
router.patch('/:id', auth, async (req, res) => {
  try {
    const { precio, activo } = req.body;

    const r = await pool.query(
      `
      UPDATE productos
      SET 
        precio = COALESCE($1, precio),
        activo = COALESCE($2, activo),
        actualizado_en = NOW()
      WHERE id=$3
      RETURNING id, nombre, unidad, precio, activo
      `,
      [precio, activo, req.params.id]
    );

    if (!r.rowCount)
      return res.status(404).json({ error: "No encontrado" });

    res.json(r.rows[0]);
  } catch (e) {
    console.error("Error PATCH /productos/:id:", e);
    res.status(500).json({ error: "Error del servidor" });
  }
});

/* 
   PUT /api/productos/:id
   Actualizar totalmente un producto + inventario
*/
router.put('/:id', auth, async (req, res) => {
  const client = await pool.connect();

  try {
    const { nombre, unidad, precio, existencia, activo } = req.body;

    if (!nombre?.trim() || !unidad || precio == null || existencia == null)
      return res.status(400).json({ error: "nombre, unidad, precio, existencia son requeridos" });

    if (!["kg", "pieza"].includes(unidad))
      return res.status(400).json({ error: "unidad inválida (kg|pieza)" });

    await client.query("BEGIN");

    // Actualizar producto
    const r = await client.query(
      `
      UPDATE productos
      SET 
        nombre=$1,
        unidad=$2,
        precio=$3,
        activo=$4,
        actualizado_en = NOW()
      WHERE id=$5
      RETURNING id, nombre, unidad, precio, activo
      `,
      [nombre.trim(), unidad, precio, activo, req.params.id]
    );

    if (!r.rowCount)
      return res.status(404).json({ error: "Producto no encontrado" });

    // Actualizar inventario
    await client.query(
      `UPDATE inventario SET existencia=$1 WHERE producto_id=$2`,
      [existencia, req.params.id]
    );

    await client.query("COMMIT");

    res.json({ ...r.rows[0], existencia });

  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Error PUT /productos/:id:", e);
    res.status(500).json({ error: "Error del servidor" });
  } finally {
    client.release();
  }
});

/*
   DELETE /api/productos/:id
   Eliminar producto + inventario
*/
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query("DELETE FROM inventario WHERE producto_id=$1", [req.params.id]);

    const r = await pool.query(
      "DELETE FROM productos WHERE id=$1 RETURNING *",
      [req.params.id]
    );

    if (!r.rowCount)
      return res.status(404).json({ error: "Producto no encontrado" });

    res.json({ message: "Producto eliminado correctamente" });

  } catch (e) {
    console.error("Error DELETE /productos/:id:", e);
    res.status(500).json({ error: "Error del servidor" });
  }
});

module.exports = router;
