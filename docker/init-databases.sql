-- Script de inicialización unificada de bases de datos para desarrollo local
-- Crea los usuarios y bases de datos aisladas para cada microservicio en una sola instancia ligera de PostgreSQL

-- 1. Seguridad
DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'dulce_security_user') THEN
      CREATE USER dulce_security_user WITH PASSWORD 'dulce_security_pass';
   ELSE
      ALTER USER dulce_security_user WITH PASSWORD 'dulce_security_pass';
   END IF;
END $$;
CREATE DATABASE dulce_security OWNER dulce_security_user;
GRANT ALL PRIVILEGES ON DATABASE dulce_security TO dulce_security_user;

-- 2. Clientes (soporta tanto dulce_customer_user como dulce_customers_user)
DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'dulce_customer_user') THEN
      CREATE USER dulce_customer_user WITH PASSWORD 'dulce_customer_pass';
   ELSE
      ALTER USER dulce_customer_user WITH PASSWORD 'dulce_customer_pass';
   END IF;
   IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'dulce_customers_user') THEN
      CREATE USER dulce_customers_user WITH PASSWORD 'dulce_customers_local_only';
   ELSE
      ALTER USER dulce_customers_user WITH PASSWORD 'dulce_customers_local_only';
   END IF;
END $$;
CREATE DATABASE dulce_customer OWNER dulce_customer_user;
CREATE DATABASE dulce_customers OWNER dulce_customers_user;
GRANT ALL PRIVILEGES ON DATABASE dulce_customer TO dulce_customer_user;
GRANT ALL PRIVILEGES ON DATABASE dulce_customer TO dulce_customers_user;
GRANT ALL PRIVILEGES ON DATABASE dulce_customers TO dulce_customers_user;
GRANT ALL PRIVILEGES ON DATABASE dulce_customers TO dulce_customer_user;

-- 3. Ventas
DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'dulce_sales_user') THEN
      CREATE USER dulce_sales_user WITH PASSWORD 'dulce_sales_local_only';
   ELSE
      ALTER USER dulce_sales_user WITH PASSWORD 'dulce_sales_local_only';
   END IF;
END $$;
CREATE DATABASE dulce_sales OWNER dulce_sales_user;
GRANT ALL PRIVILEGES ON DATABASE dulce_sales TO dulce_sales_user;

-- 4. Pedidos
DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'dulce_orders_user') THEN
      CREATE USER dulce_orders_user WITH PASSWORD 'dulce_orders_local_only';
   ELSE
      ALTER USER dulce_orders_user WITH PASSWORD 'dulce_orders_local_only';
   END IF;
END $$;
CREATE DATABASE dulce_orders OWNER dulce_orders_user;
CREATE DATABASE dulce_order OWNER dulce_orders_user;
GRANT ALL PRIVILEGES ON DATABASE dulce_orders TO dulce_orders_user;
GRANT ALL PRIVILEGES ON DATABASE dulce_order TO dulce_orders_user;

-- 5. Inventario
DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'dulce_inventory_user') THEN
      CREATE USER dulce_inventory_user WITH PASSWORD 'dulce_inventory_pass';
   ELSE
      ALTER USER dulce_inventory_user WITH PASSWORD 'dulce_inventory_pass';
   END IF;
END $$;
CREATE DATABASE dulce_inventory OWNER dulce_inventory_user;
GRANT ALL PRIVILEGES ON DATABASE dulce_inventory TO dulce_inventory_user;

-- 6. Producción
DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'dulce_production_user') THEN
      CREATE USER dulce_production_user WITH PASSWORD 'dulce_production_local_only';
   ELSE
      ALTER USER dulce_production_user WITH PASSWORD 'dulce_production_local_only';
   END IF;
END $$;
CREATE DATABASE dulce_production OWNER dulce_production_user;
GRANT ALL PRIVILEGES ON DATABASE dulce_production TO dulce_production_user;

-- 7. Pagos y Recibos
DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'dulce_payment_user') THEN
      CREATE USER dulce_payment_user WITH PASSWORD 'dulce_payment_local_only';
   ELSE
      ALTER USER dulce_payment_user WITH PASSWORD 'dulce_payment_local_only';
   END IF;
END $$;
CREATE DATABASE dulce_payment OWNER dulce_payment_user;
GRANT ALL PRIVILEGES ON DATABASE dulce_payment TO dulce_payment_user;

-- 8. Reportes y Dashboard
DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'dulce_report_user') THEN
      CREATE USER dulce_report_user WITH PASSWORD 'dulce_report_local_only';
   ELSE
      ALTER USER dulce_report_user WITH PASSWORD 'dulce_report_local_only';
   END IF;
END $$;
CREATE DATABASE dulce_report OWNER dulce_report_user;
GRANT ALL PRIVILEGES ON DATABASE dulce_report TO dulce_report_user;
