const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

const db = new sqlite3.Database("./lab.db");

// DATABASE
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS barang (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    kode TEXT UNIQUE NOT NULL,
    stok INTEGER NOT NULL DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS kunjungan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    kelas TEXT NOT NULL,
    waktu TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS peminjaman (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    barang_id INTEGER NOT NULL,
    jumlah INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'dipinjam',
    waktu_pinjam TEXT NOT NULL,
    waktu_kembali TEXT,
    FOREIGN KEY(barang_id) REFERENCES barang(id)
  )`);

  // Seed data untuk barang
  const barangItems = [
    { nama: "Camera", kode: "CAM001", stok: 5 },
    { nama: "Laptop", kode: "LAP001", stok: 8 },
    { nama: "Buku", kode: "BUK001", stok: 20 },
    { nama: "Penggaris", kode: "PEN001", stok: 15 },
    { nama: "Microscope", kode: "MIC001", stok: 3 },
    { nama: "Projector", kode: "PROJ001", stok: 2 },
    { nama: "Whiteboard", kode: "WB001", stok: 4 },
    { nama: "Pendrive", kode: "USB001", stok: 10 },
    { nama: "Mouse", kode: "MOU001", stok: 12 },
    { nama: "Keyboard", kode: "KEY001", stok: 10 }
  ];

  barangItems.forEach(item => {
    db.run(
      "INSERT OR IGNORE INTO barang (nama, kode, stok) VALUES (?, ?, ?)",
      [item.nama, item.kode, item.stok]
    );
  });
});

// BARANG
app.get("/barang", (req, res) => {
  db.all("SELECT * FROM barang", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    res.json(rows || []);
  });
});

app.post("/barang", (req, res) => {
  const { nama, kode, stok } = req.body;
  if (!nama || !kode || stok === undefined || stok === null) {
    return res.status(400).json({ error: "Missing required fields: nama, kode, stok" });
  }
  if (stok < 0) {
    return res.status(400).json({ error: "Stok must be non-negative" });
  }

  db.run(
    "INSERT INTO barang (nama, kode, stok) VALUES (?, ?, ?)",
    [nama, kode, parseInt(stok)],
    function(err) {
      if (err) {
        if (err.message.includes("UNIQUE")) {
          return res.status(400).json({ error: "Kode barang already exists" });
        }
        return res.status(500).json({ error: "Database error", details: err.message });
      }
      res.status(201).json({ success: true, id: this.lastID });
    }
  );
});

// KUNJUNGAN
app.get("/kunjungan", (req, res) => {
  db.all("SELECT * FROM kunjungan", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    res.json(rows || []);
  });
});

app.post("/kunjungan", (req, res) => {
  const { nama, kelas, tanggal } = req.body;
  if (!nama || !kelas) {
    return res.status(400).json({ error: "Missing required fields: nama, kelas" });
  }

  const waktu = tanggal ? new Date(tanggal).toISOString() : new Date().toISOString();

  db.run(
    "INSERT INTO kunjungan (nama, kelas, waktu) VALUES (?, ?, ?)",
    [nama, kelas, waktu],
    function(err) {
      if (err) {
        return res.status(500).json({ error: "Database error", details: err.message });
      }
      res.status(201).json({ success: true, id: this.lastID });
    }
  );
});

// PEMINJAMAN
app.get("/peminjaman", (req, res) => {
  db.all(`
    SELECT p.*, b.nama as barang_nama 
    FROM peminjaman p
    JOIN barang b ON p.barang_id = b.id
  `, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    res.json(rows || []);
  });
});

app.post("/peminjaman", (req, res) => {
  const { nama, barang_id, jumlah, tanggal } = req.body;
  
  if (!nama || !barang_id || jumlah === undefined || jumlah === null) {
    return res.status(400).json({ error: "Missing required fields: nama, barang_id, jumlah" });
  }
  
  const jumlahInt = parseInt(jumlah);
  if (jumlahInt <= 0) {
    return res.status(400).json({ error: "Jumlah must be greater than 0" });
  }
  
  const waktu_pinjam = tanggal ? new Date(tanggal).toISOString() : new Date().toISOString();

  db.get("SELECT stok FROM barang WHERE id=?", [barang_id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: "Barang tidak ditemukan" });
    }
    if (row.stok < jumlahInt) {
      return res.status(400).json({ error: "Stok tidak cukup", available: row.stok, requested: jumlahInt });
    }

    db.run("UPDATE barang SET stok = stok - ? WHERE id=?", [jumlahInt, barang_id], (updateErr) => {
      if (updateErr) {
        return res.status(500).json({ error: "Database error", details: updateErr.message });
      }
      
      db.run(`
        INSERT INTO peminjaman (nama, barang_id, jumlah, status, waktu_pinjam)
        VALUES (?, ?, ?, 'dipinjam', ?)
      `, [nama, barang_id, jumlahInt, waktu_pinjam], function(insertErr) {
        if (insertErr) {
          return res.status(500).json({ error: "Database error", details: insertErr.message });
        }
        res.status(201).json({ success: true, id: this.lastID });
      });
    });
  });
});

// KEMBALIKAN
app.put("/peminjaman/:id", (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Invalid ID" });
  }
  
  const now = new Date().toISOString();

  db.get("SELECT barang_id, jumlah, status FROM peminjaman WHERE id=?", [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: "Peminjaman tidak ditemukan" });
    }
    if (row.status === 'kembali') {
      return res.status(400).json({ error: "Item sudah dikembalikan" });
    }

    db.run("UPDATE barang SET stok = stok + ? WHERE id=?", [row.jumlah, row.barang_id], (updateErr) => {
      if (updateErr) {
        return res.status(500).json({ error: "Database error", details: updateErr.message });
      }
      
      db.run(`
        UPDATE peminjaman
        SET status='kembali', waktu_kembali=?
        WHERE id=?
      `, [now, id], (updateErr2) => {
        if (updateErr2) {
          return res.status(500).json({ error: "Database error", details: updateErr2.message });
        }
        res.json({ success: true });
      });
    });
  });
});

// DELETE KUNJUNGAN
app.delete("/kunjungan/:id", (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Invalid ID" });
  }
  
  db.run("DELETE FROM kunjungan WHERE id=?", [id], function(err) {
    if (err) {
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Kunjungan tidak ditemukan" });
    }
    res.json({ success: true });
  });
});

// DELETE PEMINJAMAN
app.delete("/peminjaman/:id", (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Invalid ID" });
  }
  
  db.get("SELECT barang_id, jumlah, status FROM peminjaman WHERE id=?", [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: "Peminjaman tidak ditemukan" });
    }

    if (row.status === 'dipinjam') {
      db.run("UPDATE barang SET stok = stok + ? WHERE id=?", [row.jumlah, row.barang_id], (updateErr) => {
        if (updateErr) {
          return res.status(500).json({ error: "Database error", details: updateErr.message });
        }
        
        db.run("DELETE FROM peminjaman WHERE id=?", [id], (deleteErr) => {
          if (deleteErr) {
            return res.status(500).json({ error: "Database error", details: deleteErr.message });
          }
          res.json({ success: true });
        });
      });
    } else {
      db.run("DELETE FROM peminjaman WHERE id=?", [id], (deleteErr) => {
        if (deleteErr) {
          return res.status(500).json({ error: "Database error", details: deleteErr.message });
        }
        res.json({ success: true });
      });
    }
  });
});

app.listen(3000, () => console.log("http://localhost:3000"));