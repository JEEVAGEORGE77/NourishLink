import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { authService } from "../services/authService";
import DonorDashboard from "./dashboards/DonorDashboard";
import VolunteerDashboard from "./dashboards/VolunteerDashboard";
import AdminDashboard from "./dashboards/AdminDashboard";
import axios from "axios";

// This component decides which dashboard to show based on the logged-in user's role.
// It also redirects unauthenticated users back to the auth screen.
const RoleBasedHome = () => {
  const navigate = useNavigate();

  // Firebase user object (or null if not logged in)
  const [user, setUser] = useState(null);
  // Role string from backend: "Donor", "Volunteer", or "Admin"
  const [role, setRole] = useState(null);
  // Loading state while checking auth + role from backend
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = authService.getAuthInstance();

    // Listen for Firebase auth state changes (login / logout).
    // Runs once at mount and whenever user logs in or out.
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // If no user is logged in, clear state and send them to the auth page.
      if (!currentUser) {
        setUser(null);
        setRole(null);
        setLoading(false);
        navigate("/auth");
        return;
      }

      // Save Firebase user locally
      setUser(currentUser);

      try {
        // Get Firebase ID token to authorize API call
        const idToken = await currentUser.getIdToken();

        // Fetch user role and details from backend using user UID
        const response = await axios.get(
          `/api/users/role-details/${currentUser.uid}`,
          {
            headers: { Authorization: `Bearer ${idToken}` },
          }
        );

        // Save the role (Donor / Volunteer / Admin) in local state
        const userData = response.data.user;
        setRole(userData.role);
      } catch (error) {
        // If anything fails (e.g., user not found in DB), log out for safety
        console.error("Error fetching user role:", error);
        await authService.signOut();
      } finally {
        // In all cases, stop the loading spinner
        setLoading(false);
      }
    });

    // Cleanup the auth listener when component unmounts
    return unsubscribe;
  }, [navigate]);

  // While loading, or if user exists but role not loaded yet, show a loading screen
  if (loading || (user && !role)) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin inline-block w-8 h-8 border-4 rounded-full border-green-700 border-t-transparent"></div>
          <p className="mt-4 text-lg text-gray-600">
            Connecting to Nourish Link Services...
          </p>
        </div>
      </div>
    );
  }

  // Friendly display name for dashboards: prefer displayName, then email prefix, fallback to "User"
  const displayName = user?.displayName || user?.email?.split("@")[0] || "User";

  // Based on the resolved role, render the corresponding dashboard.
  switch (role) {
    case "Donor":
      return <DonorDashboard userName={displayName} />;
    case "Volunteer":
      return <VolunteerDashboard userName={displayName} />;
    case "Admin":
      return <AdminDashboard userName={displayName} />;
    default:
      // If role is missing or unknown, block access and show an error with a logout button.
      return (
        <div className="min-h-screen flex justify-center items-center flex-col p-6">
          <p className="text-xl text-red-600">
            Unknown user role. Access denied.
          </p>
          <button
            onClick={() => authService.signOut()}
            className="mt-6 py-3 px-6 bg-green-700 text-white rounded-lg hover:bg-green-800 transition"
          >
            Return to Login
          </button>
        </div>
      );
  }
};

export default RoleBasedHome;
