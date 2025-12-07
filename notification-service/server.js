const app = require("./app");
const { connectDB } = require("./src/config/db");
const { PORT } = require("./src/config/env");
const { startConsumer } = require("./src/consumers/notificationConsumer");
const { connectSocket } = require("./src/utils/socketClient");

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Notification Service listening on port ${PORT}`);

      // Connect to Gateway Socket.IO
      connectSocket();

      // Start RabbitMQ consumer for notification events
      startConsumer().catch((err) => {
        console.error("Failed to start notification consumer:", err.message);
      });
    });
  })
  .catch((err) => {
    console.error("Failed to connect to database:", err.message);
    process.exit(1);
  });
