const db = require('../config/db');

// GET /api/products
exports.getAllProducts = async (req, res) => {
  try {
    const userId = req.userId || req.query.userId;
    const storeId = req.query.storeId;

    let queryText = `SELECT id, user_id, store_id, nama, harga, harga_modal, stok, kategori,
                            batch_size, satuan, is_bundle, image_url, description, barcode,
                            min_stock_level, original_price, created_at, updated_at
                     FROM products`;
    const params = [];

    if (userId && storeId) {
      queryText += ' WHERE user_id = $1 AND store_id = $2';
      params.push(userId, storeId);
    } else if (userId) {
      queryText += ' WHERE user_id = $1';
      params.push(userId);
    }

    queryText += ' ORDER BY created_at ASC';

    const { rows } = await db.query(queryText, params);
    res.status(200).json({
      status: 'success',
      results: rows.length,
      data: { products: rows }
    });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// POST /api/products
exports.createProduct = async (req, res) => {
  try {
    const {
      userId,
      storeId,
      nama,
      harga,
      harga_modal,
      stok,
      kategori,
      batch_size,
      satuan,
      image_url,
      description,
      barcode,
      min_stock_level,
      original_price
    } = req.body;

    if (!userId || !nama || harga == null) {
      return res.status(400).json({ status: 'fail', message: 'userId, nama, dan harga wajib diisi' });
    }

    const insertQuery = `
      INSERT INTO products (
        user_id, store_id, nama, harga, harga_modal, stok, kategori,
        batch_size, satuan, image_url, description, barcode,
        min_stock_level, original_price
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14
      )
      RETURNING id, user_id, store_id, nama, harga, harga_modal, stok, kategori,
                batch_size, satuan, is_bundle, image_url, description, barcode,
                min_stock_level, original_price, created_at, updated_at;
    `;

    const values = [
      userId,
      storeId || null,
      nama,
      harga,
      harga_modal || 0,
      stok || 0,
      kategori || 'Umum',
      batch_size || 1,
      satuan || 'pcs',
      image_url || null,
      description || null,
      barcode || null,
      min_stock_level || 1,
      original_price || null
    ];

    const { rows } = await db.query(insertQuery, values);

    res.status(201).json({
      status: 'success',
      data: { product: rows[0] }
    });
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// PUT /api/products/:id
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nama,
      harga,
      harga_modal,
      stok,
      kategori,
      batch_size,
      satuan,
      image_url,
      description,
      barcode,
      min_stock_level,
      original_price
    } = req.body;

    const updateQuery = `
      UPDATE products
      SET
        nama = COALESCE($1, nama),
        harga = COALESCE($2, harga),
        harga_modal = COALESCE($3, harga_modal),
        stok = COALESCE($4, stok),
        kategori = COALESCE($5, kategori),
        batch_size = COALESCE($6, batch_size),
        satuan = COALESCE($7, satuan),
        image_url = COALESCE($8, image_url),
        description = COALESCE($9, description),
        barcode = COALESCE($10, barcode),
        min_stock_level = COALESCE($11, min_stock_level),
        original_price = COALESCE($12, original_price),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
      RETURNING id, user_id, store_id, nama, harga, harga_modal, stok, kategori,
                batch_size, satuan, is_bundle, image_url, description, barcode,
                min_stock_level, original_price, created_at, updated_at;
    `;

    const values = [
      nama,
      harga,
      harga_modal,
      stok,
      kategori,
      batch_size,
      satuan,
      image_url,
      description,
      barcode,
      min_stock_level,
      original_price,
      id
    ];

    const { rows } = await db.query(updateQuery, values);

    if (rows.length === 0) {
      return res.status(404).json({ status: 'fail', message: 'Produk tidak ditemukan' });
    }

    res.status(200).json({
      status: 'success',
      data: { product: rows[0] }
    });
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// DELETE /api/products/:id
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const { rowCount } = await db.query('DELETE FROM products WHERE id = $1', [id]);

    if (rowCount === 0) {
      return res.status(404).json({ status: 'fail', message: 'Produk tidak ditemukan' });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};