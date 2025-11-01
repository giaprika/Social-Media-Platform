const router = require("express").Router();
const userCtrl = require("../controllers/user.controller");

router.get("/search", userCtrl.searchUser);

router.get("/user/:id", userCtrl.getUser);

router.patch("/user", userCtrl.updateUser);

router.patch("/user/:id/follow", userCtrl.follow);
router.patch("/user/:id/unfollow", userCtrl.unfollow);

router.get("/suggestionsUser", userCtrl.suggestionsUser);
router.post("/:id/savePost", userCtrl.savePost);
router.post("/:id/unSavePost", userCtrl.unSavePost);

module.exports = router;
