const amqp = require("amqplib");

let channel = null;
let connection = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";
const NOTIFICATION_QUEUE = "notification_events";

// Connect to RabbitMQ
const connectRabbitMQ = async () => {
  try {
    if (connection && channel) {
      return channel;
    }

    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertQueue(NOTIFICATION_QUEUE, { durable: true });

    connection.on("error", (err) => {
      console.error("RabbitMQ connection error:", err.message);
      channel = null;
      connection = null;
    });

    connection.on("close", () => {
      console.log("RabbitMQ connection closed. Reconnecting...");
      channel = null;
      connection = null;
      setTimeout(connectRabbitMQ, 5000);
    });

    console.log("✅ RabbitMQ connected (User Service)");
    return channel;
  } catch (err) {
    console.error("Failed to connect to RabbitMQ:", err.message);
    setTimeout(connectRabbitMQ, 5000);
    return null;
  }
};

// Publish event to notification queue
const publishNotificationEvent = async (eventData) => {
  try {
    const ch = channel || (await connectRabbitMQ());
    if (!ch) {
      console.error("RabbitMQ channel not available. Event not published.");
      return false;
    }

    const message = JSON.stringify({
      ...eventData,
      timestamp: new Date().toISOString(),
    });

    ch.sendToQueue(NOTIFICATION_QUEUE, Buffer.from(message), {
      persistent: true,
    });

    console.log(`📤 Event published: ${eventData.type}`);
    return true;
  } catch (err) {
    console.error("Failed to publish event:", err.message);
    return false;
  }
};

// Event types
const NotificationEvents = {
  USER_FOLLOWED: "USER_FOLLOWED",
  USER_UNFOLLOWED: "USER_UNFOLLOWED",
};

const publishUserFollowed = async ({ followerId, followedUserId }) => {
  return publishNotificationEvent({
    type: NotificationEvents.USER_FOLLOWED,
    data: {
      userId: followerId,
      recipients: [followedUserId],
      url: `/profile/${followerId}`,
      text: "started following you",
    },
  });
};

const publishUserUnfollowed = async ({ followerId, followedUserId }) => {
  return publishNotificationEvent({
    type: NotificationEvents.USER_UNFOLLOWED,
    data: {
      userId: followerId,
      recipients: [followedUserId],
      url: `/profile/${followerId}`,
    },
  });
};

// Initialize connection on module load
connectRabbitMQ();

module.exports = {
  connectRabbitMQ,
  publishNotificationEvent,
  NotificationEvents,
  publishUserFollowed,
  publishUserUnfollowed,
};
