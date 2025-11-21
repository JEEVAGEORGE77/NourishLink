import React, { createContext, useState, useEffect, useContext } from "react";
import { authService } from "../services/authService";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Authentication methods
  const signIn = async ({ email, password }) => {
    const u = await authService.signIn({ email, password });
    setUser(u);
    return u;
  };

  const signUp = async ({ email, password, name, role }) => {
    const u = await authService.signUp({ email, password, name, role });
    setUser(u);
    return u;
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
  };

  const getIdToken = async () => {
    return authService.getIdToken();
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, signUp, signOut, getIdToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
