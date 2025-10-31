const mongoose = require("mongoose");
const { Schema } = mongoose;

const messageSchema = new Schema(
  {
    conversation: { type: mongoose.Types.ObjectId, ref: "conversation" },
    sender: { type: String },
    recipient: { type: String },
    text: String,
    media: Array,
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.message || mongoose.model("message", messageSchema);
