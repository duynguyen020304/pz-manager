-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ============================================
-- ROLES TABLE (RBAC System)
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '{}',
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on role name for faster lookups
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- ============================================
-- SESSIONS TABLE (Server-side session storage)
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Create indexes for session lookups
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ============================================
-- AUDIT LOGS TABLE (Time-series data)
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    time TIMESTAMPTZ NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255),
    details JSONB,
    ip_address INET
);

-- Convert audit_logs to TimescaleDB hypertable for time-series optimization
-- This allows efficient storage and querying of time-series data
SELECT create_hypertable('audit_logs', 'time', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);

-- Create indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, time DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- ============================================
-- DEFAULT ROLES
-- ============================================
INSERT INTO roles (name, display_name, description, permissions, is_system) VALUES
    ('superadmin', 'Super Admin', 'Full system access - can perform any action',
     '{"*": ["*"]}'::jsonb, true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, display_name, description, permissions, is_system) VALUES
    ('admin', 'Administrator', 'Can manage servers, backups, schedules, and users',
     '{
        "servers": ["view", "start", "stop", "configure"],
        "backups": ["view", "create", "restore", "delete"],
        "schedules": ["view", "create", "edit", "delete"],
        "settings": ["view", "edit"],
        "logs": ["view"],
        "users": ["view", "create", "edit"],
        "roles": ["view"]
     }'::jsonb, true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, display_name, description, permissions, is_system) VALUES
    ('operator', 'Operator', 'Can start/stop servers and view logs',
     '{
        "servers": ["view", "start", "stop"],
        "backups": ["view"],
        "schedules": ["view"],
        "logs": ["view"]
     }'::jsonb, true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, display_name, description, permissions, is_system) VALUES
    ('viewer', 'Viewer', 'Read-only access to all resources',
     '{
        "servers": ["view"],
        "backups": ["view"],
        "schedules": ["view"],
        "logs": ["view"]
     }'::jsonb, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for roles table
DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
CREATE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired sessions (can be called by a cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sessions WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEWS
-- ============================================

-- View for users with their role information
CREATE OR REPLACE VIEW users_with_roles AS
SELECT
    u.id,
    u.username,
    u.email,
    u.password_hash,
    u.role_id,
    r.name as role_name,
    r.display_name as role_display_name,
    r.description as role_description,
    r.permissions as role_permissions,
    u.is_active,
    u.last_login_at,
    u.created_at,
    u.updated_at
FROM users u
LEFT JOIN roles r ON u.role_id = r.id;

-- ============================================
-- PERMISSION HELPER FUNCTIONS
-- ============================================

-- Function to check if a role has a specific permission
CREATE OR REPLACE FUNCTION has_permission(
    p_role_id INTEGER,
    p_resource VARCHAR(50),
    p_action VARCHAR(50)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_permissions JSONB;
    v_is_superadmin BOOLEAN;
BEGIN
    -- Get role permissions
    SELECT permissions, name = 'superadmin' 
    INTO v_permissions, v_is_superadmin
    FROM roles 
    WHERE id = p_role_id;
    
    -- Superadmin has all permissions
    IF v_is_superadmin THEN
        RETURN TRUE;
    END IF;
    
    -- Check specific permission
    IF v_permissions IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check for wildcard resource permission
    IF v_permissions->'*' IS NOT NULL THEN
        IF p_action = ANY(ARRAY(SELECT jsonb_array_elements_text(v_permissions->'*'))) 
           OR '*' = ANY(ARRAY(SELECT jsonb_array_elements_text(v_permissions->'*'))) THEN
            RETURN TRUE;
        END IF;
    END IF;
    
    -- Check specific resource permission
    IF v_permissions->p_resource IS NOT NULL THEN
        RETURN p_action = ANY(ARRAY(SELECT jsonb_array_elements_text(v_permissions->p_resource)));
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;
