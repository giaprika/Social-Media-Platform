const router = require("express").Router();
const commentCtrl = require("../controllers/comment.controller");

router.post("/comment", commentCtrl.createComment);

router.patch("/comment/:id", commentCtrl.updateComment);

router.patch("/comment/:id/like", commentCtrl.likeComment);
router.patch("/comment/:id/unlike", commentCtrl.unLikeComment);
router.delete("/comment/:id", commentCtrl.deleteComment);

module.exports = router;
