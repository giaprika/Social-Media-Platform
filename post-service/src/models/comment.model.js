const mongoose = require("mongoose");
const { Schema } = mongoose;

const commentSchema = new Schema(
  {
    content: { type: String, required: true },
    tag: Object,
    reply: mongoose.Types.ObjectId,
    likes: [{ type: String }],
    userId: { type: String },
    postId: mongoose.Types.ObjectId,
    postUserId: mongoose.Types.ObjectId,
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.comment || mongoose.model("comment", commentSchema);
