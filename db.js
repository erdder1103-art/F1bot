const Database = require("better-sqlite3");

const db = new Database("bot.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT,
    action TEXT,
    message TEXT
  );
`);

function insertLog(action, message) {
  const stmt = db.prepare(`
    INSERT INTO logs (timestamp, action, message)
    VALUES (?, ?, ?)
  `);
  stmt.run(new Date().toISOString(), action, message);
}

module.exports = { db, insertLog };
