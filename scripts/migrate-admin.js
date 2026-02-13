#!/usr/bin/env node

/**
 * Migration script to migrate existing environment-variable admin to database
 * Run this once after setting up TimescaleDB
 * 
 * Usage: node scripts/migrate-admin.js
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

if (!DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is not set');
  process.exit(1);
}

if (!ADMIN_PASSWORD_HASH) {
  console.error('Error: ADMIN_PASSWORD_HASH environment variable is not set');
  process.exit(1);
}

async function migrateAdmin() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();

    try {
      // Check if admin user already exists
      const existingAdmin = await client.query(
        'SELECT id FROM users WHERE username = $1',
        ['admin']
      );

      if (existingAdmin.rows.length > 0) {
        console.log('Admin user already exists in database, skipping migration');
        return;
      }

      // Get superadmin role id
      const roleResult = await client.query(
        "SELECT id FROM roles WHERE name = 'superadmin'"
      );

      if (roleResult.rows.length === 0) {
        throw new Error('Superadmin role not found. Make sure database is initialized.');
      }

      const superadminRoleId = roleResult.rows[0].id;

      // Create admin user with existing password hash
      await client.query(
        `INSERT INTO users (username, email, password_hash, role_id, is_active, last_login_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          'admin',
          'admin@localhost',
          ADMIN_PASSWORD_HASH,
          superadminRoleId,
          true
        ]
      );

      console.log('✅ Successfully migrated admin user to database');
      console.log('   Username: admin');
      console.log('   Role: superadmin');
      console.log('   Password: (migrated from environment variable)');
      console.log('');
      console.log('You can now use database-based authentication.');

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrateAdmin();
