import { POST_TYPES } from "./postAction";
import { SUGGEST_TYPES } from "./suggestionsAction";
import { NOTIFY_TYPES } from "./notifyAction";
import { GLOBALTYPES } from "./globalTypes";
import { getGatewayAPI } from "../../utils/fetchData";

export const getFeedData = (token) => async (dispatch) => {
  try {
    dispatch({ type: POST_TYPES.LOADING_POST, payload: true });
    dispatch({ type: SUGGEST_TYPES.LOADING, payload: true });

    const res = await getGatewayAPI("/feed/", token);

    // Gửi dữ liệu đến từng reducer tương ứng
    dispatch({
      type: POST_TYPES.GET_POSTS,
      payload: { ...res.data.posts, page: 2 },
    });

    dispatch({
      type: SUGGEST_TYPES.GET_USERS,
      payload: res.data.suggestions,
    });

    dispatch({
      type: NOTIFY_TYPES.GET_NOTIFIES,
      payload: res.data.notifies.notifies,
    });

    dispatch({ type: POST_TYPES.LOADING_POST, payload: false });
    dispatch({ type: SUGGEST_TYPES.LOADING, payload: false });
  } catch (err) {
    dispatch({
      type: GLOBALTYPES.ALERT,
      payload: { error: err.response?.data?.msg || "Aggregation failed" },
    });
  }
};
