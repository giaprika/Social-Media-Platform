const mongoose = require("mongoose");
const { Schema } = mongoose;

const postSchema = new Schema(
  {
    content: String,
    images: { type: Array, required: true },
    likes: [{ type: String }],
    comments: [{ type: mongoose.Types.ObjectId, ref: "comment" }],
    userId: { type: String },
    reports: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.models.post || mongoose.model("post", postSchema);
