const express = require("express");

const app = express();

const postRoutes = require("./src/routes/post.routes");
const commentRoutes = require("./src/routes/comment.routes");

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

app.use("/api/", postRoutes);
app.use("/api/", commentRoutes);

module.exports = app;
