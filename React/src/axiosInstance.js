import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://video-watermark-remover.onrender.com';

const axiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axiosInstance;
