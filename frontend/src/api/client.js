import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  timeout: 60000,
  withCredentials: true // envoie le cookie httpOnly auth_token automatiquement
});

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"];

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isPublicPage = PUBLIC_PATHS.some((p) => window.location.pathname.startsWith(p));
    // Ne rediriger vers /login que depuis une page protégée (pas depuis /login lui-même → boucle infinie)
    if (err.response?.status === 401 && !isPublicPage) {
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
