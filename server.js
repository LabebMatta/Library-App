require("dotenv").config({ quiet: true });

const express = require("express");
const path = require("path");
const {
  initializeDatabase,
  getLibraryData,
  toggleLibrary,
  closeDatabase
} = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

app.use(express.json({ limit: "10kb" }));
app.use(express.static(PUBLIC_DIR));

app.get("/api/status", async (_request, response, next) => {
  try {
    response.json(await getLibraryData());
  } catch (error) {
    next(error);
  }
});

app.post("/api/toggle", async (request, response, next) => {
  const username = typeof request.body.username === "string"
    ? request.body.username.trim().replace(/\s+/g, " ")
    : "";

  if (!username) {
    return response.status(400).json({ error: "Please enter your name." });
  }

  if (username.length > 50) {
    return response.status(400).json({ error: "Name must be 50 characters or fewer." });
  }

  try {
    response.json(await toggleLibrary(username));
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: "Something went wrong. Please try again." });
});

async function startServer() {
  await initializeDatabase();
  const server = app.listen(PORT, () => {
    console.log(`Library Status Tracker is running on port ${PORT}`);
  });

  async function shutDown() {
    server.close(async () => {
      await closeDatabase();
      process.exit(0);
    });
  }

  process.on("SIGTERM", shutDown);
  process.on("SIGINT", shutDown);
}

startServer().catch((error) => {
  console.error("Could not start the server:", error);
  process.exit(1);
});
