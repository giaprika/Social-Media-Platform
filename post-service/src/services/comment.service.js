const Comments = require("../models/comment.model");

module.exports = {
  create: (data) => new Comments(data).save(),
  findById: (id) => Comments.findById(id),
  model: Comments,
};
