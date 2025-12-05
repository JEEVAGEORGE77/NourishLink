import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";
import { donationService } from "../../services/donationService";

// Admin landing page: shows metrics + queues of pending, distribution, and issue tasks.
const AdminDashboard = ({ userName }) => {
  const navigate = useNavigate();

  // Buckets of tasks admin needs to manage
  const [tasks, setTasks] = useState({
    pending: [],       // donations waiting for collection assignment
    distribution: [],  // donations collected and waiting for drop-off assignment
    issues: [],        // tasks/donations with reported issues
  });

  // High-level analytics (totals, completion rate, monthly chart, etc.)
  const [metrics, setMetrics] = useState(null);

  // Loading + error flags for the whole dashboard
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Load all admin dashboard data (assignments + metrics) from backend
  const fetchDashboardData = async () => {
    setIsLoading(true);
    let fetchError = "";

    try {
      // Get list of donations requiring admin attention
      const allDonations = await donationService.getPendingAssignments();

      // Split them into two groups based on status
      const pendingAssignment = (allDonations || []).filter(
        (d) => d.status === "pendingAssignment"
      );
      const collectedForDistribution = (allDonations || []).filter(
        (d) => d.status === "collected"
      );

      // Get tasks/donations with reported issues
      const reportedIssues = await donationService.getReportedIssues();

      setTasks({
        pending: pendingAssignment,
        distribution: collectedForDistribution,
        issues: reportedIssues,
      });

      // Load dashboard metrics (total donations, completion rate, etc.)
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

  // On mount, load dashboard data and refresh it every 30 seconds.
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Logout confirmation for admin user
  const confirmLogout = async () => {
    if (window.confirm("Are you sure you want to log out of Nourish Link?")) {
      await authService.signOut();
      navigate("/auth");
    }
  };

  // Small helper to display timestamps nicely
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Determine urgency level for a donation based on its availability time
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

  // Reusable renderer for the three task sections (pending / distribution / issues)
  const renderTaskList = (list, type) => {
    // Empty-state messages per list type
    if (list.length === 0) {
      if (type === "pending")
        return (
          <div className="text-center p-4 text-gray-500 bg-white rounded-lg border border-gray-200">
            <p>No new donations require assignment.</p>
          </div>
        );
      if (type === "distribution")
        return (
          <div className="text-center p-4 text-gray-500 bg-white rounded-lg border border-gray-200">
            <p>No items awaiting distribution.</p>
          </div>
        );
      if (type === "issues")
        return (
          <div className="text-center p-4 text-gray-500 bg-white rounded-lg border border-gray-200">
            <p>No reported issues currently active.</p>
          </div>
        );
    }

    // Sort pending donations by earliest availability first
    if (type === "pending") {
      list.sort(
        (a, b) => new Date(a.availabilityTime) - new Date(b.availabilityTime)
      );
    }

    // Render each item as a clickable card that leads to assignment detail page
    return (
      <ul className="space-y-3">
        {list.map((donation) => {
          const priority = type === "pending" ? getPriority(donation) : null;
          let path;
          let label;
          let borderColor;

          // Configure route + label + color based on list type
          if (type === "pending") {
            path = `/admin/assign/${donation.donationId}`;
            label = priority.label;
            borderColor = priority.color.replace("border-", "");
          } else if (type === "distribution") {
            path = `/admin/assign-distribution/${donation.donationId}`;
            label = "AWAITING DROPOFF ASSIGNMENT";
            borderColor = "#3B82F6";
          } else if (type === "issues") {
            path = `/admin/assign/${donation.donationId}?issue=true`;
            label = "ISSUE REPORTED";
            borderColor = "#DC2626";
          }

          return (
            <li
              key={donation.donationId}
              className={`bg-white p-4 rounded-lg shadow-md border-l-4 cursor-pointer transition hover:shadow-lg`}
              style={{
                borderColor: borderColor,
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
                      type === "pending"
                        ? priority.text
                        : type === "issues"
                        ? "text-red-700"
                        : "text-blue-600"
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
                {/* Small chevron icon for visual "clickable" hint */}
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

  // Render the analytics cards and simple bar chart if metrics are available
  const renderMetrics = () => {
    if (!metrics) return null;

    const {
      totalDonations,
      tasksCompleted,
      completionRate,
      tasksInTransit,
      monthlyData,
    } = metrics;

    // Compute max value to normalize bar heights
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

        {/* Summary cards */}
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

        {/* Simple bar chart: monthly received vs delivered volumes */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <h4 className="text-lg font-bold text-gray-700 mb-4">
            Received vs. Delivered Volume
          </h4>
          <div className="h-64 flex space-x-6 justify-around items-end p-2 border-l border-b border-gray-300 relative">
            {/* Horizontal grid lines with numeric labels */}
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

            {/* Bars for each month */}
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
          {/* Legend for chart */}
          <div className="flex justify-center space-x-4 mt-4 text-sm">
            <span className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
              Received
            </span>
            <span className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
              Delivered
            </span>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top header: title + manage users + logout */}
      <header className="bg-green-700 text-white p-4 flex justify-between items-center shadow-lg">
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate("/admin/user-management")}
            className="text-white text-sm py-1 px-3 bg-yellow-600 rounded hover:bg-yellow-700 transition"
          >
            Manage Users
          </button>
          <button
            onClick={confirmLogout}
            className="text-white hover:text-gray-200"
          >
            {/* Logout icon */}
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

      <div className="p-4">
        <h2 className="text-2xl font-bold text-green-700 mb-2">
          Hello, {userName} (Admin)
        </h2>
        <hr className="border-gray-300 mb-6" />

        {/* If there was any fetch warning/error, show it at the top */}
        {error && (
          <div className="p-3 mb-4 text-red-700 bg-red-100 border-l-4 border-red-500 rounded-lg">
            {error}
          </div>
        )}

        {/* Metrics / analytics section */}
        {!isLoading && renderMetrics()}

        <hr className="border-gray-300 my-6" />

        {/* Issues section is always shown first and highlighted */}
        <h3 className="text-xl font-bold text-gray-700 mb-3 flex items-center">
          Reported Issues ({tasks.issues.length})
          <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-600">
            Action Required
          </span>
        </h3>
        {renderTaskList(tasks.issues, "issues")}

        <hr className="border-gray-300 my-6" />

        {/* Loading spinner while assignments are being fetched */}
        {isLoading ? (
          <div className="text-center p-8">
            <div className="animate-spin inline-block w-8 h-8 border-4 rounded-full border-yellow-600 border-t-transparent"></div>
            <p className="mt-2 text-gray-600">Loading assignments...</p>
          </div>
        ) : (
          <>
            {/* Distribution list (already collected, waiting for drop-off assignment) */}
            <h3 className="text-xl font-bold text-gray-700 mb-3 flex items-center">
              Awaiting Distribution ({tasks.distribution.length})
              <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-600">
                Collected
              </span>
            </h3>
            {renderTaskList(tasks.distribution, "distribution")}

            <hr className="border-gray-300 my-6" />

            {/* Pending collection assignments (donations not yet assigned to a volunteer) */}
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
