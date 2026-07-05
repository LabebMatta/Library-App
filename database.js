const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required. Add your Supabase connection string to the environment.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});

function mapHistoryRow(row) {
  return {
    id: String(row.id),
    username: row.username,
    action: row.action,
    timestamp: row.created_at
  };
}

async function initializeDatabase() {
  const [result] = await Promise.all([
    pool.query("SELECT is_open FROM library_status WHERE id = 1"),
    pool.query("SELECT 1 FROM activity_log LIMIT 1")
  ]);

  if (result.rowCount !== 1) {
    throw new Error("The library_status table is not initialized. Run supabase-schema.sql first.");
  }
}

async function getLibraryData() {
  const [statusResult, historyResult] = await Promise.all([
    pool.query("SELECT is_open FROM library_status WHERE id = 1"),
    pool.query(`
      SELECT id, username, action, created_at
      FROM activity_log
      ORDER BY created_at DESC, id DESC
      LIMIT 100
    `)
  ]);

  if (statusResult.rowCount !== 1) {
    throw new Error("Library status row is missing.");
  }

  const isOpen = statusResult.rows[0].is_open;
  return {
    status: isOpen ? "OPEN" : "CLOSED",
    isOpen,
    history: historyResult.rows.map(mapHistoryRow)
  };
}

async function toggleLibrary(username) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const statusResult = await client.query(
      "SELECT is_open FROM library_status WHERE id = 1 FOR UPDATE"
    );

    if (statusResult.rowCount !== 1) {
      throw new Error("Library status row is missing.");
    }

    const isOpen = !statusResult.rows[0].is_open;
    const action = isOpen ? "opened" : "closed";

    await client.query(
      "UPDATE library_status SET is_open = $1, updated_at = NOW() WHERE id = 1",
      [isOpen]
    );
    await client.query(
      "INSERT INTO activity_log (username, action) VALUES ($1, $2)",
      [username, action]
    );

    const historyResult = await client.query(`
      SELECT id, username, action, created_at
      FROM activity_log
      ORDER BY created_at DESC, id DESC
      LIMIT 100
    `);

    await client.query("COMMIT");

    return {
      status: isOpen ? "OPEN" : "CLOSED",
      isOpen,
      history: historyResult.rows.map(mapHistoryRow)
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function openLibrary(username) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const statusResult = await client.query(
      "SELECT is_open FROM library_status WHERE id = 1 FOR UPDATE"
    );

    if (statusResult.rowCount !== 1) {
      throw new Error("Library status row is missing.");
    }

    const changed = !statusResult.rows[0].is_open;

    if (changed) {
      await client.query(
        "UPDATE library_status SET is_open = true, updated_at = NOW() WHERE id = 1"
      );
      await client.query(
        "INSERT INTO activity_log (username, action) VALUES ($1, 'opened')",
        [username]
      );
    }

    const historyResult = await client.query(`
      SELECT id, username, action, created_at
      FROM activity_log
      ORDER BY created_at DESC, id DESC
      LIMIT 100
    `);

    await client.query("COMMIT");

    return {
      status: "OPEN",
      isOpen: true,
      changed,
      history: historyResult.rows.map(mapHistoryRow)
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function closeDatabase() {
  await pool.end();
}

module.exports = {
  initializeDatabase,
  getLibraryData,
  toggleLibrary,
  openLibrary,
  closeDatabase
};
