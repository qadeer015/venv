// config/db.js
const mysql = require("mysql2/promise");
require("dotenv").config();

// ── Serverless-safe singleton ───────────────────────────────────────
// On Vercel, module state persists across "warm" invocations of the
// same lambda instance, but a fresh instance can spin up at any time.
// Using a global guards against accidentally creating multiple pools
// if this module is ever required from more than one bundle/entry
// point in the same process (can happen with some bundlers).
const globalForDb = globalThis;

// ── Hard query timeout utility ──────────────────────────────────────
// Prevents a single slow/hanging query from blocking the entire
// serverless function until Vercel's platform-level timeout (which
// can be 300s and results in a 504 to the client).
const withTimeout = (promise, ms = 15_000) => {
    let timeout;
    const timeoutPromise = new Promise((_, reject) => {
        timeout = setTimeout(
            () => reject(new Error(`Database query timed out after ${ms}ms`)),
            ms
        );
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeout));
};

function createPool() {
    const isProd = process.env.NODE_ENV === "production";

    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 4000, // TiDB Cloud default port

        // ── Pool-level options (NOT inside ssl!) ────────────────────
        // Keep this LOW for serverless. Every concurrent invocation
        // gets its own pool, so 10 connections/pool * N concurrent
        // invocations can exhaust TiDB Serverless connection limits
        // fast. 2-3 is plenty for a single request handler.
        waitForConnections: true,
        connectionLimit: isProd ? 3 : 10,
        queueLimit: 0,

        // Fail fast instead of hanging for the platform's full timeout.
        connectTimeout: 10_000, // 10s to establish a connection

        // ── SSL — required by TiDB Cloud ────────────────────────────
        ssl: isProd
            ? { rejectUnauthorized: true }
            : undefined
    });

    // Wrap pool.query so every query gets a hard timeout.
    const originalQuery = pool.query.bind(pool);
    pool.query = (...args) => withTimeout(originalQuery(...args), 20_000);

    return pool;
}

let pool = globalForDb.__mysqlPool;
if (!pool) {
    pool = createPool();
    globalForDb.__mysqlPool = pool;
}

module.exports = pool;
