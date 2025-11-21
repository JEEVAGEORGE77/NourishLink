import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";
import { donationService } from "../../services/donationService";

const AdminDashboard = ({ userName }) => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState({ pending: [], distribution: [] });
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    setIsLoading(true);
    let fetchError = "";
    try {
      const allDonations = await donationService.getPendingAssignments();
      const pendingAssignment = (allDonations || []).filter(
        (d) => d.status === "pendingAssignment"
      );
      const collectedForDistribution = (allDonations || []).filter(
        (d) => d.status === "collected"
      );

      setTasks({
        pending: pendingAssignment,
        distribution: collectedForDistribution,
      });

      try {
        const stats = await donationService.getMetrics();
        setMetrics(stats);
      } catch (e) {
        console.error("Failed to fetch metrics data:", e);
        fetchError = "Warning: Failed to load analytics metrics.";
      }
    } catch (err) {
      fetchError = "Failed to fetch assignment requests.";
    } finally {
      setError(fetchError);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Logout confirmation
  const confirmLogout = async () => {
    if (window.confirm("Are you sure you want to log out of Nourish Link?")) {
      await authService.signOut();
      navigate("/auth");
    }
  };

  // Format date utility
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Determine priority based on availability time
  const getPriority = (donation) => {
    const now = new Date();
    const availableTime = new Date(donation.availabilityTime);
    const diffHours = Math.abs(availableTime - now) / 36e5;

    if (availableTime < now || diffHours < 6) {
      return {
        color: "border-red-600",
        text: "text-red-700",
        label: "URGENT PICKUP",
      };
    }
    if (diffHours < 24) {
      return {
        color: "border-yellow-600",
        text: "text-yellow-700",
        label: "HIGH PRIORITY",
      };
    }
    return {
      color: "border-green-500",
      text: "text-green-700",
      label: "STANDARD",
    };
  };

  // Render task list
  const renderTaskList = (list, type) => {
    if (list.length === 0) {
      return (
        <div className="text-center p-4 text-gray-500 bg-white rounded-lg border border-gray-200">
          <p>
            {type === "pending"
              ? "No new donations require assignment."
              : "No items awaiting distribution."}
          </p>
        </div>
      );
    }

    if (type === "pending") {
      list.sort(
        (a, b) => new Date(a.availabilityTime) - new Date(b.availabilityTime)
      );
    }

    return (
      <ul className="space-y-3">
        {list.map((donation) => {
          const priority = type === "pending" ? getPriority(donation) : null;
          const path =
            type === "pending"
              ? `/admin/assign/${donation.donationId}`
              : `/admin/assign-distribution/${donation.donationId}`;
          const label =
            type === "pending" ? priority.label : "AWAITING DROPOFF ASSIGNMENT";

          return (
            <li
              key={donation.donationId}
              className={`bg-white p-4 rounded-lg shadow-md border-l-4 cursor-pointer transition hover:shadow-lg`}
              style={{
                borderColor:
                  type === "pending"
                    ? priority.color.replace("border-", "")
                    : "#3B82F6",
              }}
              onClick={() => navigate(path, { state: { donation } })}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-gray-800">
                    {donation.itemType} ({donation.quantity})
                  </p>
                  <p
                    className={`text-xs font-semibold mt-1 ${
                      type === "pending" ? priority.text : "text-blue-600"
                    }`}
                  >
                    {label}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    From: {donation.donorName}
                  </p>
                  <p className="text-xs text-gray-500">
                    Posted: {formatDate(donation.postedAt)}
                  </p>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-400"
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
    );
  };

  // Render metrics section
  const renderMetrics = () => {
    if (!metrics) return null;

    const {
      totalDonations,
      tasksCompleted,
      completionRate,
      tasksInTransit,
      monthlyData,
    } = metrics;

    const allVolumes = monthlyData
      ? monthlyData.flatMap((d) => [d.received, d.delivered])
      : [0];
    const maxVolume = Math.max(...allVolumes, 1);

    return (
      <>
        <h3 className="text-xl font-bold text-gray-700 mb-3 mt-6 flex items-center">
          Platform Statistics & Metrics
          <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
            Analytics
          </span>
        </h3>
        <hr className="border-gray-300 mb-4" />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl shadow-lg border-b-4 border-green-700">
            <p className="text-3xl font-extrabold text-green-700">
              {totalDonations || "0"}
            </p>
            <p className="text-sm text-gray-500">Total Donations</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-lg border-b-4 border-blue-600">
            <p className="text-3xl font-extrabold text-blue-600">
              {tasksInTransit || "0"}
            </p>
            <p className="text-sm text-gray-500">In Transit Tasks</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-lg border-b-4 border-yellow-600">
            <p className="text-3xl font-extrabold text-yellow-600">
              {tasksCompleted || "0"}
            </p>
            <p className="text-sm text-gray-500">Tasks Completed</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-lg border-b-4 border-gray-400">
            <p className="text-3xl font-extrabold text-gray-700">
              {completionRate || "0.0"}%
            </p>
            <p className="text-sm text-gray-500">Completion Rate</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <h4 className="text-lg font-bold text-gray-700 mb-4">
            Received vs. Delivered Volume
          </h4>
          <div className="h-64 flex space-x-6 justify-around items-end p-2 border-l border-b border-gray-300 relative">
            <div className="absolute top-0 right-0 w-full h-full pointer-events-none">
              {[0.25, 0.5, 0.75].map((val, i) => (
                <div
                  key={i}
                  className="absolute w-full border-t border-gray-200"
                  style={{ bottom: `${val * 100}%` }}
                >
                  <span
                    className="text-xs text-gray-400 absolute right-full mr-2"
                    style={{ transform: "translateY(50%)" }}
                  >
                    {(maxVolume * val).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>

            {monthlyData &&
              monthlyData.map((data, index) => {
                const receivedHeight = (data.received / maxVolume) * 100;
                const deliveredHeight = (data.delivered / maxVolume) * 100;

                return (
                  <div
                    key={index}
                    className="flex flex-col items-center w-1/4 h-full relative"
                  >
                    <div className="w-full h-full flex justify-center items-end">
                      <div
                        className="w-1/3 bg-green-500 rounded-t-sm transition-all duration-500"
                        style={{ height: `${receivedHeight}%` }}
                        title={`Received: ${data.received} units`}
                      ></div>
                      <div
                        className="w-1/3 bg-blue-500 rounded-t-sm ml-1 transition-all duration-500"
                        style={{ height: `${deliveredHeight}%` }}
                        title={`Delivered: ${data.delivered} units`}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-600 mt-2">
                      {data.month}
                    </span>
                  </div>
                );
              })}
          </div>
          <div className="flex justify-center space-x-4 mt-4 text-sm">
            <span className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>{" "}
              Received
            </span>
            <span className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>{" "}
              Delivered
            </span>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-700 text-white p-4 flex justify-between items-center shadow-lg">
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
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
        <h2 className="text-2xl font-bold text-green-700 mb-2">
          Hello, {userName} (Admin)
        </h2>
        <hr className="border-gray-300 mb-6" />

        {error && (
          <div className="p-3 mb-4 text-red-700 bg-red-100 border-l-4 border-red-500 rounded-lg">
            {error}
          </div>
        )}

        {!isLoading && renderMetrics()}

        <hr className="border-gray-300 my-6" />

        {isLoading ? (
          <div className="text-center p-8">
            <div className="animate-spin inline-block w-8 h-8 border-4 rounded-full border-yellow-600 border-t-transparent"></div>
            <p className="mt-2 text-gray-600">Loading assignments...</p>
          </div>
        ) : (
          <>
            <h3 className="text-xl font-bold text-gray-700 mb-3 flex items-center">
              Awaiting Distribution ({tasks.distribution.length})
              <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-600">
                Collected
              </span>
            </h3>
            {renderTaskList(tasks.distribution, "distribution")}

            <hr className="border-gray-300 my-6" />

            <h3 className="text-xl font-bold text-gray-700 mb-3 flex items-center">
              Pending Collection Assignment ({tasks.pending.length})
              <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-600">
                Urgent
              </span>
            </h3>
            {renderTaskList(tasks.pending, "pending")}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
