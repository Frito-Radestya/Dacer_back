-- ========================================
-- DagangCerdas Database Schema (PostgreSQL - Neon Friendly)
-- Tanpa RLS / ROLE, dengan IF NOT EXISTS
-- ========================================

-- Enable UUID extension (aman jika sudah ada)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. USERS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    subscription_status VARCHAR(50) DEFAULT 'free',
    subscription_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 2. STORES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS stores (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    description TEXT,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    total_sales INTEGER DEFAULT 0,
    total_revenue DECIMAL(15,2) DEFAULT 0.00,
    total_profit DECIMAL(15,2) DEFAULT 0.00,
    total_products INTEGER DEFAULT 0,
    last_sale_date TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 3. PRODUCTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    store_id INTEGER REFERENCES stores(id) ON DELETE SET NULL,
    nama VARCHAR(255) NOT NULL,
    harga DECIMAL(10,2) NOT NULL,
    harga_modal DECIMAL(10,2) DEFAULT 0.00,
    stok INTEGER DEFAULT 0,
    kategori VARCHAR(100) DEFAULT 'Umum',
    batch_size INTEGER DEFAULT 1,
    satuan VARCHAR(50) DEFAULT 'pcs',
    is_bundle BOOLEAN DEFAULT FALSE,
    image_url VARCHAR(500),
    description TEXT,
    barcode VARCHAR(100),
    min_stock_level INTEGER DEFAULT 1,
    original_price DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 4. SALES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    store_id INTEGER REFERENCES stores(id) ON DELETE SET NULL,
    order_id VARCHAR(255) UNIQUE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    total_items INTEGER NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'tunai',
    payment_status VARCHAR(50) DEFAULT 'completed',
    customer_info JSONB,
    items JSONB NOT NULL,
    midtrans_token VARCHAR(500),
    midtrans_redirect_url VARCHAR(500),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 5. TRANSACTIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    store_id INTEGER REFERENCES stores(id) ON DELETE SET NULL,
    sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    reference_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 6. DEBTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS debts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    store_id INTEGER REFERENCES stores(id) ON DELETE SET NULL,
    customer_id INTEGER,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    customer_address TEXT,
    total_amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) DEFAULT 0.00,
    remaining_amount DECIMAL(10,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
    status VARCHAR(50) DEFAULT 'unpaid',
    due_date DATE,
    notes TEXT,
    last_payment_date TIMESTAMP,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 7. DEBT PAYMENTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS debt_payments (
    id SERIAL PRIMARY KEY,
    debt_id INTEGER REFERENCES debts(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'cash',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 8. CUSTOMERS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    nama VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    notes TEXT,
    total_debt_amount DECIMAL(10,2) DEFAULT 0.00,
    total_paid_amount DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 9. NOTIFICATIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    sale_id INTEGER REFERENCES sales(id) ON DELETE SET NULL,
    debt_id INTEGER REFERENCES debts(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT FALSE,
    is_persistent BOOLEAN DEFAULT FALSE,
    action_text VARCHAR(100),
    action_url VARCHAR(500),
    metadata JSONB,
    read_at TIMESTAMP,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 10. PROMOTIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS promotions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type VARCHAR(50) NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2) NOT NULL,
    discounted_price DECIMAL(10,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    min_order_quantity INTEGER DEFAULT 1,
    max_usage INTEGER,
    current_usage INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 11. STORE_STATS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS store_stats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_sales INTEGER DEFAULT 0,
    total_revenue DECIMAL(15,2) DEFAULT 0.00,
    total_profit DECIMAL(15,2) DEFAULT 0.00,
    unique_customers INTEGER DEFAULT 0,
    top_selling_products JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, store_id, date)
);

-- ========================================
-- INDEXES (IF NOT EXISTS)
-- ========================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

CREATE INDEX IF NOT EXISTS idx_promotions_user_id ON promotions(user_id);
CREATE INDEX IF NOT EXISTS idx_promotions_product_id ON promotions(product_id);
CREATE INDEX IF NOT EXISTS idx_promotions_is_active ON promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_promotions_tanggal ON promotions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_products_nama ON products(nama);

CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_store_id ON sales(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_timestamp ON sales(timestamp);
CREATE INDEX IF NOT EXISTS idx_sales_order_id ON sales(order_id);
CREATE INDEX IF NOT EXISTS idx_sales_payment_status ON sales(payment_status);

CREATE INDEX IF NOT EXISTS idx_debts_user_id ON debts(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_store_id ON debts(store_id);
CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);
CREATE INDEX IF NOT EXISTS idx_debts_timestamp ON debts(timestamp);
CREATE INDEX IF NOT EXISTS idx_debts_customer_name ON debts(customer_name);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON notifications(timestamp);

CREATE INDEX IF NOT EXISTS idx_store_stats_user_id ON store_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_store_stats_store_id ON store_stats(store_id);
CREATE INDEX IF NOT EXISTS idx_store_stats_date ON store_stats(date);

-- ========================================
-- TRIGGERS (tanpa RLS)
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stores_updated_at
BEFORE UPDATE ON stores
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_debts_updated_at
BEFORE UPDATE ON debts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promotions_updated_at
BEFORE UPDATE ON promotions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION update_store_stats_on_sale()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE stores 
    SET 
        total_sales = total_sales + 1,
        total_revenue = total_revenue + NEW.total_amount,
        last_sale_date = NEW.created_at,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.store_id AND user_id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER store_stats_on_sale
AFTER INSERT ON sales
FOR EACH ROW EXECUTE FUNCTION update_store_stats_on_sale();

CREATE OR REPLACE FUNCTION update_store_product_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE stores 
        SET total_products = total_products + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.store_id AND user_id = NEW.user_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE stores 
        SET total_products = total_products - 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.store_id AND user_id = OLD.user_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER store_product_count_change
AFTER INSERT OR DELETE ON products
FOR EACH ROW EXECUTE FUNCTION update_store_product_count();

-- ========================================
-- VIEWS
-- ========================================

CREATE OR REPLACE VIEW products_with_stock_status AS
SELECT 
    p.*,
    CASE 
        WHEN p.stok = 0 THEN 'stok_habis'
        WHEN p.stok <= (p.batch_size * 0.5) THEN 'stok_menipis'
        WHEN p.stok >= (p.batch_size * 5) THEN 'stok_berlebih'
        ELSE 'stok_normal'
    END as stock_status
FROM products p;

CREATE OR REPLACE VIEW debts_with_summary AS
SELECT 
    d.id,
    d.user_id,
    d.store_id,
    d.customer_id,
    d.customer_name,
    d.customer_phone,
    d.customer_address,
    d.total_amount,
    d.paid_amount,
    d.remaining_amount,
    d.status,
    d.due_date,
    d.notes,
    d.last_payment_date,
    d.timestamp,
    d.created_at,
    d.updated_at,
    c.nama as customer_nama,
    (SELECT COALESCE(SUM(amount), 0) FROM debt_payments WHERE debt_id = d.id) as total_paid,
    d.total_amount - COALESCE((SELECT SUM(amount) FROM debt_payments WHERE debt_id = d.id), 0) as remaining_balance
FROM debts d
LEFT JOIN customers c ON d.customer_id = c.id;

CREATE OR REPLACE VIEW today_sales AS
SELECT 
    s.*,
    p.nama as product_name,
    p.harga as product_price
FROM sales s
LEFT JOIN jsonb_array_elements(s.items) as item ON true
LEFT JOIN products p ON item->>'id' = p.id::text
WHERE DATE(s.timestamp) = CURRENT_DATE;
