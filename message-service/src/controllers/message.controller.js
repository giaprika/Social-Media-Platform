const Conversations = require("../models/conversation.model");
const Messages = require("../models/message.model");
const axios = require("axios");
const config = require("../config/env");

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
      res.json({ msg: "Created." });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  getConversations: async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
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

      res.json({
        msg: "Success",
        result: conversationsWithUser.length,
        conversations: conversationsWithUser,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ msg: err.message });
    }
  },

  getMessages: async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
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
      res.json({ messages, result: messages.length });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },
};

module.exports = messageCtrl;
