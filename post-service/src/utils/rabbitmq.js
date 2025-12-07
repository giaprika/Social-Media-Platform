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

    console.log("RabbitMQ connected (Post Service)");
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

    console.log(`Event published: ${eventData.type}`);
    return true;
  } catch (err) {
    console.error("Failed to publish event:", err.message);
    return false;
  }
};

// Event types and helper functions
const NotificationEvents = {
  POST_CREATED: "POST_CREATED",
  POST_LIKED: "POST_LIKED",
  POST_UNLIKED: "POST_UNLIKED",
  COMMENT_CREATED: "COMMENT_CREATED",
  COMMENT_LIKED: "COMMENT_LIKED",
};

const publishPostCreated = async ({ postId, userId, postOwnerId, content }) => {
  if (userId === postOwnerId) return; // Don't notify self

  return publishNotificationEvent({
    type: NotificationEvents.POST_CREATED,
    data: {
      postId,
      userId,
      recipients: [postOwnerId],
      url: `/post/${postId}`,
      text: "created a new post",
      content,
    },
  });
};

const publishPostLiked = async ({ postId, userId, postOwnerId }) => {
  if (userId === postOwnerId) return; // Don't notify self

  return publishNotificationEvent({
    type: NotificationEvents.POST_LIKED,
    data: {
      postId,
      userId,
      recipients: [postOwnerId],
      url: `/post/${postId}`,
      text: "liked your post",
    },
  });
};

const publishPostUnliked = async ({ postId, userId, postOwnerId }) => {
  return publishNotificationEvent({
    type: NotificationEvents.POST_UNLIKED,
    data: {
      postId,
      userId,
      recipients: [postOwnerId],
      url: `/post/${postId}`,
    },
  });
};

const publishCommentCreated = async ({
  commentId,
  postId,
  userId,
  postOwnerId,
  content,
  tag,
}) => {
  const recipients = [postOwnerId];
  // Add tagged users to recipients
  if (tag && tag._id && tag._id !== userId) {
    recipients.push(tag._id);
  }

  // Remove duplicates and self
  const uniqueRecipients = [...new Set(recipients)].filter((r) => r !== userId);
  if (uniqueRecipients.length === 0) return;

  return publishNotificationEvent({
    type: NotificationEvents.COMMENT_CREATED,
    data: {
      commentId,
      postId,
      userId,
      recipients: uniqueRecipients,
      url: `/post/${postId}`,
      text: tag ? "mentioned you in a comment" : "commented on your post",
      content,
    },
  });
};

const publishCommentLiked = async ({
  commentId,
  postId,
  userId,
  commentOwnerId,
}) => {
  if (userId === commentOwnerId) return;

  return publishNotificationEvent({
    type: NotificationEvents.COMMENT_LIKED,
    data: {
      commentId,
      postId,
      userId,
      recipients: [commentOwnerId],
      url: `/post/${postId}`,
      text: "liked your comment",
    },
  });
};

// Initialize connection on module load
connectRabbitMQ();

module.exports = {
  connectRabbitMQ,
  publishNotificationEvent,
  NotificationEvents,
  publishPostCreated,
  publishPostLiked,
  publishPostUnliked,
  publishCommentCreated,
  publishCommentLiked,
};
