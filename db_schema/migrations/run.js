#!/usr/bin/env node
/**
 * Database Migration Runner
 * 
 * Usage:
 *   node db_schema/migrations/run.js              # Interactive mode - select migrations
 *   node db_schema/migrations/run.js --all         # Run all pending migrations
 *   node db_schema/migrations/run.js 001 003       # Run specific migrations
 *   node db_schema/migrations/run.js --list        # List all migrations and status
 *   node db_schema/migrations/run.js --status      # Show migration status
 */

const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Use the existing database pool from config
const pool = require('../../config/db');

const MIGRATIONS_DIR = path.join(__dirname);
const MIGRATIONS_TABLE = 'migrations';

// ── Helpers ───────────────────────────────────────────────────────────────

function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`❌ Migrations directory not found: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => /^\d{3}_.+\.sql$/.test(file))
    .sort();

  if (files.length === 0) {
    console.log('📭 No migration files found.');
    process.exit(0);
  }

  return files;
}

function parseMigrationName(filename) {
  // Extract name from "001_add_environment_note.sql"
  return filename.replace(/^\d{3}_/, '').replace(/\.sql$/, '');
}

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`${MIGRATIONS_TABLE}\` (
      id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      filename    VARCHAR(255)    NOT NULL UNIQUE,
      name        VARCHAR(255)    NOT NULL,
      executed_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_migrations_filename (filename)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function getExecutedMigrations() {
  const [rows] = await pool.query(
    `SELECT filename FROM \`${MIGRATIONS_TABLE}\` ORDER BY filename ASC`
  );
  return new Set(rows.map(row => row.filename));
}

async function getMigrationStatus() {
  const allFiles = getMigrationFiles();
  const executed = await getExecutedMigrations();

  return allFiles.map(filename => ({
    filename,
    name: parseMigrationName(filename),
    executed: executed.has(filename)
  }));
}

// ── Migration Execution ────────────────────────────────────────────────────

async function runMigration(filename) {
  const filePath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(filePath, 'utf8');

  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Execute the migration SQL
    // Split by semicolons but be careful with stored procedures etc.
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      if (statement) {
        await connection.query(statement);
      }
    }

    // Record the migration
    const name = parseMigrationName(filename);
    await connection.query(
      `INSERT INTO \`${MIGRATIONS_TABLE}\` (filename, name) VALUES (?, ?)`,
      [filename, name]
    );

    await connection.commit();
    console.log(`  ✅ Executed: ${filename}`);
    return true;
  } catch (error) {
    await connection.rollback();
    console.error(`  ❌ Failed to execute ${filename}: ${error.message}`);
    return false;
  } finally {
    connection.release();
  }
}

