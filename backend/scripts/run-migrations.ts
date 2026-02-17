import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { ENV } from "../_core/env";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.join(__dirname, "../supabase/migrations");

async function runMigrations() {
  console.log("[Migrations] Starting migration process...");

  if (!ENV.databaseUrl) {
    console.error("[Migrations] ❌ DATABASE_URL environment variable is not set");
    console.error("[Migrations] Please add DATABASE_URL to your .env file");
    console.error("[Migrations] Get it from: Supabase Dashboard → Settings → Database → Connection String (URI, Session mode)");
    process.exit(1);
  }

  // Connect to PostgreSQL directly
  const client = new Client({
    connectionString: ENV.databaseUrl,
  });

  try {
    console.log("[Migrations] Connecting to database...");
    await client.connect();
    console.log("[Migrations] ✅ Connected");

    // 1. Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    console.log("[Migrations] ✅ Migration tracker table ready");

    // 2. Get list of migration files
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith(".sql"))
      .sort(); // Alphabetical = sequential order

    console.log(`[Migrations] Found ${files.length} migration files`);

    // 3. Get already-applied migrations
    const result = await client.query(
      "SELECT migration_name FROM _migrations ORDER BY applied_at"
    );
    const appliedSet = new Set(result.rows.map((r: any) => r.migration_name));

    console.log(`[Migrations] ${appliedSet.size} migrations already applied`);

    // 4. Apply pending migrations
    let appliedCount = 0;
    let skippedCount = 0;

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`[Migrations] ⏭️  Skipping ${file}`);
        skippedCount++;
        continue;
      }

      console.log(`[Migrations] 🔄 Applying ${file}...`);

      const sql = fs.readFileSync(
        path.join(MIGRATIONS_DIR, file),
        "utf-8"
      );

      // Execute migration in a transaction
      await client.query("BEGIN");
      try {
        // Run the migration SQL
        await client.query(sql);

        // Record migration as applied
        await client.query(
          "INSERT INTO _migrations (migration_name) VALUES ($1)",
          [file]
        );

        await client.query("COMMIT");

        console.log(`[Migrations] ✅ Applied ${file}`);
        appliedCount++;
      } catch (error: any) {
        await client.query("ROLLBACK");
        console.error(`[Migrations] ❌ Failed ${file}:`);
        console.error(error.message);

        // Show specific error details
        if (error.position) {
          console.error(`Error at position ${error.position}`);
        }
        if (error.detail) {
          console.error(`Detail: ${error.detail}`);
        }
        if (error.hint) {
          console.error(`Hint: ${error.hint}`);
        }

        throw error;
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log(`[Migrations] ✨ Complete!`);
    console.log(`[Migrations] - Applied: ${appliedCount} new migrations`);
    console.log(`[Migrations] - Skipped: ${skippedCount} already applied`);
    console.log(`[Migrations] - Total: ${files.length} migration files`);
    console.log("=".repeat(50) + "\n");
  } catch (error: any) {
    console.error("\n[Migrations] ❌ Fatal error:", error.message);
    throw error;
  } finally {
    await client.end();
    console.log("[Migrations] Database connection closed");
  }
}

runMigrations()
  .then(() => {
    console.log("[Migrations] Migration process completed successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("[Migrations] Migration process failed");
    process.exit(1);
  });
