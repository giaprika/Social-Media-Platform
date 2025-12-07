const { io } = require("socket.io-client");

const GATEWAY_SOCKET_URL =
  process.env.GATEWAY_SOCKET_URL || "http://localhost:8080";

let socket = null;

// Connect to Gateway Socket.IO server
const connectSocket = () => {
  try {
    if (socket && socket.connected) {
      return socket;
    }

    socket = io(GATEWAY_SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socket.on("connect", () => {
      console.log(`Socket.IO connected to Gateway: ${GATEWAY_SOCKET_URL}`);
      // Join as notification service (for internal communication if needed)
      socket.emit("joinService", "notification-service");
    });

    socket.on("disconnect", () => {
      console.log("Socket.IO disconnected from Gateway");
    });

    socket.on("connect_error", (err) => {
      console.error("Socket.IO connection error:", err.message);
    });

    return socket;
  } catch (err) {
    console.error("Failed to connect to Gateway Socket:", err.message);
    return null;
  }
};

// Emit notification to clients via Gateway
const emitNotificationToClients = (eventType, payload) => {
  try {
    const sock = socket || connectSocket();
    if (!sock || !sock.connected) {
      console.error("Socket not connected. Cannot emit notification.");
      return false;
    }

    sock.emit(eventType, payload);
    console.log(`Socket emitted: ${eventType}`);
    return true;
  } catch (err) {
    console.error("Failed to emit socket event:", err.message);
    return false;
  }
};

// Get socket instance
const getSocket = () => {
  return socket || connectSocket();
};

module.exports = {
  connectSocket,
  emitNotificationToClients,
  getSocket,
};
