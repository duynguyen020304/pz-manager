#!/usr/bin/env node

/**
 * Admin User Migration Script
 * Creates or updates the default admin user with superadmin role
 *
 * Usage: node scripts/migrate-admin.js
 *
 * This script will:
 * 1. Ensure the superadmin role exists
 * 2. Create or update the 'admin' user with a generated password
 * 3. Display the admin credentials
 *
 * Options:
 *   ADMIN_PASSWORD=<password> node scripts/migrate-admin.js
 *   ADMIN_USERNAME=<username> node scripts/migrate-admin.js
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is not set');
  console.error('Create a .env.local file with DATABASE_URL or export it');
  process.exit(1);
}

// Configuration
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@localhost';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || generateStrongPassword();

/**
 * Generate a strong random password (24 characters)
 * Includes uppercase, lowercase, numbers, and special characters
 */
function generateStrongPassword() {
  const chars = {
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lower: 'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
    special: '!@#$%^&*()-_=+'
  };

  // Ensure at least 4 characters from each category
  let password = '';
  password += getRandomChar(chars.upper);
  password += getRandomChar(chars.lower);
  password += getRandomChar(chars.numbers);
  password += getRandomChar(chars.special);

  // Fill the rest (20 chars) from all categories
  const allChars = Object.values(chars).join('');
  for (let i = 0; i < 20; i++) {
    password += getRandomChar(allChars);
  }

  // Shuffle the password
  return password.split('').sort(() => crypto.randomInt(3) - 1).join('');
}

/**
 * Get a random character from a string
 */
function getRandomChar(str) {
  return str[crypto.randomInt(str.length)];
}

/**
 * Run the migration
 */
async function runMigration() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  try {
    console.log('🔐 Admin User Migration');
    console.log('=========================================\n');

    // Connect to database
    console.log('⏳ Connecting to database...');
    const client = await pool.connect();

    try {
      // Start transaction
      await client.query('BEGIN');

      // Ensure superadmin role exists
      console.log('⏳ Ensuring superadmin role exists...');
      const roleResult = await client.query(`
        INSERT INTO roles (name, display_name, description, permissions, is_system)
        VALUES (
          'superadmin',
          'Super Admin',
          'Full system access with all permissions',
          '{"*": ["*"]}'::jsonb,
          true
        )
        ON CONFLICT (name)
        DO UPDATE SET
          display_name = EXCLUDED.display_name,
          description = EXCLUDED.description,
          permissions = EXCLUDED.permissions
        RETURNING id
      `);

      const superadminRoleId = roleResult.rows[0].id;
      console.log('✅ Superadmin role ensured (ID:', superadminRoleId, ')\n');

      // Hash the password
      console.log('⏳ Hashing password...');
      const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);

      // Create or update admin user
      console.log(`⏳ Creating/updating admin user '${ADMIN_USERNAME}'...`);
      const userResult = await client.query(`
        INSERT INTO users (username, email, password_hash, role_id, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, true, NOW(), NOW())
        ON CONFLICT (username)
        DO UPDATE SET
          email = EXCLUDED.email,
          password_hash = EXCLUDED.password_hash,
          role_id = EXCLUDED.role_id,
          is_active = EXCLUDED.is_active,
          updated_at = NOW()
        RETURNING id, created_at
      `, [ADMIN_USERNAME, ADMIN_EMAIL, passwordHash, superadminRoleId]);

      const userId = userResult.rows[0].id;
      const isNewUser = userResult.rows[0].created_at !== null;

      await client.query('COMMIT');

      console.log('✅ Admin user', isNewUser ? 'created' : 'updated', '(ID:', userId, ')\n');

      // Verify the user
      const verifyResult = await client.query(`
        SELECT
          u.id,
          u.username,
          u.email,
          u.is_active,
          r.name as role_name,
          r.display_name as role_display_name,
          r.permissions as role_permissions
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.username = $1
      `, [ADMIN_USERNAME]);

      if (verifyResult.rows.length === 0) {
        throw new Error('Failed to verify created user');
      }

      const user = verifyResult.rows[0];

      // Display success message
      console.log('=========================================');
      console.log('✅ Migration Complete!');
      console.log('=========================================\n');
      console.log('📋 User Details:');
      console.log('   Username:  ', user.username);
      console.log('   Email:     ', user.email);
      console.log('   Active:    ', user.is_active ? 'Yes' : 'No');
      console.log('   Role:      ', user.role_display_name);
      console.log('   ID:        ', user.id);
      console.log('\n🔑 Login Credentials:');
      console.log('   Username:  ', ADMIN_USERNAME);
      console.log('   Password:  ', ADMIN_PASSWORD);
      console.log('\n⚠️  IMPORTANT:');
      console.log('   → Save this password securely!');
      console.log('   → Log in at: http://localhost:3001/login');
      console.log('   → Change the password after first login\n');
      console.log('=========================================\n');

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.code) {
      console.error('   PostgreSQL Error Code:', error.code);
    }
    if (error.detail) {
      console.error('   Detail:', error.detail);
    }
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration();
