import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import RoleBasedHome from "./pages/RoleBasedHome";
import HomeScreen from "./pages/HomeScreen";

import DonationPostScreen from "./pages/donations/DonationPostScreen";
import DonorHistoryScreen from "./pages/donations/DonorHistoryScreen";

import TaskDetailScreen from "./pages/tasks/TaskDetailScreen";

import AdminDashboard from "./pages/dashboards/AdminDashboard";
import DonorDashboard from "./pages/dashboards/DonorDashboard";
import VolunteerDashboard from "./pages/dashboards/VolunteerDashboard";
import AdminAssignmentDetailScreen from "./pages/donations/AdminAssignmentDetailScreen";

const NotFound = () => (
  <div className="text-center p-10">
    <h2 className="text-3xl text-red-600 font-bold">404 - Page Not Found</h2>
    <p className="text-gray-600 mt-3">
      The route you are looking for does not exist.
    </p>
    <button
      onClick={() => (window.location.href = "/")}
      className="mt-5 py-2 px-4 bg-green-700 text-white rounded-lg"
    >
      Go to Home
    </button>
  </div>
);

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/auth" element={<HomeScreen initialShowAuth={true} />} />

          <Route path="/home" element={<RoleBasedHome />} />

          <Route path="/post-donation" element={<DonationPostScreen />} />
          <Route path="/donor/history" element={<DonorHistoryScreen />} />

          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/donor-dashboard" element={<DonorDashboard />} />
          <Route path="/volunteer/dashboard" element={<VolunteerDashboard />} />

          <Route path="/volunteer/task/:id" element={<TaskDetailScreen />} />

          <Route
            path="/admin/assign/:id"
            element={<AdminAssignmentDetailScreen />}
          />
          <Route
            path="/admin/assign-distribution/:id"
            element={<AdminAssignmentDetailScreen />}
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
