const express = require("express");
const fs = require("fs/promises");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data.json");
const PUBLIC_DIR = path.join(__dirname, "public");
const MAX_HISTORY = 100;

const createInitialData = () => ({
  status: "CLOSED",
  isOpen: false,
  history: []
});
let updateQueue = Promise.resolve();

app.use(express.json({ limit: "10kb" }));
app.use(express.static(PUBLIC_DIR));

async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }

    await writeData(createInitialData());
    console.log("Created data.json with the default CLOSED status.");
  }
}

async function readData() {
  try {
    const contents = await fs.readFile(DATA_FILE, "utf8");
    const data = JSON.parse(contents);

    if (typeof data.isOpen !== "boolean" || !Array.isArray(data.history)) {
      throw new Error("Invalid data shape");
    }

    data.status = data.isOpen ? "OPEN" : "CLOSED";
    return data;
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Could not read data.json; restoring defaults:", error.message);
    }
    const initialData = createInitialData();
    await writeData(initialData);
    return initialData;
  }
}

async function writeData(data) {
  const temporaryFile = `${DATA_FILE}.tmp`;
  await fs.writeFile(temporaryFile, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(temporaryFile, DATA_FILE);
}

app.get("/api/status", async (_request, response, next) => {
  try {
    response.json(await readData());
  } catch (error) {
    next(error);
  }
});

app.post("/api/toggle", (request, response, next) => {
  const username = typeof request.body.username === "string"
    ? request.body.username.trim().replace(/\s+/g, " ")
    : "";

  if (!username) {
    return response.status(400).json({ error: "Please enter your name." });
  }

  if (username.length > 50) {
    return response.status(400).json({ error: "Name must be 50 characters or fewer." });
  }

  const update = updateQueue.then(async () => {
    const data = await readData();
    data.isOpen = !data.isOpen;
    data.status = data.isOpen ? "OPEN" : "CLOSED";
    data.history.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      username,
      action: data.isOpen ? "opened" : "closed",
      timestamp: new Date().toISOString()
    });
    data.history = data.history.slice(0, MAX_HISTORY);
    await writeData(data);
    return data;
  });

  updateQueue = update.catch(() => undefined);
  update.then((data) => response.json(data)).catch(next);
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: "Something went wrong. Please try again." });
});

async function startServer() {
  await ensureDataFile();
  app.listen(PORT, () => {
    console.log(`Library Status Tracker is running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Could not start the server:", error);
  process.exit(1);
});
