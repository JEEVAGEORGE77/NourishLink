import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { donationService } from "../../services/donationService";
import { authService } from "../../services/authService";

// Screen: shows the logged-in volunteer a history of all tasks they have done.
const VolunteerHistoryScreen = () => {
  const navigate = useNavigate();

  // List of all tasks (past + maybe current) for this volunteer
  const [tasks, setTasks] = useState([]);

  // Loading + error states for the history API call
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Header color for consistent branding
  const primaryGreen = "bg-green-700";

  // Logged-in volunteer’s UID from Firebase Auth (if any)
  const volunteerId = authService.getAuthInstance().currentUser?.uid;

  // On mount (and when volunteerId changes), load volunteer’s task history
  useEffect(() => {
    const fetchHistory = async () => {
      // If user is not logged in, show error and stop
      if (!volunteerId) {
        setError("User not logged in.");
        setIsLoading(false);
        return;
      }

      try {
        // Ask backend for all tasks for this volunteer
        const data = await donationService.getVolunteerTaskHistory();
        console.log("Tasks loaded:", data);
        setTasks(data); // Save tasks into state
      } catch (err) {
        setError("Failed to fetch task history.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [volunteerId]);

  // Safely format a datetime string into something readable like "Jan 5, 2025, 10:30 AM"
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Capitalize first letter of a word (e.g., "completed" → "Completed")
  const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

  // Decide badge color based on task status
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-green-200 text-green-800";
      case "cancelled":
        return "bg-red-200 text-red-800";
      case "pending":
        return "bg-yellow-200 text-yellow-800";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header bar with back button and title */}
      <header
        className={`p-4 flex items-center text-white ${primaryGreen} shadow-lg`}
      >
        <button
          onClick={() => navigate(-1)}
          className="text-white mr-4 text-2xl"
        >
          &larr;
        </button>
        <h1 className="text-xl font-bold">My Task History</h1>
      </header>

      <div className="p-5">
        {/* Show error message if something went wrong */}
        {error && <p className="text-red-600 text-center mb-4">{error}</p>}

        {/* Show loading spinner while history is being fetched */}
        {isLoading ? (
          <div className="text-center p-8">
            <div className="animate-spin inline-block w-8 h-8 border-4 rounded-full border-green-700 border-t-transparent"></div>
            <p className="mt-2 text-gray-600">Loading history...</p>
          </div>
        ) : tasks.length === 0 ? (
          // Friendly empty state when there is no history yet
          <div className="text-center p-8 text-gray-500">
            <p>You have no task history to display.</p>
          </div>
        ) : (
          // List of all previous tasks with status and dates
          <ul className="space-y-4">
            {tasks.map((task) => (
              <li
                key={task._id}
                className="bg-white p-4 rounded-xl shadow-md border-l-4 border-green-600"
              >
                <div className="flex justify-between items-start">
                  {/* Task type and address info */}
                  <div>
                    <p className="text-lg font-bold text-gray-800">
                      {capitalize(task.taskType)} Task
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Location: {task.address || "No address provided"}
                    </p>
                  </div>

                  {/* Status badge (Completed, Pending, Cancelled, etc.) */}
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                      task.status
                    )}`}
                  >
                    {capitalize(task.status)}
                  </span>
                </div>

                {/* Assigned and completed timestamps at the bottom of each card */}
                <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-500">
                  <div className="flex justify-between">
                    <span>Assigned:</span>
                    <span>{formatDate(task.assignedAt)}</span>
                  </div>

                  {task.completedAt && (
                    <div className="flex justify-between text-green-700 font-medium mt-1">
                      <span>Completed:</span>
                      <span>{formatDate(task.completedAt)}</span>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default VolunteerHistoryScreen;
