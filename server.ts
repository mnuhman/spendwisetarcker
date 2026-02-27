import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("tracker.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL, -- 'expense' or 'revenue'
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    note TEXT
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/transactions", (req, res) => {
    const transactions = db.prepare("SELECT * FROM transactions ORDER BY date DESC").all();
    res.json(transactions);
  });

  app.post("/api/transactions", (req, res) => {
    const { type, amount, category, date, note } = req.body;
    const info = db.prepare(
      "INSERT INTO transactions (type, amount, category, date, note) VALUES (?, ?, ?, ?, ?)"
    ).run(type, amount, category, date, note);
    res.json({ id: info.lastInsertRowid, ...req.body });
  });

  app.put("/api/transactions/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { type, amount, category, date, note } = req.body;
      db.prepare(
        "UPDATE transactions SET type = ?, amount = ?, category = ?, date = ?, note = ? WHERE id = ?"
      ).run(type, amount, category, date, note, Number(id));
      res.json({ id: Number(id), ...req.body });
    } catch (error) {
      console.error("Update error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/transactions", (req, res) => {
    console.log("Bulk delete request received");
    try {
      const info = db.prepare("DELETE FROM transactions").run();
      console.log(`Deleted ${info.changes} transactions`);
      res.status(200).json({ success: true, changes: info.changes });
    } catch (error) {
      console.error("Bulk delete error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/transactions/:id", (req, res) => {
    try {
      const { id } = req.params;
      const result = db.prepare("DELETE FROM transactions WHERE id = ?").run(Number(id));
      if (result.changes === 0) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Delete error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
