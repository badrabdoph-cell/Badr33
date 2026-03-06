import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use((_req, res, next) => {
    res.setHeader("Content-Language", "ar");
    next();
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", async (_req, res) => {
    try {
      const indexPath = path.join(staticPath, "index.html");
      const html = await fs.readFile(indexPath, "utf-8");
      res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).send(html);
    } catch (error) {
      res.status(500).send("Internal Server Error");
      console.error("[Server] Failed to render index.html", error);
    }
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
