import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { donationService } from "../../services/donationService";

// Admin-only page to view all users and update their role/status.
const UserManagementScreen = () => {
  const navigate = useNavigate();

  // Full raw user list from the backend
  const [users, setUsers] = useState([]);

  // Flags for loading spinner and top-level error message
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Current selected filter in the dropdown ("All", "Donor", "Volunteer", "Admin")
  const [filterRole, setFilterRole] = useState("All");

  // List of roles used in the filter dropdown
  const roles = ["All", "Donor", "Volunteer", "Admin"];

  // Load all users from the server when the screen mounts
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // donationService.getAllUsers() returns an array of user objects
      const data = await donationService.getAllUsers();
      setUsers(data);
    } catch (err) {
      // Show a human-readable message at the top of the page
      setError(err.message || "Failed to fetch user list.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch user list once on initial render
  useEffect(() => {
    fetchUsers();
  }, []);

  // Admin clicks the status button (Activate / Deactivate)
  // This sends an update to the backend then updates the local list in state.
  const handleUpdateStatus = async (uid, newStatus) => {
    try {
      await donationService.updateUser(uid, { status: newStatus });

      // Update user array locally so the UI changes immediately without reloading everything
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.uid === uid ? { ...user, status: newStatus } : user
        )
      );

      alert(`User status updated to ${newStatus}.`);
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  // Admin changes a user's role using the dropdown (Donor / Volunteer / Admin)
  const handleUpdateRole = async (uid, newRole) => {
    try {
      await donationService.updateUser(uid, { role: newRole });

      // Update the role locally so we don’t need a full refresh
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.uid === uid ? { ...user, role: newRole } : user
        )
      );

      alert(`User role updated to ${newRole}.`);
    } catch (err) {
      alert(`Failed to update role: ${err.message}`);
    }
  };

  // Apply role filter to the full user list.
  // If "All" is selected, return everything.
  const filteredUsers = users.filter(
    (user) => filterRole === "All" || user.role === filterRole
  );

  // Return Tailwind background/text classes based on user.status
  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700";
      case "inactive":
        return "bg-gray-100 text-gray-700";
      default:
        // Any unexpected status (e.g. "banned" or error) will show as red
        return "bg-red-100 text-red-700";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar with back arrow and title */}
      <header className="bg-green-700 text-white p-4 flex items-center shadow-lg">
        <button
          onClick={() => navigate(-1)}  // Go back to previous page (AdminDashboard)
          className="text-white mr-4 text-2xl"
        >
          &larr;
        </button>
        <h1 className="text-xl font-bold">User Management (Admin)</h1>
      </header>

      <div className="p-5">
        {/* Top-level error from loading users */}
        {error && <p className="text-red-600 text-center mb-4">{error}</p>}

        {/* Heading + role filter controls */}
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-700">
            All Users ({users.length})
          </h2>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-semibold">Filter by Role:</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="p-2 border border-gray-300 rounded-lg text-sm"
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading state while fetching users */}
        {isLoading ? (
          <div className="text-center p-8">
            <div className="animate-spin inline-block w-8 h-8 border-4 rounded-full border-green-700 border-t-transparent"></div>
            <p className="mt-2 text-gray-600">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          // Case: no users after applying the filter
          <div className="text-center p-8 text-gray-500">
            <p>No users found matching the filter.</p>
          </div>
        ) : (
          // Main user list
          <ul className="space-y-4">
            {filteredUsers.map((user) => (
              <li
                key={user.uid}
                className="bg-white p-4 rounded-xl shadow-md border-l-4 border-gray-400"
              >
                {/* Top row: name + status badge */}
                <div className="flex justify-between items-center mb-2">
                  <p className="text-lg font-bold text-green-700">
                    {user.name}
                  </p>
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                      user.status
                    )}`}
                  >
                    {user.status}
                  </span>
                </div>

                {/* Basic contact info */}
                <p className="text-sm text-gray-600">Email: {user.email}</p>
                <p className="text-sm text-gray-600 mb-3">
                  Phone: {user.phone || "N/A"}
                </p>

                {/* Role dropdown + Activate/Deactivate button */}
                <div className="flex items-center space-x-4">
                  <p className="text-sm font-semibold text-gray-700">Role: </p>
                  <select
                    value={user.role}
                    onChange={(e) => handleUpdateRole(user.uid, e.target.value)}
                    className="p-1 border rounded text-sm bg-gray-50"
                  >
                    <option value="Donor">Donor</option>
                    <option value="Volunteer">Volunteer</option>
                    <option value="Admin">Admin</option>
                  </select>

                  <p className="text-sm font-semibold text-gray-700">
                    Status:{" "}
                  </p>
                  <button
                    onClick={() =>
                      handleUpdateStatus(
                        user.uid,
                        user.status === "active" ? "inactive" : "active"
                      )
                    }
                    className={`py-1 px-3 text-sm font-semibold rounded transition ${
                      user.status === "active"
                        ? "bg-red-500 hover:bg-red-600 text-white"
                        : "bg-green-500 hover:bg-green-600 text-white"
                    }`}
                  >
                    {/* Button label toggles text based on current status */}
                    {user.status === "active" ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default UserManagementScreen;
