const express = require("express");
const dotenv = require("dotenv");
const { createDbClient } = require("./pgClient");

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Basic health check for CI/CD and container health
app.get("/health", (req, res) => {
  res.json({ status: "ok", environment: process.env.NODE_ENV || "unknown" });
});

// Simple endpoint that talks to PostgreSQL
app.get("/items", async (req, res) => {
  const client = createDbClient();
  try {
    await client.connect();
    await client.query(
      "CREATE TABLE IF NOT EXISTS items (id SERIAL PRIMARY KEY, name TEXT NOT NULL)"
    );
    const result = await client.query("SELECT * FROM items ORDER BY id ASC");
    res.json({ items: result.rows });
  } catch (err) {
    console.error("Error in /items:", err);
    res.status(500).json({ error: "Database error" });
  } finally {
    await client.end();
  }
});

app.post("/items", async (req, res) => {
  const { name } = req.body || {};
  if (!name) {
    return res.status(400).json({ error: "name is required" });
  }

  const client = createDbClient();
  try {
    await client.connect();
    await client.query(
      "CREATE TABLE IF NOT EXISTS items (id SERIAL PRIMARY KEY, name TEXT NOT NULL)"
    );
    const result = await client.query(
      "INSERT INTO items (name) VALUES ($1) RETURNING *",
      [name]
    );
    res.status(201).json({ item: result.rows[0] });
  } catch (err) {
    console.error("Error in POST /items:", err);
    res.status(500).json({ error: "Database error" });
  } finally {
    await client.end();
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend listening on port ${PORT}`);
  });
}

module.exports = app;

