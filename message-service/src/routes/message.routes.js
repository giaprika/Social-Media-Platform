const router = require("express").Router();
const messageCtrl = require("../controllers/message.controller");

router.post("/message", messageCtrl.createMessage);

router.get("/conversations", messageCtrl.getConversations);

router.get("/message/:id", messageCtrl.getMessages);

module.exports = router;
