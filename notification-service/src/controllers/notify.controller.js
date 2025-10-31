const Notifies = require("../models/notify.model");
const axios = require("axios");
const config = require("../config/env");

const USER_SERVICE_URL = config.USER_SERVICE_URL;

const notifyCtrl = {
  createNotify: async (req, res) => {
    try {
      const { id, recipients, url, text, content, image } = req.body;
      if (recipients.includes(req.user._id.toString())) return;

      const notify = new Notifies({
        id,
        recipients,
        url,
        text,
        content,
        image,
        userId: req.user._id,
      });
      await notify.save();
      return res.json({ notify });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  removeNotify: async (req, res) => {
    try {
      const notify = await Notifies.findOneAndDelete({
        id: req.params.id,
        url: req.query.url,
      });
      return res.json({ notify });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  getNotifies: async (req, res) => {
    try {
      const notifies = await Notifies.find({
        recipients: req.user._id,
      }).sort("-createdAt");

      // Gọi sang user-service để lấy thông tin người gửi
      const notifiesWithUser = await Promise.all(
        notifies.map(async (n) => {
          try {
            const { data: user } = await axios.get(
              `${USER_SERVICE_URL}/user/${n.userId}`
            );
            return { ...n._doc, user };
          } catch {
            return { ...n._doc, user: null };
          }
        })
      );

      return res.json({
        msg: "Success",
        result: notifiesWithUser.length,
        notifies: notifiesWithUser,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ msg: err.message });
    }
  },

  isReadNotify: async (req, res) => {
    try {
      const notifies = await Notifies.findOneAndUpdate(
        { _id: req.params.id },
        { isRead: true }
      );
      return res.json({ notifies });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  deleteAllNotifies: async (req, res) => {
    try {
      const notifies = await Notifies.deleteMany({ recipients: req.user._id });
      return res.json({ notifies });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },
};

module.exports = notifyCtrl;