async function runMigrations(filenames) {
  await ensureMigrationsTable();

  console.log('\n🚀 Running migrations...\n');

  let successCount = 0;
  let failCount = 0;

  for (const filename of filenames) {
    const result = await runMigration(filename);
    if (result) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('\n' + '─'.repeat(50));
  console.log(`✅ Successful: ${successCount}`);
  if (failCount > 0) {
    console.log(`❌ Failed: ${failCount}`);
  }
  console.log('─'.repeat(50) + '\n');

  return failCount === 0;
}

// ── CLI Interface ──────────────────────────────────────────────────────────

async function listMigrations() {
  const status = await getMigrationStatus();

  console.log('\n📋 Migration Status\n');
  console.log('─'.repeat(60));

  status.forEach(item => {
    const icon = item.executed ? '✅' : '⏳';
    const statusText = item.executed ? 'EXECUTED' : 'PENDING';
    console.log(`${icon} ${item.filename}`);
    console.log(`   Name: ${item.name}`);
    console.log(`   Status: ${statusText}`);
    console.log('');
  });

  console.log('─'.repeat(60));
  console.log(`Total: ${status.length} migrations`);
  console.log(`Executed: ${status.filter(s => s.executed).length}`);
  console.log(`Pending: ${status.filter(s => !s.executed).length}\n`);
}

async function interactiveMode() {
  const status = await getMigrationStatus();
  const pending = status.filter(s => !s.executed);

  if (pending.length === 0) {
    console.log('\n✅ No pending migrations. Database is up to date!\n');
    return;
  }

  console.log('\n📋 Pending Migrations\n');
  console.log('─'.repeat(60));

  pending.forEach((item, index) => {
    console.log(`${index + 1}. ${item.filename}`);
    console.log(`   Name: ${item.name}`);
  });

  console.log('─'.repeat(60));
  console.log(`\nTotal pending migrations: ${pending.length}\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

  try {
    console.log('Select migrations to run:');
    console.log('  • Enter numbers separated by spaces (e.g., "1 3 4")');
    console.log('  • Enter "all" to run all pending migrations');
    console.log('  • Enter "q" to quit\n');

    const answer = await question('Your choice: ');

    if (answer.toLowerCase() === 'q') {
      console.log('\n👋 Cancelled.\n');
      rl.close();
      process.exit(0);
    }

    let selectedFiles;

    if (answer.toLowerCase() === 'all') {
      selectedFiles = pending.map(p => p.filename);
    } else {
      const indices = answer.trim().split(/\s+/).map(Number).filter(n => !isNaN(n));
      const invalid = indices.filter(i => i < 1 || i > pending.length);

      if (invalid.length > 0) {
        console.log('\n❌ Invalid selection. Please enter valid numbers.\n');
        rl.close();
        process.exit(1);
      }

      selectedFiles = indices.map(i => pending[i - 1].filename);
    }

    if (selectedFiles.length === 0) {
      console.log('\n⚠️  No migrations selected.\n');
      rl.close();
      process.exit(0);
    }

    console.log('\nSelected migrations:');
    selectedFiles.forEach(f => console.log(`  • ${f}`));

    const confirm = await question('\nProceed? (y/n): ');
    
    if (confirm.toLowerCase() !== 'y') {
      console.log('\n👋 Cancelled.\n');
      rl.close();
      process.exit(0);
    }

    rl.close();
    await runMigrations(selectedFiles);
    
  } catch (error) {
    rl.close();
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  try {
    // Test database connection
    await pool.query('SELECT 1');
    console.log('✅ Database connection established.\n');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
    console.error('\nPlease check your database configuration in config/db.js and .env file.');
    process.exit(1);
  }

  // Ensure migrations table exists before any operation
  await ensureMigrationsTable();

  // --list or --status flag
  if (args.includes('--list') || args.includes('--status')) {
    await listMigrations();
    await pool.end();
    process.exit(0);
  }

  // --all flag: run all pending migrations
  if (args.includes('--all')) {
    const status = await getMigrationStatus();
    const pending = status.filter(s => !s.executed);
    
    if (pending.length === 0) {
      console.log('\n✅ No pending migrations.\n');
      await pool.end();
      process.exit(0);
    }

    const filenames = pending.map(p => p.filename);
    const success = await runMigrations(filenames);
    await pool.end();
    process.exit(success ? 0 : 1);
  }

  // Specific migration files provided as arguments
  if (args.length > 0) {
    const allFiles = getMigrationFiles();
    const invalid = args.filter(arg => !allFiles.includes(arg));

    if (invalid.length > 0) {
      console.error(`\n❌ Invalid migration file(s): ${invalid.join(', ')}`);
      console.error('\nAvailable migrations:');
      allFiles.forEach(f => console.error(`  • ${f}`));
      await pool.end();
      process.exit(1);
    }

    await runMigrations(args);
    await pool.end();
    process.exit(0);
  }

  // No arguments: interactive mode
  await interactiveMode();
  await pool.end();
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n👋 Migration process interrupted.');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});

// Run if called directly
if (require.main === module) {
  main().catch(async (error) => {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  });
}

module.exports = { runMigrations, getMigrationStatus, getMigrationFiles };