const mongoose = require("mongoose");
const { MONGODB_URL } = require("./env");

const connectDB = async () => {
  if (!MONGODB_URL) {
    throw new Error("Missing MONGODB_URL in environment variables");
  }
  await mongoose.connect(MONGODB_URL, {
    useCreateIndex: true,
    useFindAndModify: false,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("Database Connected!!");
};

module.exports = { connectDB };
