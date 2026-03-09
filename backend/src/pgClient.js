const { Client } = require("pg");

function createDbClient() {
  const config = {
    host: process.env.DB_HOST || "db",
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || "devuser",
    password: process.env.DB_PASSWORD || "devpassword",
    database: process.env.DB_NAME || "devdb"
  };

  return new Client(config);
}

module.exports = { createDbClient };

