// utils/axiosInstance.js
import axios from "axios";
import axiosRetry from "axios-retry";

const API_BASE_URL = "http://localhost:8080";

const axiosInstance = axios.create({
  baseURL: `${API_BASE_URL}`,
  timeout: 10000,
});

// Retry pattern
axiosRetry(axiosInstance, {
  retries: 3,
  retryDelay: (retryCount) => {
    console.log(`Retrying request... (${retryCount})`);
    return retryCount * 1000;
  },
  retryCondition: (error) => {
    // Retry khi: network lỗi, timeout, hoặc status code 5xx
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      (error.response && error.response.status >= 500)
    );
  },
});

export default axiosInstance;
