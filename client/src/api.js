import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

axios.defaults.baseURL = API_URL;

axios.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axios;
