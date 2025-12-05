// Import StrictMode, a development tool that helps highlight potential problems in the app
import { StrictMode } from "react";
// Import the function that lets us create a React root and render the app into the DOM
import { createRoot } from "react-dom/client";
// Import global styles for the entire app (Tailwind + custom CSS)
import "./index.css";
// Import the main App component which defines routes and screens
import App from "./App.jsx";
// Import the AuthProvider so we can wrap the app with authentication context
import { AuthProvider } from "./contexts/AuthContext";

// Find the DOM element with id="root" and attach a React root to it, then render our app
createRoot(document.getElementById("root")).render(
  // StrictMode enables extra checks and warnings in development (does not run in production)
  <StrictMode>
    {/* Wrap the whole app with AuthProvider so any component can access user/auth state */}
    <AuthProvider>
      {/* The main application component that contains all routes and pages */}
      <App />
    </AuthProvider>
  </StrictMode>
);
