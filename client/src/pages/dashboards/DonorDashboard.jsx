import React from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";
import NotificationIcon from "../../components/NotificationIcon";

const DonorDashboard = ({ userName }) => {
  const navigate = useNavigate();

  // Handle logout
  const confirmLogout = async () => {
    if (window.confirm("Are you sure you want to log out of Nourish Link?")) {
      await authService.signOut();
      navigate("/auth");
    }
  };

  // Navigate to post donation page
  const handlePostDonation = () => {
    navigate("/post-donation");
  };

  // Navigate to donor history page
  const handleViewActiveDonations = () => {
    navigate("/donor/history");
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-green-700 text-white p-4 flex justify-between items-center shadow-lg">
        <h1 className="text-xl font-bold">Donor Dashboard</h1>
        <div className="flex items-center space-x-4">
          <NotificationIcon role="Donor" />
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

      <div className="p-8 text-center">
        <h2 className="text-3xl font-bold text-green-700 mb-2">
          Welcome, {userName}!
        </h2>
        <p className="text-xl text-gray-700">
          Ready to Connect. Collect. Care?
        </p>

        <div className="mt-12">
          <button
            onClick={handlePostDonation}
            className="w-full max-w-sm py-5 bg-yellow-600 text-white text-2xl font-bold rounded-xl shadow-xl hover:bg-yellow-700 transition duration-150 flex items-center justify-center mx-auto mb-8 space-x-3"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                clipRule="evenodd"
              />
            </svg>
            <span>Post New Donation</span>
          </button>

          <button
            onClick={handleViewActiveDonations}
            className="text-green-700 text-lg font-bold hover:text-green-900 transition duration-150 flex items-center justify-center mx-auto mb-12 space-x-2"
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
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
            <span>View My Active Donations</span>
          </button>

          <button
            onClick={confirmLogout}
            className="py-3 px-6 bg-red-700 text-white text-base font-semibold rounded-lg shadow-md hover:bg-red-800 transition"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default DonorDashboard;
