import { axiosServiceInstance, axiosGatewayInstance } from "./axiosInstance";

// SERVICE INSTANCE
export const getDataAPI = async (url) => {
  const res = await axiosServiceInstance.get(`${url}`);
  return res;
};

export const postDataAPI = async (url, post) => {
  const res = await axiosServiceInstance.post(`${url}`, post);
  return res;
};

export const putDataAPI = async (url, post) => {
  const res = await axiosServiceInstance.put(`${url}`, post);
  return res;
};

export const patchDataAPI = async (url, post) => {
  const res = await axiosServiceInstance.patch(`${url}`, post);
  return res;
};

export const deleteDataAPI = async (url) => {
  const res = await axiosServiceInstance.delete(`${url}`);
  return res;
};

// GATEWAY INSTANCE
export const getGatewayAPI = async (url) => {
  const res = await axiosGatewayInstance.get(url);
  return res;
};

export const postGatewayAPI = async (url, post) => {
  const res = await axiosGatewayInstance.post(url, post);
  return res;
};

export const putGatewayAPI = async (url, post) => {
  const res = await axiosGatewayInstance.put(url, post);
  return res;
};

export const patchGatewayAPI = async (url, post) => {
  const res = await axiosGatewayInstance.patch(url, post);
  return res;
};

export const deleteGatewayAPI = async (url) => {
  const res = await axiosGatewayInstance.delete(url);
  return res;
};
