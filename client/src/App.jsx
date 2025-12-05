// Import React so we can write JSX components
import React from "react";

// Import routing components from react-router-dom.
// Router: wraps the entire app and enables routing.
// Routes: container for all route definitions.
// Route: defines a single route path and its screen.
// Navigate: used to redirect between pages.
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Import all page components used in different routes.
import RoleBasedHome from "./pages/RoleBasedHome";
import HomeScreen from "./pages/HomeScreen";

import DonationPostScreen from "./pages/donations/DonationPostScreen";
import DonorHistoryScreen from "./pages/donations/DonorHistoryScreen";

import TaskDetailScreen from "./pages/tasks/TaskDetailScreen";

import AdminDashboard from "./pages/dashboards/AdminDashboard";
import DonorDashboard from "./pages/dashboards/DonorDashboard";
import VolunteerHistoryScreen from "./pages/tasks/VolunteerHistoryScreen";
import VolunteerDashboard from "./pages/dashboards/VolunteerDashboard";
import UserManagementScreen from "./pages/dashboards/UserManagementScreen";
import AdminAssignmentDetailScreen from "./pages/donations/AdminAssignmentDetailScreen";


// A simple fallback component for unmatched routes.
// It shows a 404 message with a button redirecting to home.
const NotFound = () => (
  <div className="text-center p-10">
    <h2 className="text-3xl text-red-600 font-bold">404 - Page Not Found</h2>
    <p className="text-gray-600 mt-3">
      The route you are looking for does not exist.
    </p>

    {/* Button replaces the current page with the home route */}
    <button
      onClick={() => (window.location.href = "/")}
      className="mt-5 py-2 px-4 bg-green-700 text-white rounded-lg"
    >
      Go to Home
    </button>
  </div>
);


// Main application component that sets up all routing for the app.
function App() {
  return (
    // Router enables client-side navigation without reloading the page
    <Router>
      <div className="App">
        {/* Routes contains all route mappings */}
        <Routes>

          {/* Default landing page */}
          <Route path="/" element={<HomeScreen />} />

          {/* Forces HomeScreen to open with the login/signup modal visible */}
          <Route path="/auth" element={<HomeScreen initialShowAuth={true} />} />

          {/* Route that decides which dashboard to load based on user role */}
          <Route path="/home" element={<RoleBasedHome />} />

          {/* Donor flow routes */}
          <Route path="/post-donation" element={<DonationPostScreen />} />
          <Route path="/donor/history" element={<DonorHistoryScreen />} />

          {/* Admin-only route for managing users */}
          <Route
            path="/admin/user-management"
            element={<UserManagementScreen />}
          />

          {/* Main dashboard routes for different user roles */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/donor-dashboard" element={<DonorDashboard />} />
          <Route path="/volunteer/dashboard" element={<VolunteerDashboard />} />

          {/* Volunteer-related history route */}
          <Route
            path="/volunteer/history"
            element={<VolunteerHistoryScreen />}
          />

          {/* Dynamic route: :id means the page loads based on a task ID */}
          <Route path="/volunteer/task/:id" element={<TaskDetailScreen />} />

          {/* Admin assignment routes with dynamic IDs */}
          <Route
            path="/admin/assign/:id"
            element={<AdminAssignmentDetailScreen />}
          />
          <Route
            path="/admin/assign-distribution/:id"
            element={<AdminAssignmentDetailScreen />}
          />

          {/* Catch-all route for non-existing pages */}
          <Route path="*" element={<NotFound />} />

        </Routes>
      </div>
    </Router>
  );
}

// Export the App component so it can be used in main.jsx
export default App;
