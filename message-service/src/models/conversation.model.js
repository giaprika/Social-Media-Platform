const mongoose = require("mongoose");
const { Schema } = mongoose;

const conversationSchema = new Schema(
  {
    recipients: [{ type: String }],
    text: String,
    media: Array,
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.conversation ||
  mongoose.model("conversation", conversationSchema);
