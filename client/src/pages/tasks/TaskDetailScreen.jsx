import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";
import { donationService } from "../../services/donationService";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// Tell Google Maps API we want Places library as well
const libraries = ["places"];

// Fixed size + rounded corners for the embedded map
const mapContainerStyle = {
  height: "250px",
  width: "100%",
  borderRadius: "10px",
};

const TaskDetailScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Task is passed from previous screen via React Router state
  const initialTask = location.state?.task;

  // Task and related details
  const [task, setTask] = useState(initialTask);
  const [donation, setDonation] = useState(null);          // Info about the original donation
  const [volunteerDetails, setVolunteerDetails] = useState(null); // Extended volunteer info
  const [distance, setDistance] = useState(null);          // Distance between volunteer home and task location

  // UI state
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");
  const [userAuthenticated, setUserAuthenticated] = useState(false);

  // Brand colors used for styling sections
  const primaryGreen = "#228B22";
  const accentGold = "#DAA520";
  const blueDist = "#3B82F6";

  // Load Google Maps script (async)
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  // If user somehow navigated here with no task, show error
  if (!task) {
    return (
      <div className="p-4 text-red-600 text-center">Task data not found.</div>
    );
  }

  /**
   * Helper: Haversine formula to calculate distance (km)
   * between two [lng, lat] coordinate pairs.
   */
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

  /**
   * Listen to Firebase auth state to confirm user is logged in.
   * We only fetch sensitive task details if the user is authenticated.
   */
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserAuthenticated(!!user);
    });
    return () => unsubscribe();
  }, []);

  /**
   * Once user is authenticated and we have a task,
   * fetch extra information:
   * - Volunteer details (home location, contact)
   * - Donation details (item type, quantity, notes, etc.)
   */
  useEffect(() => {
    const fetchDetails = async () => {
      if (!userAuthenticated || !task) {
        return;
      }

      // Load volunteer info if the task includes a volunteerId
      if (task?.volunteerId) {
        try {
          const response = await donationService.getVolunteerDetails(
            task.volunteerId
          );
          const details = response.user;
          setVolunteerDetails(details);

          // If both have coordinates, calculate approximate distance in km
          if (details.homeLocation?.coordinates && task.location?.coordinates) {
            const distKm = calculateDistance(
              details.homeLocation.coordinates,
              task.location.coordinates
            );
            setDistance(distKm.toFixed(2));
          }
        } catch (e) {
          console.error("Failed to fetch volunteer details:", e);
        }
      }

      // Load donation info if task is tied to a donation
      if (task?.donationId) {
        try {
          const response = await donationService.getDonationDetails(
            task.donationId
          );
          // Backend may return { donation: {...} } or just the object
          setDonation(response.donation || response);
        } catch (e) {
          console.error("Failed to fetch donation details:", e);
          setDonation({ error: "Failed to load donation details" });
        }
      } else {
        // Task exists without a donation (fallback)
        setDonation({ error: "No donation associated with this task" });
      }
    };
    fetchDetails();
  }, [task, userAuthenticated]);

  /**
   * Mapping of backend status codes to human-friendly strings
   * (used for display in UI).
   */
  const DonationStatus = {
    pendingAssignment: "Pending Assignment",
    assignedForCollection: "Assigned For Collection",
    enRouteForCollection: "En Route For Collection",
    collected: "Collected, Awaiting Dropoff Assignment",
    assignedForDistribution: "Assigned For Distribution",
    enRouteForDistribution: "En Route For Distribution",
    delivered: "Delivered",
    pending_review: "Issue Reported, Pending Admin Review",
  };

  const formatStatus = (status) => DonationStatus[status] || status;

  /**
   * Determine the next logical status for the task
   * (simplified status flow for collection / distribution).
   */
  const getNextStatus = (currentStatus) => {
    switch (currentStatus) {
      case "pending":
        return "assigned";
      case "assigned":
        return "enRoute";
      case "enRoute":
        return "completed";
      case "completed":
        return "completed"; // stays completed
      default:
        return currentStatus; // fallback
    }
  };

  /**
   * Based on current task status and type (Collection / Distribution),
   * choose the label/icon to show on the main action button.
   */
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
      case "assigned":
        label =
          currentTaskType === "Collection"
            ? "I Am En Route for Pickup"
            : "I Am En Route for Dropoff";
        break;
      case "enRoute":
        label =
          currentTaskType === "Collection"
            ? "Collected Item (Admin will assign dropoff)"
            : "Delivered Item";
        break;
      case "completed":
        label = "Task Already Completed";
        break;
      default:
        break;
    }
    return { label, icon };
  };

  /**
   * Helper to render a single “row” of icon + label + value.
   * Reused for donation details and location details.
   */
  const buildDetailRow = (icon, label, value) => (
    <div className="flex items-center mb-3">
      <div className="text-green-700 mr-3">{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-md font-semibold text-gray-800">{value}</p>
      </div>
    </div>
  );

  /**
   * Main handler for “status progression” action button.
   * Calls backend to update task status, then updates local state
   * and navigates back to volunteer dashboard when appropriate.
   */
  const handleActionButton = async () => {
    const nextStatus = getNextStatus(task.status);
    const statusName = formatStatus(nextStatus);

    setIsUpdating(true);
    setError("");

    try {
      // Task can have different id fields depending on how it was created
      const response = await donationService.updateTaskStatus(
        task._id || task.taskId || task.donationId,
        nextStatus
      );

      // Backend may return { task } or { donation }, so handle both
      setTask(response.task || response.donation);
      alert(`Task status successfully updated to ${statusName}!`);

      // If this is not just the “collected” step, send volunteer back to dashboard
      if (nextStatus !== "collected") {
        navigate("/volunteer/dashboard");
      }
    } catch (e) {
      setError(`Failed to update status: ${e.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Let volunteer report a problem (wrong address, donor not available, etc.)
   * Prompts for a description and sends it to backend;
   * task is then flagged for admin review.
   */
  const reportIssue = async () => {
    const issueNotes = window.prompt(
      "Please describe the issue briefly (e.g., Donor address incorrect, item quantity changed):"
    );

    // If user cancels, or enters only spaces, do nothing / show validation
    if (issueNotes === null || issueNotes.trim() === "") {
      if (issueNotes !== null) alert("Issue notes cannot be empty.");
      return;
    }

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
      const taskId = task._id || task.taskId || task.donationId;

      const response = await donationService.reportTaskIssue(
        taskId,
        issueNotes
      );

      setTask(response.task);
      alert("Issue reported successfully. Task flagged for Admin review.");
      navigate("/volunteer/dashboard");
    } catch (e) {
      setError(`Failed to report issue: ${e.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Convert backend taskType into a human-readable “Collection” or “Distribution”
  const currentTaskType =
    task?.taskType === "collection" ? "Collection" : "Distribution";

  const isDistributionPhase = currentTaskType === "Distribution";

  // Button label + icon depend on task status and type
  const { label, icon } = getButtonProps(task.status);

  // Coordinates of this task’s target location (pickup or dropoff)
  const targetCoords = task?.location?.coordinates;

  // Center map on target location (fallback to 0,0 if missing)
  const mapCenter = targetCoords
    ? { lat: targetCoords[1], lng: targetCoords[0] }
    : { lat: 0, lng: 0 };

  const targetAddress = task?.address || "Address not available";

  const mapOptions = {
    zoom: 15,
    disableDefaultUI: true,
  };

  // Prevent action button when task is already closed or under review
  const isActionBlocked =
    task.status === "completed" ||
    task.status === "cancelled" ||
    task.status === "failed" ||
    task.status === "pending_review";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar with back arrow and dynamic title (Collection/Distribution) */}
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
        {/* ---- Map Section ---- */}
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
                // Label “P” for pickup or “D” for dropoff target
                label={isDistributionPhase ? "D" : "P"}
                title={targetAddress}
              />
            </GoogleMap>
          )}
        </div>

        {/* Current task status banner */}
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

        {/* ---- Donation Details ---- */}
        <h3 className="text-xl font-bold text-green-700 mb-3">
          Donation Details
        </h3>
        <hr className="border-green-700 mb-4" />

        <div className="bg-white p-4 rounded-lg shadow mb-6">
          {donation && !donation?.error ? (
            <>
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
                donation.itemType
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
                donation.quantity
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
                donation.donorName
              )}
            </>
          ) : donation?.error ? (
            <p className="text-red-600">{donation.error}</p>
          ) : (
            <p className="text-gray-500">Loading donation details...</p>
          )}

          {/* Donor notes (if any) */}
          {donation &&
            buildDetailRow(
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
              "Donor Notes",
              donation.notes || "None provided"
            )}
        </div>

        {/* ---- Pickup / Dropoff Location Details ---- */}
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
            donation
              ? new Date(donation.availabilityTime).toLocaleString("en-US")
              : "Loading..."
          )}
        </div>

        {/* Special info when collection is completed but distribution not yet assigned */}
        {currentTaskType === "Collection" && task.status === "completed" && (
          <div
            className={`p-4 rounded-xl shadow-md flex items-center mb-6 bg-blue-100`}
            style={{ borderLeft: `5px solid ${blueDist}` }}
          >
            <p className="text-lg font-bold text-blue-700">
              ✅ Item Collected. Waiting for Admin to assign Dropoff Location.
            </p>
          </div>
        )}

        {/* Banner if task is under review due to an issue */}
        {task.status === "pending_review" && (
          <div className="p-4 bg-red-100 border-l-4 border-red-600 text-center rounded-lg mb-4">
            <p className="text-red-600 font-bold text-lg">
              ⚠️ Issue reported. Awaiting Admin review.
            </p>
          </div>
        )}

        {/* ---- Action Buttons (Update status / Report issue) ---- */}
        {!isActionBlocked && (
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

        {/* If task already has issueReported status, show info banner */}
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
