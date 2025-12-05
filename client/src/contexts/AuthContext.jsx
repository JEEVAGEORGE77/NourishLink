// Import React and useful hooks for managing global authentication state
import React, { createContext, useState, useEffect, useContext } from "react";
// Import our custom auth service which handles Firebase authentication
import { authService } from "../services/authService";

// Create a new context object that will hold auth-related data and functions
const AuthContext = createContext();

// AuthProvider is a wrapper component that makes auth state available 
// to all components inside the app.
export function AuthProvider({ children }) {
  // "user" will store the currently logged-in user (or null if not logged in)
  const [user, setUser] = useState(null);
  // "loading" tells the app whether Firebase is still checking the user state
  const [loading, setLoading] = useState(true);

  // useEffect runs once when the provider mounts.
  // It sets up a Firebase listener to detect login/logout automatically.
  useEffect(() => {
    // Firebase will call this function whenever auth state changes.
    // "u" is the user object (null if logged out).
    const unsubscribe = authService.onAuthStateChanged((u) => {
      setUser(u);          // Save the new user state
      setLoading(false);   // Tell the app that loading is finished
    });

    // Cleanup: stop the Firebase listener when component unmounts.
    return () => unsubscribe();
  }, []);

  // === AUTH FUNCTIONS ===

  // Login function — calls authService and saves logged-in user locally
  const signIn = async ({ email, password }) => {
    const u = await authService.signIn({ email, password });
    setUser(u);  // Update global user state
    return u;
  };

  // Signup function — creates account then saves user in state
  const signUp = async ({ email, password, name, role }) => {
    const u = await authService.signUp({ email, password, name, role });
    setUser(u);  // New user is now logged in automatically
    return u;
  };

  // Logout function — clears the Firebase session and our local user state
  const signOut = async () => {
    await authService.signOut();
    setUser(null); // Remove user from context
  };

  // Retrieve Firebase ID token (used for backend authorization)
  const getIdToken = async () => {
    return authService.getIdToken();
  };

  // Provide all auth data and functions to any component wrapped inside AuthProvider
  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, signUp, signOut, getIdToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to allow any component to easily access the auth context
export const useAuth = () => useContext(AuthContext);
