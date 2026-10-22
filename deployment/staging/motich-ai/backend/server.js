const express = require("express");
const cors = require("cors");
const chatRoutes = require("./routes/chatRoutes");

const app = express();

const PORT = Number(process.env.PORT || 5005);
const HOST = "127.0.0.1";

// Allow requests from the local React development server.
app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);

// Parse incoming JSON request bodies.
app.use(express.json({ limit: "1mb" }));

// Health-check endpoint.
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    application: "MOTICH AI",
    service: "backend",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/chat", chatRoutes);

// Handle unknown API endpoints.
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
  });
});

// Start the server.
app.listen(PORT, HOST, () => {
  console.log(`MOTICH AI backend running at http://${HOST}:${PORT}`);
});

