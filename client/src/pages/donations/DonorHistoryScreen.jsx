import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { donationService } from "../../services/donationService";

const DonorHistoryScreen = () => {
  const navigate = useNavigate();

  // List of all donations made by the currently logged-in donor
  const [donations, setDonations] = useState([]);

  // Loading and error states for the screen
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const primaryGreen = "bg-green-700";

  // On mount, load donation history from the backend
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // Calls GET /api/donations/donor/:uid/history (via donationService)
        const data = await donationService.getDonorDonationHistory();
        setDonations(data);
      } catch (err) {
        setError("Failed to fetch donation history.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, []);

  // Choose badge color based on donation status
  const getStatusColor = (status) => {
    switch (status) {
      case "delivered":
        return "bg-green-200 text-green-800";
      case "collected":
        return "bg-blue-200 text-blue-800";
      case "pendingAssignment":
        return "bg-yellow-200 text-yellow-800";
      case "assignedForCollection":
      case "enRouteForCollection":
        return "bg-yellow-100 text-yellow-700 border border-yellow-500";
      case "assignedForDistribution":
      case "enRouteForDistribution":
        return "bg-blue-100 text-blue-700 border border-blue-500";
      case "issueReported":
        return "bg-red-200 text-red-800";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

  // Turn camelCase / status codes into readable labels:
  // e.g. "assignedForCollection" → "assigned For Collection"
  const formatStatus = (status) => {
    return status.replace(/([A-Z])/g, " $1").trim();
  };

  // Format posted date as "Jan 5, 2025"
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar with back arrow and page title */}
      <header
        className={`p-4 flex items-center text-white ${primaryGreen} shadow-lg`}
      >
        <button
          onClick={() => navigate(-1)}
          className="text-white mr-4 text-2xl"
        >
          &larr;
        </button>
        <h1 className="text-xl font-bold">My Donation History</h1>
      </header>

      <div className="p-5">
        {/* Show error message if the history request failed */}
        {error && <p className="text-red-600 text-center mb-4">{error}</p>}

        {/* Loading state while waiting for API response */}
        {isLoading ? (
          <div className="text-center p-8">
            <div className="animate-spin inline-block w-8 h-8 border-4 rounded-full border-green-700 border-t-transparent"></div>
            <p className="mt-2 text-gray-600">Loading history...</p>
          </div>
        ) : donations.length === 0 ? (
          // Case: donor has not posted any donations yet
          <div className="text-center p-8 text-gray-500">
            <p>You have not posted any donations yet.</p>
          </div>
        ) : (
          // Main list of donation cards
          <ul className="space-y-4">
            {donations.map((donation) => (
              <li
                key={donation.donationId}
                className="bg-white p-4 rounded-xl shadow-md border-l-4 border-yellow-600"
              >
                {/* Top row: item info + status badge */}
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-lg font-bold text-gray-800">
                      {donation.itemType} ({donation.quantity})
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Posted: {formatDate(donation.postedAt)}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                      donation.status
                    )}`}
                  >
                    {formatStatus(donation.status)}
                  </span>
                </div>

                {/* Extra details: pickup address + volunteer names if available */}
                <div className="mt-2 text-sm text-gray-500">
                  <p>Pickup: {donation.pickupAddress}</p>

                  {(donation.collectionVolunteerName ||
                    donation.collectedByVolunteerName) && (
                    <p className="mt-1 text-green-700 text-xs font-semibold">
                      Picked up by:{" "}
                      {donation.collectionVolunteerName ||
                        donation.collectedByVolunteerName}
                    </p>
                  )}

                  {donation.deliveryVolunteerName && (
                    <p className="mt-1 text-blue-700 text-xs font-semibold">
                      Delivered by: {donation.deliveryVolunteerName}
                    </p>
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

export default DonorHistoryScreen;
