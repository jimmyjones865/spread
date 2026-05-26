import { useState, useEffect, createContext, useContext } from "react";
import api from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(null); // null=loading, false=out, true=in

  useEffect(() => {
    api.me()
      .then(() => setAuth(true))
      .catch(() => setAuth(false));
  }, []);

  const login = async (password) => {
    await api.login(password);
    setAuth(true);
  };

  const logout = async () => {
    await api.logout();
    setAuth(false);
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
