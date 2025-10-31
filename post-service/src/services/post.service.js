const Posts = require("../models/post.model");

module.exports = {
  create: (data) => new Posts(data).save(),
  findById: (id) => Posts.findById(id),
  list: (filter = {}) => Posts.find(filter),
  model: Posts,
};
