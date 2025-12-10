-- ========================================
-- DagangCerdas Database Schema (PostgreSQL)
-- Multi-tenant Architecture dengan user_id sebagai primary key
-- ========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. USERS TABLE (Primary Table dengan Role-based Access)
-- ========================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Untuk authentication PostgreSQL
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) DEFAULT 'user', -- 'admin', 'user'
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    subscription_status VARCHAR(50) DEFAULT 'free', -- 'free', 'premium'
    subscription_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 2. STORES TABLE
-- ========================================
CREATE TABLE stores (
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
    -- Store Statistics (auto-calculated)
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
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    store_id INTEGER REFERENCES stores(id) ON DELETE SET NULL,
    nama VARCHAR(255) NOT NULL, -- Sesuai frontend: 'nama' bukan 'name'
    harga DECIMAL(10,2) NOT NULL, -- Sesuai frontend: 'harga' bukan 'price'
    harga_modal DECIMAL(10,2) DEFAULT 0.00, -- Sesuai frontend: 'harga_modal'
    stok INTEGER DEFAULT 0, -- Sesuai frontend: 'stok' bukan 'stock'
    kategori VARCHAR(100) DEFAULT 'Umum', -- Sesuai frontend: 'kategori'
    batch_size INTEGER DEFAULT 1, -- Sesuai frontend: 'batch_size'
    satuan VARCHAR(50) DEFAULT 'pcs', -- Sesuai frontend: 'satuan'
    is_bundle BOOLEAN DEFAULT FALSE,
    image_url VARCHAR(500),
    description TEXT,
    barcode VARCHAR(100),
    min_stock_level INTEGER DEFAULT 1,
    original_price DECIMAL(10,2), -- Untuk promosi/discount
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 4. SALES TABLE
-- ========================================
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    store_id INTEGER REFERENCES stores(id) ON DELETE SET NULL,
    order_id VARCHAR(255) UNIQUE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    total_items INTEGER NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'tunai', -- 'tunai', 'hutang', 'transfer', etc
    payment_status VARCHAR(50) DEFAULT 'completed', -- 'pending', 'completed', 'failed'
    customer_info JSONB, -- Customer data for sales
    items JSONB NOT NULL, -- Array of product items with quantities
    midtrans_token VARCHAR(500),
    midtrans_redirect_url VARCHAR(500),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Sesuai frontend: 'timestamp'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 5. TRANSACTIONS TABLE
-- ========================================
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    store_id INTEGER REFERENCES stores(id) ON DELETE SET NULL,
    sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'sale', 'purchase', 'adjustment', 'payment'
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    reference_id VARCHAR(255), -- For external references
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 6. DEBTS TABLE
-- ========================================
CREATE TABLE debts (
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
    status VARCHAR(50) DEFAULT 'unpaid', -- 'unpaid', 'partially_paid', 'paid'
    due_date DATE,
    notes TEXT,
    last_payment_date TIMESTAMP,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Sesuai frontend: 'timestamp'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 7. DEBT PAYMENTS TABLE
-- ========================================
CREATE TABLE debt_payments (
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
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    nama VARCHAR(255) NOT NULL, -- Sesuai frontend: 'nama'
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
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'stock-out', 'stock-low', 'product-added', 'transaction-success'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    sale_id INTEGER REFERENCES sales(id) ON DELETE SET NULL,
    debt_id INTEGER REFERENCES debts(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT FALSE,
    is_persistent BOOLEAN DEFAULT FALSE, -- Auto-dismiss or persistent
    action_text VARCHAR(100), -- Button text for action
    action_url VARCHAR(500), -- URL for action button
    metadata JSONB, -- Additional data for notifications
    read_at TIMESTAMP,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Sesuai frontend: 'timestamp'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 10. PROMOTIONS TABLE
-- ========================================
CREATE TABLE promotions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type VARCHAR(50) NOT NULL, -- 'percentage', 'fixed'
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
-- 11. STORE_STATS TABLE (For analytics)
-- ========================================
CREATE TABLE store_stats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_sales INTEGER DEFAULT 0,
    total_revenue DECIMAL(15,2) DEFAULT 0.00,
    total_profit DECIMAL(15,2) DEFAULT 0.00,
    unique_customers INTEGER DEFAULT 0,
    top_selling_products JSONB, -- Array of top products
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, store_id, date)
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Promotions indexes
CREATE INDEX idx_promotions_user_id ON promotions(user_id);
CREATE INDEX idx_promotions_product_id ON promotions(product_id);
CREATE INDEX idx_promotions_is_active ON promotions(is_active);
CREATE INDEX idx_promotions_tanggal ON promotions(start_date, end_date);
CREATE INDEX idx_products_nama ON products(nama);

-- Sales indexes
CREATE INDEX idx_sales_user_id ON sales(user_id);
CREATE INDEX idx_sales_store_id ON sales(store_id);
CREATE INDEX idx_sales_timestamp ON sales(timestamp);
CREATE INDEX idx_sales_order_id ON sales(order_id);
CREATE INDEX idx_sales_payment_status ON sales(payment_status);

-- Debts indexes
CREATE INDEX idx_debts_user_id ON debts(user_id);
CREATE INDEX idx_debts_store_id ON debts(store_id);
CREATE INDEX idx_debts_status ON debts(status);
CREATE INDEX idx_debts_timestamp ON debts(timestamp);
CREATE INDEX idx_debts_customer_name ON debts(customer_name);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_timestamp ON notifications(timestamp);

-- Store stats indexes
CREATE INDEX idx_store_stats_user_id ON store_stats(user_id);
CREATE INDEX idx_store_stats_store_id ON store_stats(store_id);
CREATE INDEX idx_store_stats_date ON store_stats(date);

-- ========================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ========================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_debts_updated_at BEFORE UPDATE ON debts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON promotions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update store statistics when sale is made
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
$$ language 'plpgsql';

CREATE TRIGGER store_stats_on_sale AFTER INSERT ON sales FOR EACH ROW EXECUTE FUNCTION update_store_stats_on_sale();

-- Trigger to update products count when product is added/removed
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
$$ language 'plpgsql';

CREATE TRIGGER store_product_count_change AFTER INSERT OR DELETE ON products FOR EACH ROW EXECUTE FUNCTION update_store_product_count();

-- ========================================
-- VIEWS FOR COMMON QUERIES
-- ========================================

-- View for products with stock status
CREATE VIEW products_with_stock_status AS
SELECT 
    p.*,
    CASE 
        WHEN p.stok = 0 THEN 'stok_habis'
        WHEN p.stok <= (p.batch_size * 0.5) THEN 'stok_menipis'
        WHEN p.stok >= (p.batch_size * 5) THEN 'stok_berlebih'
        ELSE 'stok_normal'
    END as stock_status
FROM products p;

-- View for debts with payment summary
CREATE VIEW debts_with_summary AS
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
    c.nama as customer_nama, -- Sesuai frontend: 'nama'
    (SELECT COALESCE(SUM(amount), 0) FROM debt_payments WHERE debt_id = d.id) as total_paid,
    d.total_amount - COALESCE((SELECT SUM(amount) FROM debt_payments WHERE debt_id = d.id), 0) as remaining_balance
FROM debts d
LEFT JOIN customers c ON d.customer_id = c.id;

-- View for today's sales per user
CREATE VIEW today_sales AS
SELECT 
    s.*,
    p.nama as product_name, -- Sesuai frontend: 'nama'
    p.harga as product_price -- Sesuai frontend: 'harga'
FROM sales s
LEFT JOIN jsonb_array_elements(s.items) as item ON true
LEFT JOIN products p ON item->>'id' = p.id::text
WHERE DATE(s.timestamp) = CURRENT_DATE; -- Sesuai frontend: 'timestamp'

-- ========================================
-- 12. USER_SESSIONS TABLE (untuk authentication)
-- ========================================
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 13. USER_PERMISSIONS TABLE (untuk role-based access control)
-- ========================================
CREATE TABLE user_permissions (
    id SERIAL PRIMARY KEY,
    role VARCHAR(50) NOT NULL,
    permission VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role, permission)
);

-- ========================================
-- 14. ADMIN_LOGS TABLE (untuk audit trail admin)
-- ========================================
CREATE TABLE admin_logs (
    id SERIAL PRIMARY KEY,
    admin_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- 'create_user', 'delete_user', 'view_all_data', etc
    target_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    table_name VARCHAR(100),
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- SAMPLE DATA (Optional - untuk testing)
-- ========================================

-- Insert default permissions for roles
INSERT INTO user_permissions (role, permission, description) VALUES
-- Admin permissions
('admin', 'create_user', 'Membuat user baru'),
('admin', 'delete_user', 'Menghapus user'),
('admin', 'view_all_users', 'Melihat semua user'),
('admin', 'view_all_data', 'Melihat data semua user'),
('admin', 'manage_permissions', 'Mengelola permissions'),
('admin', 'view_admin_logs', 'Melihat audit logs'),
-- User permissions
('user', 'view_own_data', 'Melihat data sendiri'),
('user', 'create_own_store', 'Membuat toko sendiri'),
('user', 'manage_own_products', 'Mengelola produk sendiri'),
('user', 'manage_own_sales', 'Mengelola penjualan sendiri'),
('user', 'manage_own_debts', 'Mengelola hutang sendiri');

-- Insert default admin user (password: admin123)
INSERT INTO users (email, password_hash, name, role) VALUES 
('admin@dagangcerdas.com', '$2b$10$rQZ8ZqGQJqKqQqQqQqQqQu', 'System Administrator', 'admin');

-- ========================================
-- SECURITY POLICIES (Row-Level Security)
-- ========================================

-- Enable RLS untuk data isolation
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_stats ENABLE ROW LEVEL SECURITY;

-- Policy untuk user biasa (hanya bisa akses data sendiri)
CREATE POLICY user_isolation ON products FOR ALL TO application_user 
USING (user_id = current_setting('app.current_user_id')::integer);

CREATE POLICY user_isolation_sales ON sales FOR ALL TO application_user 
USING (user_id = current_setting('app.current_user_id')::integer);

CREATE POLICY user_isolation_debts ON debts FOR ALL TO application_user 
USING (user_id = current_setting('app.current_user_id')::integer);

CREATE POLICY user_isolation_stores ON stores FOR ALL TO application_user 
USING (user_id = current_setting('app.current_user_id')::integer);

-- Policy untuk admin (bisa akses semua data)
CREATE POLICY admin_full_access ON products FOR ALL TO admin_user 
USING (true);

CREATE POLICY admin_full_access_sales ON sales FOR ALL TO admin_user 
USING (true);

CREATE POLICY admin_full_access_debts ON debts FOR ALL TO admin_user 
USING (true);

CREATE POLICY admin_full_access_stores ON stores FOR ALL TO admin_user 
USING (true);

-- ========================================
-- ROLES & SECURITY SETUP
-- ========================================

-- Create database roles
CREATE ROLE admin_user NOINHERIT;
CREATE ROLE application_user NOINHERIT;

-- Grant permissions to roles
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO admin_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO application_user;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO admin_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO application_user;

-- ========================================
-- PERFORMANCE OPTIMIZATION
-- ========================================

-- Partition large tables by date if needed (for high volume)
-- Example: Partition sales table by month
-- CREATE TABLE sales_y2024m01 PARTITION OF sales
-- FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- ========================================
-- BACKUP AND MAINTENANCE
-- ========================================

-- Create backup function
-- CREATE OR REPLACE FUNCTION create_backup()
-- RETURNS TEXT AS $$
-- DECLARE
--     backup_name TEXT;
-- BEGIN
--     backup_name := 'dagangcerdas_backup_' || to_char(now(), 'YYYY_MM_DD_HH24_MI_SS');
--     -- EXECUTE 'BACKUP DATABASE TO ' || backup_name; -- PostgreSQL specific
--     RETURN backup_name;
-- END;
-- $$ LANGUAGE plpgsql;
