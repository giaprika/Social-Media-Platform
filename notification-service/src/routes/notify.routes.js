const router = require("express").Router();
const notifyCtrl = require("../controllers/notify.controller");

router.post("/notify", notifyCtrl.createNotify);

router.delete("/notify/:id", notifyCtrl.removeNotify);

router.get("/notifies", notifyCtrl.getNotifies);

router.patch("/isReadNotify/:id", notifyCtrl.isReadNotify);

router.delete("/deleteAllNotify", notifyCtrl.deleteAllNotifies);

module.exports = router;
