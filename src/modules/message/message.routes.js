const router = require("express").Router();
const auth = require("../../middleware/auth");
const messageCtrl = require("./message.controller");

router.post("/message", auth, messageCtrl.createMessage);

router.get("/conversations", auth, messageCtrl.getConversations);

router.get("/message/:id", auth, messageCtrl.getMessages);

module.exports = router;
