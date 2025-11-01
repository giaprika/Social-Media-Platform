import http from "http";
import { Server as SocketIO } from "socket.io";
import app from "./app.js";
import logger from "./src/utils/logger.js";
import config from "./src/config/index.js";
import SocketServer from "./socketServer.js";

const PORT = config.port;

const server = http.createServer(app);

const io = new SocketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  SocketServer(socket);

  socket.on("disconnect", () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  logger.info(`API Gateway + Socket.IO listening on port ${PORT}`);
});
