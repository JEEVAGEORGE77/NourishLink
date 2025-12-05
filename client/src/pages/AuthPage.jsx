// Import React to use JSX (even though we're not using hooks or state here)
import React from "react";
// Import Navigate from react-router-dom to redirect users to another route
import { Navigate } from "react-router-dom";

// This component doesn't render an auth form itself.
// Instead, it immediately redirects the user back to the home route ("/").
const AuthPage = () => {
  // Navigate component tells React Router to replace the current route with "/"
  // `replace` avoids adding a new history entry, so the back button behaves nicely.
  return <Navigate to="/" replace />;
};

// Export the component so it can be used in routing (e.g. <Route path="/auth" element={<AuthPage />} />)
export default AuthPage;
