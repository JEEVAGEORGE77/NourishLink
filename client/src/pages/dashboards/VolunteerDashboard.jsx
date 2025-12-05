import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";
import { donationService } from "../../services/donationService";
import TaskListView from "../tasks/TaskListView";
import NotificationIcon from "../../components/NotificationIcon";

const VolunteerDashboard = ({ userName }) => {
  const navigate = useNavigate();

  // Stores volunteer statistics (e.g., tasks completed)
  const [stats, setStats] = useState({ tasksCompleted: 0 });

  // Current logged-in volunteer’s Firebase UID
  const volunteerId = authService.getAuthInstance().currentUser?.uid;

  /**
   * Fetch volunteer performance stats (tasks completed, etc.).
   * This uses the backend service: GET /api/donations/volunteer/:uid/stats.
   */
  const fetchStats = async () => {
    if (!volunteerId) return; // Prevent request if user is not yet loaded

    try {
      const data = await donationService.getVolunteerStats(volunteerId);
      setStats(data);
    } catch (e) {
      console.error("Failed to fetch volunteer stats:", e);
    }
  };

  // Fetch stats when the dashboard first loads AND when volunteerId is ready
  useEffect(() => {
    fetchStats();
  }, [volunteerId]);

  /**
   * Logout confirmation to avoid accidental sign-out.
   * If confirmed, clears Firebase auth session and redirects to login.
   */
  const confirmLogout = async () => {
    if (window.confirm("Are you sure you want to log out of Nourish Link?")) {
      await authService.signOut();
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ---------------------- HEADER ---------------------- */}
      <header className="bg-green-700 text-white p-4 flex justify-between items-center shadow-lg">
        <h1 className="text-xl font-bold">Volunteer Dashboard</h1>

        {/* Notifications + Logout */}
        <div className="flex items-center space-x-4">
          {/* Notification center for volunteer (shows assigned tasks/alerts) */}
          <NotificationIcon role="Volunteer" />

          {/* Logout button */}
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
        </div>
      </header>

      {/* --------------------- BODY SECTION --------------------- */}
      <div className="p-4">
        <h2 className="text-2xl font-bold text-green-700 mb-4">
          Welcome, {userName}!
        </h2>

        {/* Volunteer metrics + history button */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          {/* Tasks Completed Card */}
          <div className="bg-white p-4 rounded-xl shadow-lg border-b-4 border-yellow-600">
            <p className="text-3xl font-extrabold text-yellow-600">
              {stats.tasksCompleted || 0}
            </p>
            <p className="text-sm text-gray-500">Tasks Completed</p>
          </div>

          {/* Navigate to full task history */}
          <button
            onClick={() => navigate("/volunteer/history")}
            className="py-2 px-4 bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-300 transition duration-150 shadow-lg flex items-center justify-center"
          >
            View Task History
          </button>
        </div>

        {/* Active tasks list (assigned, picked up, delivery pending, etc.) */}
        <TaskListView />
      </div>
    </div>
  );
};

export default VolunteerDashboard;
