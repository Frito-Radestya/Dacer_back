# ERD DagangCerdas - Entity Relationship Diagram

## Overview

DagangCerdas menggunakan PostgreSQL dengan arsitektur **multi-tenant**. Hampir semua data bisnis di-scope oleh `user_id` (dan `store_id`) sehingga setiap user hanya melihat datanya sendiri.

Total ada **14 tabel** utama + support, beberapa **trigger**, dan beberapa **view** untuk laporan.

Di bawah ini penjelasan per tabel, relasi, serta trigger & views yang aktif.

---

## 1. Tabel Utama Bisnis

### 1.1. `users` (Master User)
- **id** (PK) – ID user
- **email** (UNIQUE) – Email login
- **password_hash** – Hash password
- **name**, **phone**
- **role** – `admin` / `user`
- **is_active**
- **last_login**
- **subscription_status**, **subscription_expires_at**
- **created_at**, **updated_at**

Relasi:
- 1 user → banyak **stores**, **products**, **sales**, **debts**, **customers**, **notifications**, **promotions**, **store_stats**, **transactions**, **user_sessions**, **admin_logs**.

---

### 1.2. `stores` (Toko)
- **id** (PK)
- **user_id** (FK → `users.id`)
- **name**, **owner_name**
- **address**, **phone**, **email**
- **location_lat**, **location_lng**
- **total_sales**, **total_revenue**, **total_profit**, **total_products**
- **last_sale_date**, **is_active**
- **created_at**, **updated_at**

Relasi:
- 1 store → banyak **products**, **sales**, **debts**, **transactions**, **store_stats**.

---

### 1.3. `products` (Produk)
- **id** (PK)
- **user_id** (FK → `users.id`)
- **store_id** (FK → `stores.id`)
- **nama**, **harga**, **harga_modal**
- **stok**, **kategori**, **batch_size**, **satuan**
- **is_bundle**, **image_url**, **description**, **barcode**
- **min_stock_level**, **original_price**
- **created_at**, **updated_at**

Relasi:
- 1 produk → bisa punya banyak **promotions**
- Dipakai di `sales.items` (JSONB) dan `notifications.product_id`.

---

### 1.4. `sales` (Penjualan)
- **id** (PK)
- **user_id** (FK → `users.id`)
- **store_id** (FK → `stores.id`)
- **order_id** (UNIQUE)
- **total_amount**, **total_items**
- **payment_method** – `tunai`, `qris`, `transfer`, dll.
- **payment_status** – `pending`, `completed`, `failed`
- **customer_info** (JSONB)
- **items** (JSONB) – daftar item (id produk, qty, harga, subtotal, dll.)
- **midtrans_token**, **midtrans_redirect_url**
- **timestamp**, **created_at**

Relasi:
- 1 sale → banyak **transactions** (via `transactions.sale_id`)
- Direferensikan oleh `notifications.sale_id`.

---

### 1.5. `transactions` (Log Transaksi Umum)
- **id** (PK)
- **user_id** (FK → `users.id`)
- **store_id** (FK → `stores.id`)
- **sale_id** (FK → `sales.id`)
- **type** – `sale`, `purchase`, `adjustment`, `payment`
- **amount**
- **description**
- **reference_id** – ID referensi eksternal
- **status** – default `completed`
- **created_at**

Relasi:
- 1 sale → bisa punya banyak `transactions` sebagai log keuangan tambahan.

---

### 1.6. `debts` (Hutang Pelanggan)
- **id** (PK)
- **user_id** (FK → `users.id`)
- **store_id** (FK → `stores.id`)
- **customer_id** (opsional FK → `customers.id`)
- **customer_name**, **customer_phone**, **customer_address**
- **total_amount**, **paid_amount**
- **remaining_amount** – kolom **GENERATED** = `total_amount - paid_amount`
- **status** – `unpaid`, `partially_paid`, `paid`
- **due_date**
- **notes**
- **last_payment_date**
- **timestamp**, **created_at**, **updated_at**

Relasi:
- 1 debt → banyak **debt_payments**
- Direferensikan oleh `notifications.debt_id`.

---

