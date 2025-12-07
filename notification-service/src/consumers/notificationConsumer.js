const amqp = require("amqplib");
const Notifies = require("../models/notify.model");
const cache = require("../utils/cache");
const { emitNotificationToClients } = require("../utils/socketClient");

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";
const NOTIFICATION_QUEUE = "notification_events";

let channel = null;
let connection = null;
let isConsumerStarted = false;

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
      isConsumerStarted = false;
    });

    connection.on("close", () => {
      console.log("RabbitMQ connection closed. Reconnecting...");
      channel = null;
      connection = null;
      isConsumerStarted = false;
      setTimeout(() => {
        connectRabbitMQ().then(() => {
          if (!isConsumerStarted) {
            startConsumer();
          }
        });
      }, 5000);
    });

    console.log("RabbitMQ connected (Notification Service)");
    return channel;
  } catch (err) {
    console.error("Failed to connect to RabbitMQ:", err.message);
    setTimeout(() => {
      connectRabbitMQ().then((ch) => {
        if (ch && !isConsumerStarted) {
          startConsumer();
        }
      });
    }, 5000);
    return null;
  }
};

// Process notification event
const processNotificationEvent = async (eventData) => {
  try {
    const { type, data } = eventData;

    console.log(`Processing event: ${type}`);

    switch (type) {
      case "POST_CREATED":
        await handlePostCreated(data);
        break;
      case "POST_LIKED":
        await handlePostLiked(data);
        break;
      case "POST_UNLIKED":
        await handlePostUnliked(data);
        break;
      case "COMMENT_CREATED":
        await handleCommentCreated(data);
        break;
      case "COMMENT_LIKED":
        await handleCommentLiked(data);
        break;
      case "USER_FOLLOWED":
        await handleUserFollowed(data);
        break;
      case "USER_UNFOLLOWED":
        await handleUserUnfollowed(data);
        break;
      default:
        console.log(`Unknown event type: ${type}`);
    }
  } catch (err) {
    console.error("Error processing notification event:", err.message);
    throw err;
  }
};

// Handler functions for each event type
const handlePostCreated = async (data) => {
  const { postId, userId, recipients, url, text, content } = data;

  const notify = new Notifies({
    id: postId,
    recipients,
    url,
    text,
    content: content || "",
    userId,
  });

  await notify.save();

  // Invalidate cache for recipients
  for (const recipientId of recipients) {
    await cache.del(`cache:notifications:getNotifies:${recipientId}:*`);
  }

  console.log(`Notification created: Post created by ${userId}`);
};

const handlePostLiked = async (data) => {
  const { postId, userId, recipients, url, text } = data;

  // Check if notification already exists (prevent duplicates)
  const existing = await Notifies.findOne({
    id: postId,
    userId,
    text: "liked your post",
  });

  if (existing) {
    console.log(`Notification already exists for post like`);
    return;
  }

  const notify = new Notifies({
    id: postId,
    recipients,
    url,
    text,
    userId,
  });

  await notify.save();

  // Invalidate cache for recipients
  for (const recipientId of recipients) {
    await cache.del(`cache:notifications:getNotifies:${recipientId}:*`);
  }

  // Emit socket event to clients via Gateway
  emitNotificationToClients("createNotify", {
    ...notify._doc,
    user: { _id: userId }, // Basic user info (can be enriched if needed)
  });

  console.log(`Notification created: Post liked by ${userId}`);
};

const handlePostUnliked = async (data) => {
  const { postId, userId } = data;

  // Remove like notification
  const result = await Notifies.findOneAndDelete({
    id: postId,
    userId,
    text: "liked your post",
  });

  if (result && result.recipients) {
    for (const recipientId of result.recipients) {
      await cache.del(`cache:notifications:getNotifies:${recipientId}:*`);
    }

    // Emit socket event to remove notification
    emitNotificationToClients("removeNotify", {
      id: postId,
      userId,
      recipients: result.recipients,
      url: result.url,
    });

    console.log(`Notification removed: Post unliked by ${userId}`);
  }
};

