#!/usr/bin/env node

/**
 * Migration script to migrate existing environment-variable admin to database
 * Run this once after setting up TimescaleDB
 *
 * Usage: node scripts/migrate-admin.js
 *
 * Note: This script is deprecated. Admin authentication now uses database-backed
 * users. Use ./scripts/reset-superadmin.sh to create or reset admin users.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is not set');
  process.exit(1);
}

console.log('Deprecation Notice:');
console.log('This migration script is no longer needed.');
console.log('Admin authentication now uses database-backed users.');
console.log('');
console.log('To create or reset the admin user, run:');
console.log('  ./scripts/reset-superadmin.sh -p');
console.log('');
console.log('Exiting...');
process.exit(0);
