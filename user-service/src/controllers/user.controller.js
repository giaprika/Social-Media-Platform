const Users = require("../models/user.model");
const cache = require("../utils/cache");
const {
  publishUserFollowed,
  publishUserUnfollowed,
} = require("../utils/rabbitmq");

const userCtrl = {
  searchUser: async (req, res) => {
    try {
      const q = req.query.username || "";
      const cacheKey = `cache:users:searchUser:${q}`;
      const cached = await cache.get(cacheKey);
      if (cached) return res.json(cached);

      const users = await Users.find({ username: { $regex: q } })
        .limit(10)
        .select("fullname username avatar");
      const payload = { users };
      await cache.set(cacheKey, payload);
      res.json(payload);
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  getUser: async (req, res) => {
    try {
      const cacheKey = `cache:users:getUser:${req.params.id}`;
      const cached = await cache.get(cacheKey);
      if (cached) return res.json(cached);

      const user = await Users.findById(req.params.id)
        .select("-password")
        .populate("followers following", "-password");
      if (!user)
        return res.status(400).json({ msg: "requested user does not exist." });

      const payload = { user };
      await cache.set(cacheKey, payload);
      res.json(payload);
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  updateUser: async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const { avatar, fullname, mobile, address, story, website, gender } =
        req.body;
      if (!fullname)
        return res.status(400).json({ msg: "Please add your full name." });

      await Users.findOneAndUpdate(
        { _id: userId },
        { avatar, fullname, mobile, address, story, website, gender }
      );
      // invalidate user cache
      await cache.del(`cache:users:getUser:${userId}`);
      await cache.del("cache:users:*");

      res.json({ msg: "Profile updated successfully." });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  follow: async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const user = await Users.find({
        _id: req.params.id,
        followers: userId,
      });
      if (user.length > 0)
        return res
          .status(500)
          .json({ msg: "You are already following this user." });

      const newUser = await Users.findOneAndUpdate(
        { _id: req.params.id },
        { $push: { followers: userId } },
        { new: true }
      ).populate("followers following", "-password");

      await Users.findOneAndUpdate(
        { _id: userId },
        { $push: { following: req.params.id } },
        { new: true }
      );
      // invalidate caches for affected users
      await cache.del(`cache:users:getUser:${req.params.id}`);
      await cache.del(`cache:users:getUser:${userId}`);
      await cache.del("cache:users:*");

      // Publish event to notification queue
      publishUserFollowed({
        followerId: userId,
        followedUserId: req.params.id,
      }).catch((err) =>
        console.error("Failed to publish user followed event:", err)
      );

      res.json({ newUser });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  unfollow: async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const newUser = await Users.findOneAndUpdate(
        { _id: req.params.id },
        { $pull: { followers: userId } },
        { new: true }
      ).populate("followers following", "-password");

      await Users.findOneAndUpdate(
        { _id: userId },
        { $pull: { following: req.params.id } },
        { new: true }
      );
      // invalidate caches for affected users
      await cache.del(`cache:users:getUser:${req.params.id}`);
      await cache.del(`cache:users:getUser:${userId}`);
      await cache.del("cache:users:*");

      // Publish unfollow event (remove notification)
      publishUserUnfollowed({
        followerId: userId,
        followedUserId: req.params.id,
      }).catch((err) =>
        console.error("Failed to publish user unfollowed event:", err)
      );

      res.json({ newUser });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  suggestionsUser: async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const cacheKey = `cache:users:suggestionsUser:${userId}:${JSON.stringify(
        req.query || {}
      )}`;
      const cached = await cache.get(cacheKey);
      if (cached) return res.json(cached);

      const user = await Users.findById(userId)
        .select("-password")
        .populate("followers following", "-password");
      const newArr = [...user.following, user._id];
      const num = req.query.num || 10;
      const users = await Users.aggregate([
        { $match: { _id: { $nin: newArr } } },
        { $sample: { size: Number(num) } },
        {
          $lookup: {
            from: "users",
            localField: "followers",
            foreignField: "_id",
            as: "followers",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "following",
            foreignField: "_id",
            as: "following",
          },
        },
      ]).project("-password");

      const payload = { users, result: users.length };
      await cache.set(cacheKey, payload);
      return res.json(payload);
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  savePost: async (req, res) => {
    try {
      const { postId } = req.body;
      const user = await Users.findById(req.params.id);
      if (!user) return res.status(404).json({ msg: "User not found" });

      if (user.saved.includes(postId))
        return res.status(400).json({ msg: "Already saved this post" });

      user.saved.push(postId);
      await user.save();
      // invalidate related caches for this user
      await cache.del(`cache:users:getUser:${req.params.id}`);
      await cache.del(`cache:users:suggestionsUser:${req.params.id}:*`);

      res.json({ msg: "Post saved successfully" });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  },

  unSavePost: async (req, res) => {
    try {
      const { postId } = req.body;
      const user = await Users.findById(req.params.id);

      if (!user) return res.status(404).json({ msg: "User does not exist." });

      if (!user.saved.includes(postId))
        return res
          .status(400)
          .json({ msg: "This post is not in your saved list." });

      user.saved = user.saved.filter((p) => p.toString() !== postId);
      await user.save();
      // invalidate related caches for this user
      await cache.del(`cache:users:getUser:${req.params.id}`);
      await cache.del(`cache:users:suggestionsUser:${req.params.id}:*`);

      res.json({ msg: "Post removed from collection successfully." });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  },
};

module.exports = userCtrl;
