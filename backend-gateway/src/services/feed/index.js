import express from "express";
import FeedServiceController from "./controller.js";
const router = express.Router();

router.get("/", FeedServiceController.getFeeds);

export default router;
