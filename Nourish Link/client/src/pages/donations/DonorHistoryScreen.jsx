import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { donationService } from "../../services/donationService";

const DonorHistoryScreen = () => {
  const navigate = useNavigate();
  const [donations, setDonations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const primaryGreen = "bg-green-700";

  useEffect(() => {
    const fetchHistory = async () => {
      try {
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

  // Status color utility
  const getStatusColor = (status) => {
    switch (status) {
      case "delivered":
        return "bg-green-200 text-green-800";
      case "collected":
        return "bg-blue-200 text-blue-800";
      case "pendingAssignment":
        return "bg-yellow-200 text-yellow-800";
      case "issueReported":
        return "bg-red-200 text-red-800";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

  //  Format status utility
  const formatStatus = (status) => {
    return status.replace(/([A-Z])/g, " $1").trim();
  };

  // Format date utility
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
        {error && <p className="text-red-600 text-center mb-4">{error}</p>}

        {isLoading ? (
          <div className="text-center p-8">
            <div className="animate-spin inline-block w-8 h-8 border-4 rounded-full border-green-700 border-t-transparent"></div>
            <p className="mt-2 text-gray-600">Loading history...</p>
          </div>
        ) : donations.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            <p>You have not posted any donations yet.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {donations.map((donation) => (
              <li
                key={donation.donationId}
                className="bg-white p-4 rounded-xl shadow-md border-l-4 border-yellow-600"
              >
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
                <div className="mt-2 text-sm text-gray-500">
                  <p>Pickup: {donation.pickupAddress}</p>
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
