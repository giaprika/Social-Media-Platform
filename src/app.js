const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { FRONTEND_ORIGIN } = require("./config/env");
const errorHandler = require("./middleware/errorHandler");

// Import module routes
const authRoutes = require("./modules/auth/auth.routes");
const userRoutes = require("./modules/user/user.routes");
const postRoutes = require("./modules/post/post.routes");
const commentRoutes = require("./modules/comment/comment.routes");
const adminRoutes = require("./modules/admin/admin.routes");
const notifyRoutes = require("./modules/notify/notify.routes");
const messageRoutes = require("./modules/message/message.routes");

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));

// Routes
app.use("/api", authRoutes);
app.use("/api", userRoutes);
app.use("/api", postRoutes);
app.use("/api", commentRoutes);
app.use("/api", adminRoutes);
app.use("/api", notifyRoutes);
app.use("/api", messageRoutes);

// Error handler (last)
app.use(errorHandler);

module.exports = app;
