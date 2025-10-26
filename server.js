// Bootstrap environment and app using the new modular structure
const http = require("http");
const app = require("./src/app");
const { connectDB } = require("./src/config/db");
const { PORT } = require("./src/config/env");
const SocketServer = require("./socketServer");

// Create HTTP server and bind Socket.io
const server = http.createServer(app);
const io = require("socket.io")(server);

io.on("connection", (socket) => {
  SocketServer(socket);
});

// Connect to database and start server
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log("Listening on", PORT);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to database:", err.message);
    process.exit(1);
  });
