const router = require("express").Router();
const authCtrl = require("../controllers/auth.controller");

router.post("/register", authCtrl.register);
router.post("/register_admin", authCtrl.registerAdmin);
router.post("/changePassword", authCtrl.changePassword);

router.post("/login", authCtrl.login);
router.post("/admin_login", authCtrl.adminLogin);

router.post("/logout", authCtrl.logout);

router.post("/refresh_token", authCtrl.generateAccessToken);

module.exports = router;
