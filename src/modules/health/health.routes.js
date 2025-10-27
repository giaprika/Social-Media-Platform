const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

// Health check endpoint
router.get("/health", async (req, res) => {
  const health = {
    status: "UP",
    uptime: process.uptime(),
    timestamp: new Date(),
    checks: {
      mongo: "UNKNOWN",
    },
  };

  // --- Check MongoDB connection ---
  try {
    await mongoose.connection.db.admin().ping();
    health.checks.mongo = "UP";
  } catch (err) {
    health.checks.mongo = "DOWN";
    health.status = "DEGRADED";
  }

  const code = health.status === "UP" ? 200 : 503;
  res.status(code).json(health);
});

module.exports = router;
