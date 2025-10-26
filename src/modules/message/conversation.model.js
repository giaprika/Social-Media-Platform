const mongoose = require("mongoose");
const { Schema } = mongoose;

const conversationSchema = new Schema(
  {
    recipients: [{ type: mongoose.Types.ObjectId, ref: "user" }],
    text: String,
    media: Array,
  },
  { timestamps: true }
);

module.exports = mongoose.models.conversation || mongoose.model("conversation", conversationSchema);
