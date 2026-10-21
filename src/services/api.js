
import axios from "axios";

const api = axios.create({
baseURL: "https://civicpulse-backend-htmo.onrender.com",
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
