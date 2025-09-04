import express from "express";
import cors from "cors";
import multer from "multer";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// __dirname and __filename in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -------------------- Supabase Client --------------------
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SCRETE_KEY; 
const supabase = createClient(supabaseUrl, supabaseSecretKey);

// -------------------- Middleware --------------------
const allowedOrigins = [
  "http://localhost:5173", // local frontend
  "https://frontend-eta-bay-40.vercel.app" // deployed frontend
];

// CORS middleware
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like Postman) or allowed origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS policy: This origin is not allowed."));
      }
    },
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    credentials: true,
  })
);
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

// -------------------- SQLite Database --------------------
let db;
const initDB = async () => {
  db = await open({
    filename: path.join(__dirname, "database.db"),
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS recordings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      url TEXT NOT NULL,
      filesize INTEGER NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log("SQLite DB initialized with recordings table");
};

// -------------------- Routes --------------------

// Upload recording
app.post("/api/recordings", upload.single("recording"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const { buffer, size } = req.file;
    const uniqueName = `recording-${Date.now()}.webm`; // e.g., recording-timeStamp.webm

    // Upload to Supabase Storage
    const { error: storageError } = await supabase.storage
      .from("uploads") //  bucket name in supabase
      .upload(uniqueName, buffer, { contentType: "video/webm" });

    if (storageError) throw storageError;

    // Getting public URL
    const { data: urlData } = supabase.storage
      .from("uploads")
      .getPublicUrl(uniqueName);

    const publicUrl = urlData.publicUrl;

    // Saving the metadata in SQLite (saving the public URL from Supabase)
    const result = await db.run(
      `INSERT INTO recordings (filename, url, filesize) VALUES (?, ?, ?)`,
      [uniqueName, publicUrl, size]
    );

    res.status(201).json({
      message: "Recording uploaded successfully",
      recording: {
        id: result.lastID,
        filename: uniqueName,
        url: publicUrl,
        filesize: size,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("Upload failed:", err);
    res.status(500).json({ error: "Failed to upload recording" });
  }
});

// Listing all recordings
app.get("/api/recordings", async (_req, res) => {
  try {
    const recordings = await db.all(
      `SELECT * FROM recordings ORDER BY createdAt DESC`
    );
    res.json(recordings);
  } catch (err) {
    console.error("Error fetching recordings:", err);
    res.status(500).json({ error: "Failed to fetch recordings" });
  }
});

// Streaming a recording by ID (redirect to Supabase public URL)
app.get("/api/recordings/:id", async (req, res) => {
  try {
    const recording = await db.get(
      `SELECT * FROM recordings WHERE id = ?`,
      [req.params.id]
    );

    if (!recording) return res.status(404).json({ error: "Recording not found" });

    res.redirect(recording.url);
  } catch (err) {
    console.error("Error streaming recording:", err);
    res.status(500).json({ error: "Failed to stream recording" });
  }
});

// Deleting a recording by ID
app.delete("/api/recordings/:id", async (req, res) => {
  try {
    const id = req.params.id;

    // Getting the recording file with id from local DB
    const recording = await db.get(`SELECT * FROM recordings WHERE id = ?`, [id]);
    if (!recording) return res.status(404).json({ error: "Recording not found" });

    // Deleting the recording file from Supabase Storage
   const fileName = recording.url.split("/").pop();
    const { error: storageError } = await supabase.storage
      .from("uploads")
      .remove([fileName]);

    if (storageError) {
      console.error("Supabase delete error:", storageError);
      return res.status(500).json({ error: "Failed to delete file from Supabase" });
    }

    // Deleting the recording file  from SQLite DB
    await db.run(`DELETE FROM recordings WHERE id = ?`, [id]);

    res.json({ message: "Recording deleted successfully" });
  } catch (err) {
    console.error("Delete failed:", err);
    res.status(500).json({ error: "Failed to delete recording" });
  }
});

// -------------------- Serve Frontend --------------------
const frontendDir = path.join(__dirname, "../frontend");

let buildFolder = null;
if (fs.existsSync(path.join(frontendDir, "dist"))) {
  buildFolder = path.join(frontendDir, "dist"); // Vite
} else if (fs.existsSync(path.join(frontendDir, "build"))) {
  buildFolder = path.join(frontendDir, "build"); // CRA
}

if (buildFolder) {
  app.use(express.static(buildFolder));

  // catch-all for SPA routing
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(buildFolder, "index.html"));
  });
} else {
  console.warn("No frontend build found. Run 'npm run build' in frontend folder.");
}

// -------------------- 404 Fallback --------------------
app.use((_req, res) => {
  res.status(404).send("Route not found");
});

// -------------------- Start Server --------------------
const startServer = async () => {
  try {
    await initDB(); // Initialize DB before starting server
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`); 
    });

    process.on("SIGINT", async () => {
      console.log("\n Closing server...");
      await db.close();
      process.exit(0);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

startServer();
