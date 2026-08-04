import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1",
});

// Attache automatiquement le token d'accès à chaque requête
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken"); // cf. remarque sécurité dans README
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Rafraîchit automatiquement le token en cas de 401, puis rejoue la requête une fois
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem("refreshToken");
        const { data } = await axios.post(
          `${apiClient.defaults.baseURL}/auth/refresh`,
          { refreshToken }
        );
        localStorage.setItem("accessToken", data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        localStorage.clear();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
