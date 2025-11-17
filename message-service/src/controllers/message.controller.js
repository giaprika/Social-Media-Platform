const Conversations = require("../models/conversation.model");
const Messages = require("../models/message.model");
const axios = require("axios");
const config = require("../config/env");
const cache = require("../utils/cache");

const USER_SERVICE_URL = config.USER_SERVICE_URL;

class APIfeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }
  paginating() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 9;
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

const messageCtrl = {
  createMessage: async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const { recipient, text, media } = req.body;
      if (!recipient || (!text.trim() && media.length === 0)) return;

      const newConversation = await Conversations.findOneAndUpdate(
        {
          $or: [
            { recipients: [userId, recipient] },
            { recipients: [recipient, userId] },
          ],
        },
        { recipients: [userId, recipient], text, media },
        { new: true, upsert: true }
      );

      const newMessage = new Messages({
        conversation: newConversation._id,
        sender: userId,
        recipient,
        text,
        media,
      });
      await newMessage.save();
      // invalidate messages cache for relevant users
      await cache.del("cache:messages:*");
      res.json({ msg: "Created." });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  getConversations: async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const cacheKey = `cache:messages:getConversations:${userId}:${JSON.stringify(
        req.query || {}
      )}`;
      const cached = await cache.get(cacheKey);
      if (cached) return res.json(cached);
      const features = new APIfeatures(
        Conversations.find({ recipients: userId }),
        req.query
      ).paginating();

      const conversations = await features.query.sort("-updatedAt");

      // Gọi sang user-service để lấy thông tin người dùng
      const conversationsWithUser = await Promise.all(
        conversations.map(async (conv) => {
          const otherUserId = conv.recipients.find((id) => id !== userId);

          try {
            const { data: user } = await axios.get(
              `${USER_SERVICE_URL}/user/${otherUserId}`
            );
            return { ...conv._doc, user };
          } catch {
            return { ...conv._doc, user: null };
          }
        })
      );

      const payload = {
        msg: "Success",
        result: conversationsWithUser.length,
        conversations: conversationsWithUser,
      };
      await cache.set(cacheKey, payload);
      res.json(payload);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ msg: err.message });
    }
  },

  getMessages: async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const cacheKey = `cache:messages:getMessages:${userId}:${
        req.params.id
      }:${JSON.stringify(req.query || {})}`;
      const cached = await cache.get(cacheKey);
      if (cached) return res.json(cached);
      const features = new APIfeatures(
        Messages.find({
          $or: [
            { sender: userId, recipient: req.params.id },
            { sender: req.params.id, recipient: userId },
          ],
        }),
        req.query
      ).paginating();

      const messages = await features.query.sort("-createdAt");
      const payload = { messages, result: messages.length };
      await cache.set(cacheKey, payload);
      res.json(payload);
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },
};

module.exports = messageCtrl;
