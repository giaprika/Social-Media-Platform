const cookieParser = require("cookie-parser");
const express = require("express");

const app = express();
app.use(cookieParser());

const userRoutes = require("./src/routes/user.routes");
const authRoutes = require("./src/routes/auth.routes");

app.use(express.json());
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const timestamp = new Date().toISOString();
    console.log(
      `[${timestamp}] [${req.method}] ${req.originalUrl} → ${res.statusCode} (${duration}ms)`
    );
  });

  next();
});

app.use("/api/", userRoutes);
app.use("/api/", authRoutes);

module.exports = app;
