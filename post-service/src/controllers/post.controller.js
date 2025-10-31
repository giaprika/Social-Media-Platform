const Posts = require("../models/post.model");
const Comments = require("../models/comment.model");
const config = require("../config/env");
const USER_SERVICE_URL = config.USER_SERVICE_URL;
const axios = require("axios");

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
      const { content, images } = req.body;
      if (images.length === 0)
        return res.status(400).json({ msg: "Please add photo(s)" });

      const newPost = new Posts({ content, images, user: req.user._id });
      await newPost.save();

      res.json({
        msg: "Post created successfully.",
        newPost: { ...newPost._doc, user: req.user },
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  getPosts: async (req, res) => {
    try {
      const features = new APIfeatures(
        Posts.find({ userId: [...req.user.following, req.user._id] }),
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

      res.json({
        msg: "Success",
        result: postsWithUser.length,
        posts: postsWithUser,
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  updatePost: async (req, res) => {
    try {
      const { content, images } = req.body;
      const post = await Posts.findOneAndUpdate(
        { _id: req.params.id, userId: req.user._id },
        { content, images },
        { new: true }
      ).populate("comments");

      if (!post)
        return res
          .status(400)
          .json({ msg: "Post does not exist or you are not the owner." });

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
      const post = await Posts.find({
        _id: req.params.id,
        likes: req.user._id,
      });
      if (post.length > 0)
        return res
          .status(400)
          .json({ msg: "You have already liked this post" });

      const like = await Posts.findOneAndUpdate(
        { _id: req.params.id },
        { $push: { likes: req.user._id } },
        { new: true }
      );
      if (!like) return res.status(400).json({ msg: "Post does not exist." });

      res.json({ msg: "Post liked successfully." });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  unLikePost: async (req, res) => {
    try {
      const like = await Posts.findOneAndUpdate(
        { _id: req.params.id },
        { $pull: { likes: req.user._id } },
        { new: true }
      );
      if (!like) return res.status(400).json({ msg: "Post does not exist." });

      res.json({ msg: "Post unliked successfully." });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  getUserPosts: async (req, res) => {
    try {
      const features = new APIfeatures(
        Posts.find({ user: req.params.id }),
        req.query
      ).paginating();
      const posts = await features.query.sort("-createdAt");
      res.json({ posts, result: posts.length });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  getPost: async (req, res) => {
    try {
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

      res.json({
        post: { ...post._doc, user: postUser, comments: commentsWithUser },
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  getPostDiscover: async (req, res) => {
    try {
      const newArr = [...req.user.following, req.user._id];
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
      const post = await Posts.findOneAndDelete({
        _id: req.params.id,
        user: req.user._id,
      });
      if (!post)
        return res
          .status(400)
          .json({ msg: "Post does not exist or you are not the owner." });

      await Comments.deleteMany({ _id: { $in: post.comments } });
      res.json({
        msg: "Post deleted successfully.",
        newPost: { ...post, user: req.user },
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  },

  reportPost: async (req, res) => {
    try {
      const post = await Posts.find({
        _id: req.params.id,
        reports: req.user._id,
      });
      if (post.length > 0)
        return res
          .status(400)
          .json({ msg: "You have already reported this post" });

      const report = await Posts.findOneAndUpdate(
        { _id: req.params.id },
        { $push: { reports: req.user._id } },
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
      // Gọi API sang user-service
      const { data } = await axios.post(
        `${USER_SERVICE_URL}/${req.user._id}/save`,
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
      // Gọi API sang user-service
      const response = await axios.post(
        `${USER_SERVICE_URL}/${req.user._id}/unsave`,
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
      const features = new APIfeatures(
        Posts.find({ _id: { $in: req.user.saved } }),
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
