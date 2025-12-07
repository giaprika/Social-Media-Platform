const app = require("./app");
const { connectDB } = require("./src/config/db");
const { PORT } = require("./src/config/env");
const { startConsumer } = require("./src/consumers/notificationConsumer");
const { connectSocket } = require("./src/utils/socketClient");

const CONSUMER_ONLY = process.env.CONSUMER_ONLY === "true";

connectDB()
  .then(() => {
    if (CONSUMER_ONLY) {
      // Consumer-only mode: skip Express server, just start consumer
      console.log(
        `Notification Consumer started (Consumer-only mode on port ${PORT})`
      );
      connectSocket();
      startConsumer().catch((err) => {
        console.error("Failed to start notification consumer:", err.message);
      });
    } else {
      // Normal mode: start Express server + consumer
      app.listen(PORT, () => {
        console.log(`Notification Service listening on port ${PORT}`);

        // Connect to Gateway Socket.IO
        connectSocket();

        // Start RabbitMQ consumer for notification events
        startConsumer().catch((err) => {
          console.error("Failed to start notification consumer:", err.message);
        });
      });
    }
  })
  .catch((err) => {
    console.error("Failed to connect to database:", err.message);
    process.exit(1);
  });