### 1.7. `debt_payments` (Pembayaran Hutang)
- **id** (PK)
- **debt_id** (FK → `debts.id`)
- **user_id** (FK → `users.id`)
- **amount**
- **payment_method** – `cash`, `qris`, dll.
- **notes**
- **created_at**

Relasi:
- 1 debt → banyak debt_payments (riwayat cicilan / pelunasan).

---

### 1.8. `customers` (Pelanggan)
- **id** (PK)
- **user_id** (FK → `users.id`)
- **nama**, **phone**, **address**
- **notes**
- **total_debt_amount**, **total_paid_amount**
- **is_active**
- **created_at**, **updated_at**

Relasi:
- 1 customer → banyak **debts** (melalui `debts.customer_id`).

---

### 1.9. `notifications` (Notifikasi)
- **id** (PK)
- **user_id** (FK → `users.id`)
- **type** – `stock-out`, `stock-low`, `product-added`, `transaction-success`, dll.
- **title**, **message**
- **product_id** (FK → `products.id`)
- **sale_id** (FK → `sales.id`)
- **debt_id** (FK → `debts.id`)
- **is_read**, **is_persistent**
- **action_text**, **action_url**
- **metadata** (JSONB)
- **read_at**, **timestamp**, **created_at**

Relasi:
- Menghubungkan peristiwa bisnis (stock, penjualan, hutang) dengan UI notifikasi.

---

### 1.10. `promotions` (Promo / Diskon)
- **id** (PK)
- **user_id** (FK → `users.id`)
- **product_id** (FK → `products.id`)
- **name**, **description**
- **discount_type** – `percentage` / `fixed`
- **discount_value**
- **original_price**, **discounted_price**
- **start_date**, **end_date**
- **min_order_quantity**
- **max_usage**, **current_usage**
- **is_active**
- **created_at**, **updated_at**

Relasi:
- 1 promo → 1 produk, tapi 1 produk bisa punya banyak promo (historis).

---

## 2. Tabel Support

### 2.1. `store_stats` (Statistik Harian Store)
- **id** (PK)
- **user_id** (FK → `users.id`)
- **store_id** (FK → `stores.id`)
- **date**
- **total_sales**, **total_revenue**, **total_profit**
- **unique_customers**
- **top_selling_products** (JSONB)
- **created_at**, **updated_at**
- **UNIQUE(user_id, store_id, date)** – satu record per hari & store.

Relasi:
- 1 store → banyak baris stats (per hari).

---

### 2.2. `user_sessions` (Session Auth)
- **id** (PK)
- **user_id** (FK → `users.id`)
- **session_token** (UNIQUE)
- **expires_at**
- **ip_address**, **user_agent**
- **is_active**
- **created_at**

Dipakai untuk manajemen session login di backend.

---

### 2.3. `user_permissions` (Role & Permission)
- **id** (PK)
- **role** – `admin` / `user`
- **permission** – nama permission
- **description**
- **created_at**
- **UNIQUE(role, permission)**

Berisi daftar hak akses per role.

---

### 2.4. `admin_logs` (Audit Trail Admin)
- **id** (PK)
- **admin_user_id** (FK → `users.id`)
- **action** – `create_user`, `delete_user`, dll.
- **target_user_id** (FK → `users.id`)
- **table_name**, **record_id**
- **old_values** (JSONB), **new_values** (JSONB)
- **ip_address**, **user_agent**
- **created_at**

Digunakan untuk melacak aktivitas admin yang sensitif.

---

## 3. Relasi Utama (Ringkas)

- **users → stores / products / sales / debts / customers / notifications / promotions / store_stats / transactions / user_sessions / admin_logs** (1:N)
- **stores → products / sales / debts / transactions / store_stats** (1:N)
- **customers → debts** (1:N)
- **debts → debt_payments** (1:N)
- **sales → transactions** (1:N)
- **products → promotions** (1:N historis)
- **products / sales / debts → notifications** (N:1 dari sisi notif).

Selain itu ada referensi tidak langsung:
- `sales.items` (JSONB) menyimpan ID produk
- `sales.customer_info` bisa menyimpan ID customer.

---

## 4. Trigger

