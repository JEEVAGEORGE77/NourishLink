import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { authService } from "../services/authService";
import DonorDashboard from "./dashboards/DonorDashboard";
import VolunteerDashboard from "./dashboards/VolunteerDashboard";
import AdminDashboard from "./dashboards/AdminDashboard";
import axios from "axios";

const RoleBasedHome = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = authService.getAuthInstance();

    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setRole(null);
        setLoading(false);
        navigate("/auth");
        return;
      }

      setUser(currentUser);

      try {
        const idToken = await currentUser.getIdToken();
        console.log("Firebase User Detected:", currentUser.uid);
        console.log("Token Length Check:", idToken.length > 100);
        const response = await axios.get(
          `/api/users/role-details/${currentUser.uid}`,
          {
            headers: { Authorization: `Bearer ${idToken}` },
          }
        );

        const userData = response.data.user;
        setRole(userData.role);
      } catch (error) {
        console.error("Error fetching user role:", error);
        await authService.signOut();
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [navigate]);

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

  const displayName = user?.displayName || user?.email?.split("@")[0] || "User";

  switch (role) {
    case "Donor":
      return <DonorDashboard userName={displayName} />;
    case "Volunteer":
      return <VolunteerDashboard userName={displayName} />;
    case "Admin":
      return <AdminDashboard userName={displayName} />;
    default:
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
