import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      // Le cookie httpOnly est envoyé automatiquement (withCredentials: true)
      const res = await api.get("/v1/auth/me");
      setUser(res.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const login = async (email, password) => {
    const res = await api.post("/v1/auth/login", { email, password });
    // Le cookie est posé par le backend, pas besoin de le stocker
    setUser(res.data.user);
    return res.data;
  };

  const register = async (email, password) => {
    const res = await api.post("/v1/auth/register", { email, password });
    setUser(res.data.user);
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post("/v1/auth/logout");
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
