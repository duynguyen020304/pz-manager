#!/usr/bin/env node

/**
 * Migration script for system monitoring tables
 * Creates tables for metrics, spikes, and monitoring configuration
 * 
 * Usage: node scripts/migrate-system-monitoring.js
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function runMigration() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();

    try {
      // Read the migration SQL file
      const migrationPath = path.join(__dirname, 'migrations', 'add_system_monitoring.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

      console.log('Running system monitoring migration...');
      console.log('This may take a moment...');
      
      // Execute the entire migration as a single transaction
      await client.query('BEGIN');
      
      try {
        // Execute the SQL file
        await client.query(migrationSQL);
        
        await client.query('COMMIT');
        console.log('✅ SQL migration executed successfully');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }

      // Verify tables were created
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('system_metrics', 'system_spikes', 'monitor_config')
      `);

      const createdTables = tablesResult.rows.map(r => r.table_name);
      
      console.log('\n📊 System monitoring migration completed successfully');
      console.log('   Tables created:', createdTables.join(', '));
      
      // Check if hypertables were created
      try {
        const hypertablesResult = await client.query(`
          SELECT hypertable_name 
          FROM timescaledb_information.hypertables 
          WHERE hypertable_name IN ('system_metrics', 'system_spikes')
        `);
        
        const hypertables = hypertablesResult.rows.map(r => r.hypertable_name);
        console.log('   Hypertables:', hypertables.join(', '));
      } catch {
        console.log('   Note: Could not verify hypertables (TimescaleDB extension may not be available)');
      }
      
      // Check default config
      const configResult = await client.query('SELECT * FROM monitor_config WHERE id = 1');
      if (configResult.rows.length > 0) {
        const config = configResult.rows[0];
        console.log('\n⚙️  Default monitoring configuration:');
        console.log('   Enabled:', config.enabled ? 'Yes' : 'No');
        console.log('   Polling interval:', config.polling_interval_seconds, 'seconds');
        console.log('   Data retention:', config.data_retention_days, 'days');
        console.log('   CPU spike threshold:', config.cpu_spike_threshold_percent + '%');
        console.log('   Memory spike threshold:', config.memory_spike_threshold_percent + '%');
      }

      console.log('\n✨ Migration complete! The monitoring system is ready to use.');
      console.log('   Start the dev server with: npm run dev');

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
