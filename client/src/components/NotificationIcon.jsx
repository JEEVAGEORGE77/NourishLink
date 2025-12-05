// Import React and hooks: useState for state, useEffect for side effects,
// useRef to reference the dropdown DOM element.
import React, { useState, useEffect, useRef } from "react";
// Hook to navigate programmatically between routes
import { useNavigate } from "react-router-dom";
// Auth service to get the current logged-in user
import { authService } from "../services/authService";
// Donation service to fetch donor/volunteer related notifications
import { donationService } from "../services/donationService";

// NotificationIcon component shows the bell icon and dropdown list of notifications.
// It receives a "role" prop to know if the user is a Donor or a Volunteer.
const NotificationIcon = ({ role }) => {
  const navigate = useNavigate();

  // List of notifications to show in the dropdown
  const [notifications, setNotifications] = useState([]);
  // Whether the dropdown is currently visible or hidden
  const [showDropdown, setShowDropdown] = useState(false);
  // Number of unread or important notifications
  const [unreadCount, setUnreadCount] = useState(0);
  // Reference to the dropdown container to detect clicks outside it
  const dropdownRef = useRef(null);

  // Fetch notifications from the backend based on the user's role
  const fetchNotifications = async () => {
    // Get the current logged-in Firebase user
    const user = authService.getAuthInstance().currentUser;
    // If no user is logged in, do nothing
    if (!user) return;

    try {
      let data = [];

      // For Donors, fetch donor-specific notifications from donationService
      if (role === "Donor") {
        data = await donationService.getDonorNotifications(user.uid);

        // Count notifications that are not delivered and not issueReported
        setUnreadCount(
          data.filter(
            (n) => n.status !== "delivered" && n.status !== "issueReported"
          ).length
        );
      } else if (role === "Volunteer") {
        // For Volunteers, fetch volunteer statistics and active tasks
        const stats = await donationService.getVolunteerStats(user.uid);

        // If there is an active task, create a notification object for it
        if (stats.latestActiveTask) {
          data.push({
            id: stats.latestActiveTask.donationId,
            message: `NEW TASK ASSIGNED: ${stats.latestActiveTask.itemType} (${stats.latestActiveTask.quantity})`,
            status: stats.latestActiveTask.status,
            timestamp: stats.latestActiveTask.postedAt,
            path: `/volunteer/task/${stats.latestActiveTask.donationId}`,
          });

          // If the task is in an assigned state, treat it as unread
          if (
            stats.latestActiveTask.status === "assignedForCollection" ||
            stats.latestActiveTask.status === "assignedForDistribution"
          ) {
            setUnreadCount(1);
          } else {
            setUnreadCount(0);
          }
        }
      }

      // Save all loaded notifications into state
      setNotifications(data);
    } catch (e) {
      console.error("Failed to fetch notifications:", e);
    }
  };

  // On mount and whenever the role changes, fetch notifications
  // and set up an interval to refresh them every 60 seconds.
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    // Cleanup: clear the interval when component unmounts or role changes
    return () => clearInterval(interval);
  }, [role]);

  // Close the dropdown if a click happens outside of it
  useEffect(() => {
    const handleClickOutside = (event) => {
      // If dropdown is rendered and the click is outside the dropdown element, hide it
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    // Attach listener on mousedown to detect outside clicks
    document.addEventListener("mousedown", handleClickOutside);
    // Cleanup: remove listener when component unmounts
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Called when a notification is clicked
  const handleNotificationClick = (notification) => {
    // Close the dropdown
    setShowDropdown(false);

    // If the notification has a specific path, navigate there
    if (notification.path) {
      navigate(notification.path);
    } else if (role === "Donor") {
      // For donors without a specific path, go to donor history page
      navigate("/donor/history");
    }

    // Mark all notifications as read visually by setting unread count to zero
    setUnreadCount(0);
  };

  // Returns a Tailwind border color class based on the notification status
  const statusColor = (status) => {
    if (status.includes("assigned")) return "border-yellow-600"; // active or assigned task
    if (status === "delivered") return "border-green-600"; // success/completed
    if (status === "issueReported") return "border-red-600"; // problem/error
    return "border-gray-400"; // default/neutral
  };

  return (
    // Wrap the icon and dropdown together so click-outside logic can work
    <div className="relative" ref={dropdownRef}>
      {/* Notification bell button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 rounded-full text-white bg-green-700 hover:bg-green-600 shadow-lg"
        aria-label="Notifications"
      >
        {/* Bell icon SVG */}
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
            d="M15 17h5l-1.405-1.405C18.214 14.86 18 14.072 18 13.268v-2.02c0-1.875-.76-3.693-2.114-5.044C14.53 4.882 12.875 4 11 4s-3.53 0.882-4.886 2.224C4.76 7.555 4 9.373 4 11.248v2.02c0 0.804-0.214 1.592-0.595 2.307L2 17h5"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10 21h4c0 1.105-0.895 2-2 2s-2-0.895-2-2z"
          />
        </svg>

        {/* Red badge showing unread notification count */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel with the list of notifications */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50 border border-gray-200">
          {/* Header section of the dropdown */}
          <div className="py-2 px-3 border-b">
            <p className="font-bold text-gray-800">Notifications</p>
          </div>

          {/* If there are no notifications, show a friendly empty state message */}
          {notifications.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">No recent activity.</div>
          ) : (
            // Otherwise, list all notifications with scrollable area
            <ul className="max-h-64 overflow-y-auto">
              {notifications.map((notif) => (
                <li
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3 border-l-4 ${statusColor(
                    notif.status
                  )} cursor-pointer hover:bg-gray-50 transition`}
                >
                  {/* Main notification message */}
                  <p className="text-sm font-medium text-gray-800">
                    {notif.message}
                  </p>
                  {/* Human-readable date/time for when the notification was created */}
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(notif.timestamp).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

// Export component so it can be used in dashboards and headers
export default NotificationIcon;
