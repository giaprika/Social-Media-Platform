const Users = require("../models/user.model");

const userCtrl = {
  searchUser: async (req, res) => {
    try {
      const users = await Users.find({
        username: { $regex: req.query.username },
      })
        .limit(10)
        .select("fullname username avatar");
      res.json({ users });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  getUser: async (req, res) => {
    try {
      const user = await Users.findById(req.params.id)
        .select("-password")
        .populate("followers following", "-password");
      if (!user)
        return res.status(400).json({ msg: "requested user does not exist." });
      res.json({ user });
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
      res.json({ newUser });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  suggestionsUser: async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
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

      return res.json({ users, result: users.length });
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

      res.json({ msg: "Post removed from collection successfully." });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  },
};

module.exports = userCtrl;