const handleCommentCreated = async (data) => {
  const { commentId, postId, userId, recipients, url, text, content } = data;

  const notify = new Notifies({
    id: commentId || postId,
    recipients,
    url,
    text,
    content: content || "",
    userId,
  });

  await notify.save();

  // Invalidate cache for recipients
  for (const recipientId of recipients) {
    await cache.del(`cache:notifications:getNotifies:${recipientId}:*`);
  }

  // Emit socket event to clients
  emitNotificationToClients("createNotify", {
    ...notify._doc,
    user: { _id: userId },
  });

  console.log(`Notification created: Comment by ${userId}`);
};

const handleCommentLiked = async (data) => {
  const { commentId, postId, userId, recipients, url, text } = data;

  // Check if notification already exists
  const existing = await Notifies.findOne({
    id: commentId,
    userId,
    text: "liked your comment",
  });

  if (existing) {
    console.log(`Notification already exists for comment like`);
    return;
  }

  const notify = new Notifies({
    id: commentId,
    recipients,
    url,
    text,
    userId,
  });

  await notify.save();

  // Invalidate cache for recipients
  for (const recipientId of recipients) {
    await cache.del(`cache:notifications:getNotifies:${recipientId}:*`);
  }

  // Emit socket event
  emitNotificationToClients("createNotify", {
    ...notify._doc,
    user: { _id: userId },
  });

  console.log(`Notification created: Comment liked by ${userId}`);
};

const handleUserFollowed = async (data) => {
  const { userId, recipients, url, text } = data;

  const notify = new Notifies({
    id: userId,
    recipients,
    url,
    text,
    userId,
  });

  await notify.save();

  // Invalidate cache for recipients
  for (const recipientId of recipients) {
    await cache.del(`cache:notifications:getNotifies:${recipientId}:*`);
  }

  // Emit socket event
  emitNotificationToClients("createNotify", {
    ...notify._doc,
    user: { _id: userId },
  });

  console.log(`Notification created: User ${userId} followed`);
};

const handleUserUnfollowed = async (data) => {
  const { userId, recipients } = data;

  // Remove follow notification
  const result = await Notifies.findOneAndDelete({
    id: userId,
    userId,
    text: "started following you",
  });

  if (result && result.recipients) {
    for (const recipientId of result.recipients) {
      await cache.del(`cache:notifications:getNotifies:${recipientId}:*`);
    }

    // Emit socket event to remove notification
    emitNotificationToClients("removeNotify", {
      id: userId,
      userId,
      recipients: result.recipients,
      url: result.url,
    });

    console.log(`Notification removed: User ${userId} unfollowed`);
  }
};

// Start consuming messages from the queue
const startConsumer = async () => {
  try {
    const ch = await connectRabbitMQ();
    if (!ch) {
      console.log("⏳ Waiting for RabbitMQ connection...");
      setTimeout(startConsumer, 5000);
      return;
    }

    if (isConsumerStarted) {
      console.log("Consumer already running");
      return;
    }

    // Prefetch only 1 message at a time to ensure fair distribution
    ch.prefetch(1);

    console.log(
      `📥 RabbitMQ consumer started, waiting for messages in queue: ${NOTIFICATION_QUEUE}`
    );

    ch.consume(
      NOTIFICATION_QUEUE,
      async (msg) => {
        if (msg !== null) {
          try {
            const eventData = JSON.parse(msg.content.toString());
            await processNotificationEvent(eventData);
            ch.ack(msg); // Acknowledge successful processing
          } catch (err) {
            console.error("Error processing message:", err.message);
            // Reject and requeue the message if processing fails
            ch.nack(msg, false, true);
          }
        }
      },
      { noAck: false }
    );

    isConsumerStarted = true;
  } catch (err) {
    console.error("Failed to start consumer:", err.message);
    setTimeout(startConsumer, 5000);
  }
};

module.exports = {
  connectRabbitMQ,
  startConsumer,
};
