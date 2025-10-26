module.exports = {
  routes: require("./message.routes"),
  controller: require("./message.controller"),
  models: {
    conversation: require("./conversation.model"),
    message: require("./message.model"),
  },
};
