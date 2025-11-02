import logger from "../../utils/logger.js";
import {
  userServiceInstance,
  postServiceInstance,
  notificationServiceInstance,
} from "../../utils/axiosFactory.js";

class FeedServiceController {
  static async getFeeds(req, res, next) {
    try {
      const [postsRes, usersRes, notifiesRes] = await Promise.all([
        postServiceInstance.get(`/posts`),
        userServiceInstance.get(`/suggestionsUser`),
        notificationServiceInstance.get(`/notifies`),
      ]);

      console.log("postsRes:", postsRes.data);
      console.log("usersRes:", usersRes.data);
      console.log("notifiesRes:", notifiesRes.data);

      res.json({
        posts: postsRes.data,
        suggestions: usersRes.data,
        notifies: notifiesRes.data,
      });
    } catch (error) {
      logger.error("Error in register controller", {
        error: error.message,
        respose: error.response?.data,
        correlationId: req.correlationId,
      });
      res.status(400).json(error.response?.data || { error: error.message });
    }
  }
}

export default FeedServiceController;
