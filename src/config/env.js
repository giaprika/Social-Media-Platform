const path = require("path");
const dotenv = require("dotenv");

// Load .env from project root
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const config = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT || 8080,
  MONGODB_URL: process.env.MONGODB_URL,
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
};

module.exports = config;
