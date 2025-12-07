const Posts = require("../models/post.model");
const Comments = require("../models/comment.model");
const config = require("../config/env");
const USER_SERVICE_URL = config.USER_SERVICE_URL;
const axios = require("axios");
const cache = require("../utils/cache");
const { publishPostLiked, publishPostUnliked } = require("../utils/rabbitmq");

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

const postCtrl = {
  createPost: async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const userRes = await axios.get(`${USER_SERVICE_URL}/user/${userId}`);
      const user = userRes.data.user;
      const { content, images } = req.body;
      if (images.length === 0)
        return res.status(400).json({ msg: "Please add photo(s)" });

      const newPost = new Posts({ content, images, userId: user._id });
      await newPost.save();

      // invalidate posts cache
      await cache.del("cache:posts:*");

      res.json({
        msg: "Post created successfully.",
        newPost: { ...newPost._doc, user: user },
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  getPosts: async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const cacheKey = `cache:posts:getPosts:${userId}:${JSON.stringify(
        req.query || {}
      )}`;
      const cached = await cache.get(cacheKey);
      if (cached) return res.json(cached);
      const userRes = await axios.get(`${USER_SERVICE_URL}/user/${userId}`);
      const user = userRes.data.user;
      const features = new APIfeatures(
        Posts.find({ userId: [...user.following, user._id] }),
        req.query
      ).paginating();

      const posts = await features.query
        .sort("-createdAt")
        .populate("comments");

      const postsWithUser = await Promise.all(
        posts.map(async (post) => {
          let postUser = null;
          try {
            const { data } = await axios.get(
              `${USER_SERVICE_URL}/user/${post.userId}`
            );
            postUser = data.user || data;
          } catch {
            postUser = null;
          }

          // gắn user cho comment
          const commentsWithUser = await Promise.all(
            post.comments.map(async (comment) => {
              let commentUser = null;
              try {
                const { data } = await axios.get(
                  `${USER_SERVICE_URL}/user/${comment.userId}`
                );
                commentUser = data.user || data;
              } catch {
                commentUser = null;
              }
              return { ...comment._doc, user: commentUser };
            })
          );

          return { ...post._doc, user: postUser, comments: commentsWithUser };
        })
      );

      const payload = {
        msg: "Success",
        result: postsWithUser.length,
        posts: postsWithUser,
      };

      // cache result
      await cache.set(cacheKey, payload);

      res.json(payload);
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  updatePost: async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const { content, images } = req.body;
      const post = await Posts.findOneAndUpdate(
        { _id: req.params.id, userId: userId },
        { content, images },
        { new: true }
      ).populate("comments");

      if (!post)
        return res
          .status(400)
          .json({ msg: "Post does not exist or you are not the owner." });

      // invalidate posts cache
      await cache.del("cache:posts:*");

      res.json({
        msg: "Post updated successfully.",
        newPost: { ...post._doc },
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  likePost: async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const post = await Posts.find({
        _id: req.params.id,
        likes: userId,
      });
      if (post.length > 0)
        return res
          .status(400)
          .json({ msg: "You have already liked this post" });

      const like = await Posts.findOneAndUpdate(
        { _id: req.params.id },
        { $push: { likes: userId } },
        { new: true }
      );
      if (!like) return res.status(400).json({ msg: "Post does not exist." });

      // invalidate posts cache
      await cache.del("cache:posts:*");

      // Publish event to notification queue (async, don't wait)
      publishPostLiked({
        postId: req.params.id,
        userId,
        postOwnerId: like.userId.toString(),
      }).catch((err) =>
        console.error("Failed to publish post liked event:", err)
      );

      res.json({ msg: "Post liked successfully." });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  unLikePost: async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const like = await Posts.findOneAndUpdate(
        { _id: req.params.id },
        { $pull: { likes: userId } },
        { new: true }
      );
      if (!like) return res.status(400).json({ msg: "Post does not exist." });

      // invalidate posts cache
      await cache.del("cache:posts:*");

      // Publish unlike event (remove notification)
      publishPostUnliked({
        postId: req.params.id,
        userId,
        postOwnerId: like.userId.toString(),
      }).catch((err) =>
        console.error("Failed to publish post unliked event:", err)
      );

      res.json({ msg: "Post unliked successfully." });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  getUserPosts: async (req, res) => {
    try {
      const cacheKey = `cache:posts:getUserPosts:${
        req.params.id
      }:${JSON.stringify(req.query || {})}`;
      const cached = await cache.get(cacheKey);
      if (cached) return res.json(cached);

      const features = new APIfeatures(
        Posts.find({ userId: req.params.id }),
        req.query
      ).paginating();
      const posts = await features.query.sort("-createdAt");
      const payload = { posts, result: posts.length };
      await cache.set(cacheKey, payload);
      res.json(payload);
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  getPost: async (req, res) => {
    try {
      const cacheKey = `cache:posts:getPost:${req.params.id}`;
      const cached = await cache.get(cacheKey);
      if (cached) return res.json(cached);
      const post = await Posts.findById(req.params.id).populate("comments");
      if (!post) return res.status(400).json({ msg: "Post does not exist." });

      let postUser = null;
      try {
        const { data } = await axios.get(
          `${USER_SERVICE_URL}/user/${post.userId}`
        );
        postUser = data.user || data;
      } catch {
        postUser = null;
      }

      const commentsWithUser = await Promise.all(
        post.comments.map(async (comment) => {
          let commentUser = null;
          try {
            const { data } = await axios.get(
              `${USER_SERVICE_URL}/user/${comment.userId}`
            );
            commentUser = data.user || data;
          } catch {
            commentUser = null;
          }
          return { ...comment._doc, user: commentUser };
        })
      );

      const payload = {
        post: { ...post._doc, user: postUser, comments: commentsWithUser },
      };
      await cache.set(cacheKey, payload);
      res.json(payload);
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  getPostDiscover: async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const userRes = await axios.get(`${USER_SERVICE_URL}/user/${userId}`);
      const user = userRes.data.user;
      const newArr = [...user.following, user._id];
      const num = req.query.num || 8;
      const posts = await Posts.aggregate([
        { $match: { user: { $nin: newArr } } },
        { $sample: { size: Number(num) } },
      ]);
      res.json({ msg: "Success", result: posts.length, posts });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  deletePost: async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const userRes = await axios.get(`${USER_SERVICE_URL}/user/${userId}`);
      const user = userRes.data.user;
      const post = await Posts.findOneAndDelete({
        _id: req.params.id,
        userId: user._id,
      });
      if (!post)
        return res
          .status(400)
          .json({ msg: "Post does not exist or you are not the owner." });

      await Comments.deleteMany({ _id: { $in: post.comments } });
      // invalidate posts cache
      await cache.del("cache:posts:*");

      res.json({
        msg: "Post deleted successfully.",
        newPost: { ...post, user: user },
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  reportPost: async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const post = await Posts.find({
        _id: req.params.id,
        reports: userId,
      });
      if (post.length > 0)
        return res
          .status(400)
          .json({ msg: "You have already reported this post" });

      const report = await Posts.findOneAndUpdate(
        { _id: req.params.id },
        { $push: { reports: userId } },
        { new: true }
      );
      if (!report) return res.status(400).json({ msg: "Post does not exist." });

      res.json({ msg: "Post reported successfully." });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  savePost: async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      // Gọi API sang user-service
      const { data } = await axios.post(
        `${USER_SERVICE_URL}/${userId}/savePost`,
        {
          postId: req.params.id,
        }
      );

      res.json({ msg: data.msg || "Post saved successfully." });
    } catch (err) {
      if (err.response) {
        return res.status(err.response.status).json(err.response.data);
      }
      return res.status(500).json({ msg: err.message });
    }
  },

  unSavePost: async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      // Gọi API sang user-service
      const response = await axios.post(
        `${USER_SERVICE_URL}/${userId}/unsavePost`,
        {
          postId: req.params.id,
        }
      );

      res.json({
        msg: response.data.msg || "Post removed from collection successfully.",
      });
    } catch (err) {
      if (err.response) {
        // Nếu user-service trả lỗi thì chuyển tiếp
        return res.status(err.response.status).json(err.response.data);
      }
      return res.status(500).json({ msg: err.message });
    }
  },

  getSavePost: async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      const userRes = await axios.get(`${USER_SERVICE_URL}/user/${userId}`);
      const user = userRes.data.user;
      const features = new APIfeatures(
        Posts.find({ _id: { $in: user.saved } }),
        req.query
      ).paginating();
      const savePosts = await features.query.sort("-createdAt");
      res.json({ savePosts, result: savePosts.length });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },
};

module.exports = postCtrl;