### 4.1. `update_updated_at_column`
**Function:** `update_updated_at_column()`

Tujuan:
- Setiap **UPDATE** pada tabel tertentu, otomatis mengisi `updated_at = CURRENT_TIMESTAMP`.

Dipakai di tabel:
- `users`
- `stores`
- `products`
- `debts`
- `customers`
- `promotions`

Efek:
- Memudahkan tracking perubahan data tanpa harus set `updated_at` di kode Node.js.

---

### 4.2. `update_store_stats_on_sale`
**Function:** `update_store_stats_on_sale()`

Trigger:
- `AFTER INSERT ON sales`

Logika:
- Saat baris baru di `sales` dibuat:
  - `stores.total_sales += 1`
  - `stores.total_revenue += NEW.total_amount`
  - `stores.last_sale_date = NEW.created_at`
  - `stores.updated_at = NOW()`

Efek:
- Statistik store di tabel `stores` selalu up-to-date tanpa query agregat berat.

---

### 4.3. `update_store_product_count`
**Function:** `update_store_product_count()`

Trigger:
- `AFTER INSERT OR DELETE ON products`

Logika:
- Jika `INSERT` produk:
  - `stores.total_products += 1`
- Jika `DELETE` produk:
  - `stores.total_products -= 1`

Efek:
- Kolom `total_products` pada `stores` selalu sinkron dengan jumlah produk yang ada.

---

## 5. Views

Views dipakai untuk mempermudah query laporan tanpa harus tulis join kompleks di aplikasi.

### 5.1. `products_with_stock_status`

Isi:
- Semua kolom dari `products` + kolom tambahan `stock_status`:
  - `stok_habis` – jika `stok = 0`
  - `stok_menipis` – jika `stok <= batch_size * 0.5`
  - `stok_berlebih` – jika `stok >= batch_size * 5`
  - `stok_normal` – selain kondisi di atas

Kegunaan:
- Untuk dashboard stok & notifikasi low-stock / overstock.

---

### 5.2. `debts_with_summary`

Isi:
- Gabungan `debts` + data customer (`customers.nama`) + agregasi `debt_payments`:
  - `total_paid` – SUM(amount) dari `debt_payments`
  - `remaining_balance` – `total_amount - total_paid`

Kegunaan:
- Menampilkan daftar hutang lengkap beserta sisa saldo tanpa perlu banyak join & subquery di aplikasi.

---

### 5.3. `today_sales`

Isi:
- Data `sales` *hari ini* (`DATE(s.timestamp) = CURRENT_DATE`)
- Join ke `products` melalui `jsonb_array_elements(s.items)`
- Menambahkan:
  - `product_name` – `products.nama`
  - `product_price` – `products.harga`

Kegunaan:
- Laporan penjualan harian per produk.
- Bisa dipakai di Dashboard untuk summary hari ini.

---

## 6. Row-Level Security (RLS) & Roles

RLS diaktifkan untuk tabel:
- `products`, `sales`, `debts`, `stores`, `notifications`, `customers`, `promotions`, `store_stats`.

Kebijakan utama:
- Role **`application_user`**:
  - Policy `user_isolation*` memastikan hanya baris dengan `user_id = current_setting('app.current_user_id')` yang bisa diakses.
- Role **`admin_user`**:
  - Policy `admin_full_access*` mengizinkan akses ke semua baris (`USING (true)`).

Tujuan:
- Menjamin data antar user tidak tercampur, walaupun berada di satu database yang sama.

---

## 7. Ringkasan

Schema DagangCerdas mendukung:
- Manajemen produk & stok multi-toko
- Penjualan (tunai, QRIS via Midtrans, dll.)
- Hutang pelanggan + riwayat pembayaran
- Promo & diskon per produk
- Notifikasi terstruktur
- Statistik harian & analytics
- Session auth, role & permission, audit log admin
- Data isolation kuat dengan Row-Level Security

Dokumen ini bisa dipakai sebagai referensi:
- Saat menggambar ERD visual di draw.io / dbdiagram.io
- Saat menambah fitur backend (pastikan relasi & RLS tetap konsisten)
- Untuk dokumentasi teknis proyek DagangCerdas.
