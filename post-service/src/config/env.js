const path = require("path");
const dotenv = require("dotenv");

// Load .env from project root
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const config = {
  PORT: process.env.PORT || 8002,
  MONGODB_URL: process.env.MONGODB_URL,
  USER_SERVICE_URL: process.env.USER_SERVICE_URL,
};

module.exports = config;
