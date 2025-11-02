// utils/axiosInstance.js
import axios from "axios";
import axiosRetry from "axios-retry";
import store from "../redux/store";

const API_BASE_URL = "http://localhost:8080/api/service";
const GATEWAY_BASE_URL = "http://localhost:8080/api";

// Instance cho microservices
const axiosServiceInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 10000,
});

// Instance cho gateway
const axiosGatewayInstance = axios.create({
  baseURL: GATEWAY_BASE_URL,
  withCredentials: true,
  timeout: 10000,
});

// Retry pattern
const applyRetry = (instance) => {
  axiosRetry(instance, {
    retries: 3,
    retryDelay: (retryCount) => retryCount * 1000,
    retryCondition: (error) =>
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      (error.response && error.response.status >= 500),
  });
};

applyRetry(axiosServiceInstance);
applyRetry(axiosGatewayInstance);

const attachAuthInterceptor = (instance) => {
  instance.interceptors.request.use((config) => {
    const state = store.getState();
    const token = state.auth?.token;
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  });
};

attachAuthInterceptor(axiosServiceInstance);
attachAuthInterceptor(axiosGatewayInstance);

export { axiosServiceInstance, axiosGatewayInstance };
