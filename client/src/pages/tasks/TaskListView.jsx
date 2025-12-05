import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { donationService } from "../../services/donationService";
import { authService } from "../../services/authService";

const TaskListView = () => {
  const navigate = useNavigate();

  // List of tasks assigned to the logged-in volunteer
  const [tasks, setTasks] = useState([]);

  // Loading + error state for API calls
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Brand colors for styling the cards
  const primaryGreen = "#228B22";
  const accentGold = "#DAA520";

  // Get the currently logged-in volunteer’s UID from Firebase Auth
  const volunteerId = authService.getAuthInstance().currentUser?.uid;

  // Fetch active tasks assigned to this volunteer from the backend
  const fetchActiveTasks = async () => {
    if (!volunteerId) return; // If no user logged in, don’t call API

    setIsLoading(true);
    try {
      const data = await donationService.getActiveVolunteerTasks(volunteerId);
      setTasks(data);      // Save tasks in state
      setError("");        // Clear any previous error
    } catch (err) {
      setError("Failed to fetch active tasks.");
    } finally {
      setIsLoading(false);
    }
  };

  // On mount:
  // 1) Load active tasks once
  // 2) Refresh tasks every 30 seconds to keep list up-to-date
  useEffect(() => {
    fetchActiveTasks();
    const interval = setInterval(fetchActiveTasks, 30000);
    return () => clearInterval(interval); // Clean up timer on unmount
  }, []);

  /**
   * Decide how each task card should look based on task type:
   * - Collection tasks: yellow / "COLLECTION PENDING"
   * - Distribution tasks: green / "DISTRIBUTION PENDING"
   */
  const getTaskVisuals = (task) => {
    const isCollectionTask = task.taskType === "collection";
    let action, icon, color, bgColor;

    if (isCollectionTask) {
      action = "COLLECTION PENDING";
      icon = (
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
            d="M16 11V7a4 4 0 00-4-4H5a2 2 0 00-2 2v16a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-3"
          />
        </svg>
      );
      color = accentGold;
      bgColor = "bg-yellow-50";
    } else {
      action = "DISTRIBUTION PENDING";
      icon = (
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
            d="M9 17v-2m3 2v-4m3 4v-6m2 2v-2m-8-2h.01M16 16.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
          />
        </svg>
      );
      color = primaryGreen;
      bgColor = "bg-green-50";
    }
    return { action, icon, color, bgColor };
  };

  return (
    <div>
      {/* Section title for active tasks */}
      <h3 className="text-xl font-extrabold text-green-700 mb-4 px-2">
        Your Active Tasks
      </h3>
      <hr className="border-gray-300 mb-4" />

      {/* Error message if API call fails */}
      {error && <p className="text-red-600 text-center p-4">{error}</p>}

      {/* Loading spinner while tasks are being fetched */}
      {isLoading ? (
        <div className="text-center p-8">
          <div className="animate-spin inline-block w-8 h-8 border-4 rounded-full border-yellow-600 border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Loading tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        // Friendly empty state when volunteer has no tasks
        <div className="text-center p-8 text-gray-500">
          <p>No active tasks currently assigned. Time for a break!</p>
        </div>
      ) : (
        // List of active tasks as clickable cards
        <ul className="space-y-4">
          {tasks.map((task) => {
            const { action, icon, color, bgColor } = getTaskVisuals(task);
            return (
              <li
                key={task._id || task.taskId}
                className={`bg-white p-4 rounded-xl shadow-lg border-l-8 cursor-pointer transition hover:shadow-xl ${bgColor}`}
                // Colored left border to match task type
                style={{ borderColor: color }}
                // Navigate to detailed task view, passing the full task object in route state
                onClick={() =>
                  navigate(`/volunteer/task/${task.taskId || task._id}`, {
                    state: { task },
                  })
                }
              >
                <div className="flex items-center space-x-4">
                  {/* Circle icon on the left (different icon/color for collection vs distribution) */}
                  <div
                    className="p-3 rounded-full"
                    style={{ backgroundColor: color + "1A" }} // "1A" = light transparent version
                  >
                    <span style={{ color: color }}>{icon}</span>
                  </div>

                  {/* Main task info: item, quantity, status, address */}
                  <div className="flex-grow">
                    <p className="text-lg font-bold text-gray-800">
                      {task.donationId?.foodItem || task.taskType}{" "}
                      {task.donationId?.quantity
                        ? `(${task.donationId.quantity})`
                        : ""}
                    </p>
                    <p className="text-sm text-gray-600">Status: {action}</p>
                    <p className="text-xs text-gray-500">
                      From: {task.address}
                    </p>
                  </div>

                  {/* Right arrow icon to indicate it's clickable */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default TaskListView;
