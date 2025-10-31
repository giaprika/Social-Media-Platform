const app = require("./app");
const { connectDB } = require("./src/config/db");
const { PORT } = require("./src/config/env");

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Post Service listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to database:", err.message);
    process.exit(1);
  });
