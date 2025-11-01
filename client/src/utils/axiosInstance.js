// utils/axiosInstance.js
import axios from "axios";
import axiosRetry from "axios-retry";
import store from "../redux/store";

const API_BASE_URL = "http://localhost:8080/api/service";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 10000,
});

// Retry pattern
axiosRetry(axiosInstance, {
  retries: 3,
  retryDelay: (retryCount) => retryCount * 1000,
  retryCondition: (error) =>
    axiosRetry.isNetworkOrIdempotentRequestError(error) ||
    (error.response && error.response.status >= 500),
});

axiosInstance.interceptors.request.use((config) => {
  const state = store.getState();
  const token = state.auth?.token;

  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }

  return config;
});

export default axiosInstance;
