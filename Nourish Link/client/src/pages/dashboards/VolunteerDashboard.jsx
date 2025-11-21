import React from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";
import TaskListView from "../tasks/TaskListView";

const VolunteerDashboard = ({ userName }) => {
  const primaryGreen = "#228B22";
  const navigate = useNavigate();

  // Logout confirmation
  const confirmLogout = async () => {
    if (window.confirm("Are you sure you want to log out of Nourish Link?")) {
      await authService.signOut();
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-700 text-white p-4 flex justify-between items-center shadow-lg">
        <h1 className="text-xl font-bold">Volunteer Dashboard</h1>
        <button
          onClick={confirmLogout}
          className="text-white hover:text-gray-200"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1m0-10V4m-9 0h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"
            />
          </svg>
        </button>
      </header>

      <div className="p-4">
        <h2 className="text-2xl font-bold text-green-700 mb-4">
          Welcome, {userName}!
        </h2>
        <TaskListView />
      </div>
    </div>
  );
};

export default VolunteerDashboard;
