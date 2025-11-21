import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";
import { donationService } from "../../services/donationService";

const libraries = ["places"];
const mapContainerStyle = {
  height: "250px",
  width: "100%",
  borderRadius: "10px",
};

const TaskDetailScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialTask = location.state?.task;

  const [task, setTask] = useState(initialTask);
  const [volunteerDetails, setVolunteerDetails] = useState(null);
  const [distance, setDistance] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");

  const primaryGreen = "#228B22";
  const accentGold = "#DAA520";
  const blueDist = "#3B82F6";

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  if (!task) {
    return (
      <div className="p-4 text-red-600 text-center">Task data not found.</div>
    );
  }

  // Haversine formula to calculate distance between two coordinates
  const calculateDistance = (coord1, coord2) => {
    const R = 6371;
    const dLat = (coord2[1] - coord1[1]) * (Math.PI / 180);
    const dLon = (coord2[0] - coord1[0]) * (Math.PI / 180);
    const lat1 = coord1[1] * (Math.PI / 180);
    const lat2 = coord2[1] * (Math.PI / 180);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    const fetchVolunteer = async () => {
      const volId = task.collectionVolunteerId || task.distributionVolunteerId;
      if (!volId) return;

      try {
        const response = await donationService.getVolunteerDetails(volId);
        const details = response.user;

        setVolunteerDetails(details);

        const targetCoords =
          task.status === "collected"
            ? details.homeLocation?.coordinates
            : task.pickupLocation?.coordinates;

        if (details.homeLocation?.coordinates && targetCoords) {
          const distKm = calculateDistance(
            details.homeLocation.coordinates,
            targetCoords
          );
          setDistance(distKm.toFixed(2));
        }
      } catch (e) {
        console.error("Failed to fetch volunteer details:", e);
      }
    };
    fetchVolunteer();
  }, [task]);

  // Status mapping
  const DonationStatus = {
    pendingAssignment: "Pending Assignment",
    assignedForCollection: "Assigned For Collection",
    enRouteForCollection: "En Route For Collection",
    collected: "Collected, Awaiting Dropoff Assignment",
    assignedForDistribution: "Assigned For Distribution",
    enRouteForDistribution: "En Route For Distribution",
    delivered: "Delivered",
    issueReported: "Issue Reported",
  };

  // Format status utility
  const formatStatus = (status) => DonationStatus[status] || status;

  // Determine next status based on current status
  const getNextStatus = (currentStatus) => {
    switch (currentStatus) {
      case "assignedForCollection":
        return "enRouteForCollection";
      case "enRouteForCollection":
        return "collected";
      case "assignedForDistribution":
        return "enRouteForDistribution";
      case "enRouteForDistribution":
        return "delivered";
      default:
        return currentStatus;
    }
  };

  // Get button properties based on current status
  const getButtonProps = (currentStatus) => {
    let label = "Task Completed";
    let icon = (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );

    switch (currentStatus) {
      case "assignedForCollection":
        label = "I Am En Route for Collection";
        break;
      case "enRouteForCollection":
        label = "Collected Item (Admin will assign dropoff)";
        break;
      case "assignedForDistribution":
        label = "I Am En Route for Dropoff";
        break;
      case "enRouteForDistribution":
        label = "Delivered Item";
        break;
      default:
        break;
    }
    return { label, icon };
  };

  // Action button handler
  const handleActionButton = async () => {
    const nextStatus = getNextStatus(task.status);
    const statusName = formatStatus(nextStatus);

    setIsUpdating(true);
    setError("");

    try {
      const response = await donationService.updateDonationStatus(
        task.donationId,
        nextStatus
      );

      setTask(response.donation);
      alert(`Task status successfully updated to ${statusName}!`);
      if (nextStatus !== "collected") {
        navigate("/volunteer/dashboard");
      }
    } catch (e) {
      setError(`Failed to update status: ${e.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Report issue handler
  const reportIssue = async () => {
    if (
      !window.confirm(
        "This will mark the task as having an issue, and the Admin will be notified. Continue?"
      )
    ) {
      return;
    }

    setIsUpdating(true);
    setError("");

    try {
      const response = await donationService.updateDonationStatus(
        task.donationId,
        "issueReported"
      );

      setTask(response.donation);
      alert("Issue reported successfully. Admin notified.");
      navigate("/volunteer/dashboard");
    } catch (e) {
      setError(`Failed to report issue: ${e.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Determine task type and related properties
  const currentTaskType = task.collectionVolunteerId
    ? "Collection"
    : task.distributionVolunteerId
    ? "Distribution"
    : "Pending";
  const isCollectionPhase = currentTaskType === "Collection";
  const isDistributionPhase = currentTaskType === "Distribution";
  const { label, icon } = getButtonProps(task.status);

  const targetAddress = isDistributionPhase
    ? task.dropoffAddress
    : task.pickupAddress;
  const targetCoords =
    task.dropoffLocation?.coordinates || task.pickupLocation?.coordinates;

  const buildDetailRow = (rowIcon, title, value) => (
    <div className="flex items-start pb-3 mb-2 border-b border-gray-100">
      <span className="text-yellow-600 mr-2">{rowIcon}</span>
      <div className="flex-shrink-0 w-1/3 font-semibold text-gray-700">
        {title}:
      </div>
      <div className="flex-grow text-gray-600">{value}</div>
    </div>
  );

  const mapCenter = targetCoords
    ? { lat: targetCoords[1], lng: targetCoords[0] }
    : { lat: 0, lng: 0 };

  const mapOptions = {
    zoom: 15,
    disableDefaultUI: true,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-700 text-white p-4 flex items-center shadow-lg">
        <button
          onClick={() => navigate(-1)}
          className="text-white mr-4 text-2xl"
        >
          &larr;
        </button>
        <h1 className="text-xl font-bold">{currentTaskType} Details</h1>
      </header>

      <div className="p-5">
        <h3 className="text-xl font-bold text-green-700 mb-3">
          Target Location Map
        </h3>
        <hr className="border-green-700 mb-4" />

        <div className="rounded-xl overflow-hidden border border-green-700/50 flex items-center justify-center mb-6">
          {loadError && (
            <div className="p-4 text-red-600 text-center">
              Map Error: {loadError.message}
            </div>
          )}
          {!isLoaded ? (
            <div
              style={{ height: "250px", width: "100%" }}
              className="flex justify-center items-center bg-gray-200"
            >
              <div className="animate-spin inline-block w-8 h-8 border-4 rounded-full border-green-700 border-t-transparent"></div>
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              options={mapOptions}
            >
              <Marker
                position={mapCenter}
                label={isDistributionPhase ? "D" : "P"}
                title={targetAddress}
              />
            </GoogleMap>
          )}
        </div>

        <div
          className={`p-4 rounded-xl shadow-md flex items-center mb-6 ${
            isDistributionPhase ? "bg-blue-100" : "bg-yellow-100"
          }`}
          style={{ borderLeft: `5px solid ${primaryGreen}` }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-green-700 mr-3"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.414L11 9.586V6z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-lg font-bold text-green-700">
            Current Task: {formatStatus(task.status)}
          </p>
        </div>

        {error && <p className="text-red-600 text-center mb-4">{error}</p>}

        <h3 className="text-xl font-bold text-green-700 mb-3">
          Assignment Details
        </h3>
        <hr className="border-green-700 mb-4" />
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          {volunteerDetails && (
            <>
              {distance &&
                buildDetailRow(
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM10 12a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>,
                  "Distance (Approx)",
                  `${distance} km / ${(distance * 1000).toFixed(0)} meters`
                )}
            </>
          )}
        </div>

        <h3 className="text-xl font-bold text-green-700 mb-3">
          Donation Details
        </h3>
        <hr className="border-green-700 mb-4" />
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          {buildDetailRow(
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
            </svg>,
            "Item Type",
            task.itemType
          )}
          {buildDetailRow(
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zm3 14a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>,
            "Quantity",
            task.quantity
          )}
          {buildDetailRow(
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.98 5.98 0 0010 16a5.978 5.978 0 004.546-2.084A5 5 0 0010 11z"
                clipRule="evenodd"
              />
            </svg>,
            "Donor/Source",
            task.donorName
          )}
          {buildDetailRow(
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7z" />
              <path
                fillRule="evenodd"
                d="M10 9a1 1 0 011 1v4a1 1 0 11-2 0v-4a1 1 0 011-1z"
                clipRule="evenodd"
              />
              <path
                fillRule="evenodd"
                d="M2 11a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            </svg>,
            "Notes",
            task.notes || "None provided"
          )}
        </div>

        <h3 className="text-xl font-bold text-green-700 mb-3">
          {isDistributionPhase ? "Dropoff" : "Pickup"} Location
        </h3>
        <hr className="border-green-700 mb-4" />
        <div className="bg-white p-4 rounded-lg shadow mb-8">
          {buildDetailRow(
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                clipRule="evenodd"
              />
            </svg>,
            "Address",
            targetAddress
          )}
          {buildDetailRow(
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.414L11 9.586V6z"
                clipRule="evenodd"
              />
            </svg>,
            isDistributionPhase ? "Deadline" : "Available At",
            new Date(task.availabilityTime).toLocaleString("en-US")
          )}
        </div>

        {task.status === "collected" && (
          <div
            className={`p-4 rounded-xl shadow-md flex items-center mb-6 bg-blue-100`}
            style={{ borderLeft: `5px solid ${blueDist}` }}
          >
            <p className="text-lg font-bold text-blue-700">
              ✅ Item Collected. Waiting for Admin to assign Dropoff Location.
            </p>
          </div>
        )}

        {task.status !== "delivered" &&
          task.status !== "issueReported" &&
          task.status !== "collected" && (
            <div className="space-y-3">
              <button
                onClick={handleActionButton}
                disabled={isUpdating}
                className={`w-full py-4 text-white text-lg font-bold rounded-xl transition duration-150 ease-in-out flex items-center justify-center space-x-2 ${
                  isUpdating
                    ? "bg-green-700/70 cursor-not-allowed"
                    : "bg-green-700 hover:bg-green-800 shadow-lg"
                }`}
              >
                {isUpdating ? (
                  <div className="animate-spin inline-block w-6 h-6 border-4 rounded-full border-white border-t-transparent"></div>
                ) : (
                  <>
                    {icon}
                    <span>{label}</span>
                  </>
                )}
              </button>

              <button
                onClick={reportIssue}
                disabled={isUpdating}
                className="w-full py-2 text-red-600 font-semibold rounded-lg hover:bg-red-50 transition"
              >
                <span className="flex items-center justify-center space-x-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Report Issue</span>
                </span>
              </button>
            </div>
          )}

        {task.status === "assignedForDistribution" && (
          <div className="space-y-3">
            <button
              onClick={handleActionButton}
              disabled={isUpdating}
              className={`w-full py-4 text-white text-lg font-bold rounded-xl transition duration-150 ease-in-out flex items-center justify-center space-x-2 ${
                isUpdating
                  ? "bg-green-700/70 cursor-not-allowed"
                  : "bg-green-700 hover:bg-green-800 shadow-lg"
              }`}
            >
              {isUpdating ? (
                <div className="animate-spin inline-block w-6 h-6 border-4 rounded-full border-white border-t-transparent"></div>
              ) : (
                <>
                  {icon}
                  <span>{label}</span>
                </>
              )}
            </button>
          </div>
        )}

        {task.status === "issueReported" && (
          <div className="p-4 bg-red-100 border-l-4 border-red-600 text-center rounded-lg">
            <p className="text-red-600 font-bold text-lg">
              Issue reported. Awaiting Admin review.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskDetailScreen;
