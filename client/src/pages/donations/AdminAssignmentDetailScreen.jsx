import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";
import { donationService } from "../../services/donationService";

// Google Maps configuration
const libraries = ["places"];
const mapContainerStyle = {
  height: "250px",
  width: "100%",
  borderRadius: "10px",
};

const AdminAssignmentDetailScreen = () => {
  // donationId from the URL, e.g. /admin/assign/:id
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Donation object passed from the dashboard (if available)
  const initialData = location.state?.donation;

  // Query param ?issue=true means we opened this screen from “Reported Issues”
  const queryParams = new URLSearchParams(location.search);
  const isIssueMode = queryParams.get("issue") === "true";

  // Core page state
  const [donation, setDonation] = useState(initialData);
  const [volunteers, setVolunteers] = useState([]);
  const [distributionLocations, setDistributionLocations] = useState([]);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState("");
  const [selectedVolunteerName, setSelectedVolunteerName] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState("");
  const [reportingVolunteer, setReportingVolunteer] = useState(null);
  const [originalVolunteer, setOriginalVolunteer] = useState(null); // currently not used, but reserved for future logic

  // Load Google Maps script using the API key from env
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  /**
   * Normalize donation data so this screen works even if the object
   * came from slightly different shapes (itemType vs foodItem, missing pickupLocation, etc.)
   */
  const normalizedDonation = {
    ...donation,
    itemType: donation?.itemType || donation?.foodItem || "Unknown",
    pickupLocation: donation?.pickupLocation || { coordinates: [0, 0] },
  };

  // Flags to decide which mode we are in
  const isPendingCollection =
    normalizedDonation?.status === "pendingAssignment" && !isIssueMode;
  const isPendingDistribution = normalizedDonation?.status === "collected";
  const isIssueReported = isIssueMode;

  /**
   * Main effect: when donation changes or issue mode changes,
   * load all necessary assignment data (volunteer list, distribution centers,
   * reporting volunteer details, etc.).
   */
  useEffect(() => {
    if (!donation) {
      setError("Donation data not available. Please return to the dashboard.");
      setIsLoading(false);
      return;
    }

    // Small helper to fetch volunteer profile by ID and store it in a setter
    const fetchVolunteerDetails = async (volunteerId, setter) => {
      if (!volunteerId) return null;
      try {
        const response = await donationService.getVolunteerDetails(volunteerId);
        setter(response.user);
      } catch (e) {
        console.error("Failed to fetch volunteer details:", e);
      }
    };

    // Load volunteers, distribution locations, and issue info depending on mode
    const fetchAssignmentData = async () => {
      try {
        // 1) Collection assignment mode: load volunteers sorted by distance to pickup
        if (isPendingCollection) {
          const pickupCoords = normalizedDonation.pickupLocation?.coordinates;
          if (pickupCoords) {
            const volData = await donationService.getVolunteers(pickupCoords);
            setVolunteers(volData);
            // Preselect the closest volunteer by default
            if (volData.length > 0) {
              setSelectedVolunteerId(volData[0].uid);
              setSelectedVolunteerName(volData[0].name);
            }
          }
        }

        // 2) Distribution assignment mode: load dropoff centers and the collector volunteer
        if (isPendingDistribution) {
          const locData = await donationService.getDistributionLocations();
          setDistributionLocations(locData);

          // Preselect the volunteer who already collected the donation
          if (donation.collectedByVolunteerId) {
            setSelectedVolunteerId(donation.collectedByVolunteerId);
            try {
              const volDetails = await donationService.getVolunteerDetails(
                donation.collectedByVolunteerId
              );
              setSelectedVolunteerName(volDetails.user?.name || "Unknown");
            } catch (e) {
              setSelectedVolunteerName("Unknown");
            }
          }
        }

        // 3) Issue resolution mode: load volunteer pool & the volunteer who reported the issue
        if (isIssueReported) {
          const volData = await donationService.getVolunteers();
          setVolunteers(volData || []);

          await fetchVolunteerDetails(
            donation.currentVolunteer?.uid || donation.currentVolunteer,
            setReportingVolunteer
          );
        }
      } catch (err) {
        setError("Failed to load assignment data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssignmentData();
  }, [donation?.donationId, isIssueMode]);

  /**
   * Admin: assign a collection task to the selected volunteer.
   * Uses /assign-collection-task API and then returns to admin dashboard.
   */
  const handleAssignCollectionTask = async () => {
    if (!selectedVolunteerId) {
      setError("Please select a volunteer before assigning the task.");
      return;
    }

    setIsAssigning(true);
    setError("");

    try {
      await donationService.assignCollectionTask(
        donation.donationId,
        selectedVolunteerId
      );
      alert(
        `Collection task successfully assigned to ${selectedVolunteerName}!`
      );
      navigate("/admin");
    } catch (err) {
      setError(
        `Assignment failed: ${err.message || "Check network connection."}`
      );
    } finally {
      setIsAssigning(false);
    }
  };

  /**
   * Admin: assign a distribution task (dropoff) for an already collected donation.
   * Needs both volunteer (usually collector) and distribution location.
   */
  const handleAssignDistributionTask = async () => {
    if (!selectedLocationId) {
      setError("Please select a drop-off location.");
      return;
    }

    setIsAssigning(true);
    setError("");

    try {
      await donationService.assignDistributionTask(
        donation.donationId,
        selectedVolunteerId,
        selectedLocationId
      );
      alert("Distribution task assigned successfully!");
      navigate("/admin");
    } catch (err) {
      setError(
        `Distribution assignment failed: ${
          err.message || "Check network connection."
        }`
      );
    } finally {
      setIsAssigning(false);
    }
  };

  /**
   * Admin: handle issue resolution actions.
   * Right now only "REASSIGN" is supported (reassign task to another volunteer).
   */
  const handleResolveIssue = async (action) => {
    setIsAssigning(true);
    setError("");

    try {
      let message = "";

      if (action === "REASSIGN") {
        // Task ID can come from separate task model or fallback to donation _id
        const taskId = donation?.taskId || donation?._id;
        if (!taskId) {
          throw new Error("Unable to find task to reassign.");
        }

        // Pick selected volunteer, or the first in list as fallback
        let selectedVol = selectedVolunteerId;
        if (!selectedVol && volunteers.length > 0) {
          selectedVol = volunteers[0].uid;
        }

        if (!selectedVol) {
          throw new Error("No volunteer selected for reassignment.");
        }

        await donationService.reassignTask(taskId, selectedVol);
        message = "Issue resolved. Task reassigned to new volunteer.";
      }

      alert(message);
      navigate("/admin");
    } catch (err) {
      setError(`Issue resolution failed: ${err.message}`);
    } finally {
      setIsAssigning(false);
    }
  };

  // Utility: convert raw date string into a readable format
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Small helper to render a “label : value” detail row
  const getDetailRow = (title, value) => (
    <div className="flex mb-2 text-gray-800">
      <p className="font-semibold w-1/3 min-w-[150px]">{title}:</p>
      <p className="w-2/3">{value}</p>
    </div>
  );

  // Build readable text for a volunteer option in the dropdown
  const formatVolunteerOption = (user) => {
    const distanceText =
      user.distanceKm !== Infinity && user.distanceKm !== undefined
        ? `(${user.distanceKm.toFixed(2)} km away)`
        : "(Location Unknown)";
    const phoneText = user.phone ? ` | Phone: ${user.phone}` : "";
    const addressText = user.homeLocation?.address
      ? ` | Address: ${user.homeLocation.address}`
      : "";

    return `${user.name} ${distanceText}${phoneText}${addressText}`;
  };

  /**
   * UI block: collection assignment mode.
   * Shows volunteer dropdown (sorted by distance) + assign button.
   */
  const renderCollectionAssignment = () => (
    <>
      <h3 className="text-2xl font-bold text-green-700 mb-3">
        Select Volunteer (Sorted by Proximity)
      </h3>
      <hr className="border-green-700 mb-4" />

      {volunteers.length === 0 ? (
        <p className="text-gray-500">No active volunteers available.</p>
      ) : (
        <div className="relative mb-6">
          <select
            value={selectedVolunteerId}
            onChange={(e) => {
              const id = e.target.value;
              const user = volunteers.find((v) => v.uid === id);
              setSelectedVolunteerId(id);
              setSelectedVolunteerName(user?.name || "");
            }}
            className="w-full p-3 border-2 border-green-700 rounded-lg appearance-none bg-white text-gray-800"
          >
            <option value="" disabled>
              Choose a Volunteer
            </option>
            {volunteers.map((user) => (
              <option key={user.uid} value={user.uid}>
                {formatVolunteerOption(user)}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="text-red-600 text-center mb-4">{error}</p>}

      <button
        onClick={handleAssignCollectionTask}
        disabled={isAssigning || !selectedVolunteerId}
        className={`w-full py-3 text-lg font-bold rounded-lg shadow-xl transition duration-150 ease-in-out ${
          isAssigning || !selectedVolunteerId
            ? "bg-yellow-600/50 cursor-not-allowed"
            : "bg-yellow-600 text-white hover:bg-yellow-700"
        }`}
      >
        {isAssigning ? "Assigning..." : "Assign Collection Task"}
      </button>
    </>
  );

  /**
   * UI block: distribution assignment mode.
   * Admin chooses a dropoff center for a collected donation.
   */
  const renderDistributionAssignment = () => (
    <>
      <h3 className="text-2xl font-bold text-blue-700 mb-3">
        Assign Dropoff Location
      </h3>
      <hr className="border-blue-700 mb-4" />

      <div className="text-sm text-gray-600 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        Item collected by <strong>{selectedVolunteerName || "N/A"}</strong>.
        Select a destination.
      </div>

      <h4 className="font-bold text-gray-700 mb-2">Select Dropoff Center:</h4>
      <div className="relative mb-4">
        <select
          value={selectedLocationId}
          onChange={(e) => setSelectedLocationId(e.target.value)}
          className="w-full p-3 border-2 border-blue-700 rounded-lg appearance-none bg-white text-gray-800"
        >
          <option value="" disabled>
            Choose a Center
          </option>
          {distributionLocations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name} | {loc.address}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-red-600 text-center mb-4">{error}</p>}

      <button
        onClick={handleAssignDistributionTask}
        disabled={isAssigning || !selectedLocationId}
        className={`w-full py-3 text-lg font-bold rounded-lg shadow-xl transition duration-150 ease-in-out ${
          isAssigning || !selectedLocationId
            ? "bg-blue-600/50 cursor-not-allowed"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        {isAssigning ? "Assigning..." : "Assign Dropoff Task"}
      </button>
    </>
  );

  /**
   * UI block: issue resolution mode.
   * Shows issue notes, reporting volunteer details, and lets admin reassign.
   */
  const renderIssueResolution = () => (
    <>
      <h3 className="text-2xl font-bold text-red-700 mb-3">
        Task Issue Resolution
      </h3>
      <hr className="border-red-700 mb-4" />

      <div className="bg-red-50 p-4 rounded-lg shadow mb-6 border-l-4 border-red-600">
        <p className="font-bold text-red-700 mb-2">Issue Reported:</p>
        <p className="text-gray-800 italic mb-3">
          "{donation?.issueNotes || "No description provided."}"
        </p>

        <p className="font-semibold text-gray-700">Reported By:</p>
        {reportingVolunteer ? (
          <>
            <p className="text-sm text-gray-600">
              {reportingVolunteer.name} ({reportingVolunteer.role})
            </p>
            <p className="text-sm text-gray-600">
              Contact: {reportingVolunteer.phone || "N/A"}
            </p>
          </>
        ) : (
          <p className="text-sm text-gray-600">
            Volunteer details loading or unknown.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <p className="font-bold text-gray-700">Actions:</p>

        {volunteers.length > 0 && (
          <div className="mb-3">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Volunteer for Reassignment:
            </label>
            <select
              value={selectedVolunteerId}
              onChange={(e) => {
                const selected = volunteers.find(
                  (v) => v.uid === e.target.value
                );
                setSelectedVolunteerId(e.target.value);
                setSelectedVolunteerName(selected?.name || "");
              }}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">-- Choose a volunteer --</option>
              {volunteers.map((vol) => (
                <option key={vol.uid} value={vol.uid}>
                  {vol.name}{" "}
                  {vol.distanceKm && vol.distanceKm !== Infinity
                    ? `(${vol.distanceKm.toFixed(1)}km)`
                    : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={() => handleResolveIssue("REASSIGN")}
          disabled={isAssigning || !selectedVolunteerId}
          className={`w-full py-3 text-lg font-bold rounded-lg shadow-xl transition duration-150 ease-in-out ${
            isAssigning || !selectedVolunteerId
              ? "bg-red-500/50 cursor-not-allowed"
              : "bg-red-500 text-white hover:bg-red-600"
          }`}
        >
          {isAssigning
            ? "Re-assigning..."
            : "REASSIGN / Re-queue for Collection"}
        </button>
      </div>
    </>
  );

  // Early error: Google Maps script failed
  if (loadError)
    return (
      <div className="p-4 text-red-600 text-center">
        Map Loading Error: {loadError.message}
      </div>
    );

  // Map center based on donation pickup coordinates
  const [lng, lat] = normalizedDonation?.pickupLocation?.coordinates || [0, 0];
  const center = { lat: lat, lng: lng };
  const mapOptions = { zoom: 15, disableDefaultUI: false };

  // Loading state for the whole screen while fetching assignment data
  if (isLoading) {
    return (
      <div className="p-4 text-center min-h-screen bg-gray-50 flex items-center justify-center">
        <div>
          <div className="animate-spin inline-block w-8 h-8 border-4 rounded-full border-green-700 border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Loading assignment data...</p>
        </div>
      </div>
    );
  }

  // If donation is missing or we already hit an error
  if (error || !donation) {
    return <div className="p-4 text-red-600 text-center">{error}</div>;
  }

  // ------------- MAIN RENDER -------------
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with back arrow and mode title */}
      <header className="bg-green-700 text-white p-4 flex items-center shadow-lg">
        <button
          onClick={() => navigate(-1)}
          className="text-white mr-4 text-2xl"
        >
          &larr;
        </button>
        <h1 className="text-xl font-bold">
          {isIssueReported ? "Issue Review" : "Assignment Details"}
        </h1>
      </header>

      <div className="p-5">
        {/* Map showing the pickup location */}
        <h3 className="text-2xl font-bold text-green-700 mb-3">Location Map</h3>
        <hr className="border-green-700 mb-4" />

        <div className="rounded-xl overflow-hidden border border-green-700/50 flex items-center justify-center mb-6">
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
              center={center}
              options={mapOptions}
            >
              <Marker
                position={center}
                label={donation?.donorName?.charAt(0) || "P"}
                title={donation?.pickupAddress || "Pickup Location"}
              />
            </GoogleMap>
          )}
        </div>

        {/* Mode-specific control panel: issue / collection / distribution / or no-op */}
        <div className="mt-8">
          {isIssueReported && renderIssueResolution()}
          {isPendingCollection &&
            !isIssueReported &&
            renderCollectionAssignment()}
          {isPendingDistribution &&
            !isIssueReported &&
            renderDistributionAssignment()}

          {!isPendingCollection &&
            !isPendingDistribution &&
            !isIssueReported && (
              <p className="text-xl text-gray-500 text-center p-8">
                Donation is currently {donation?.status}. No action required.
              </p>
            )}
        </div>

        {/* Detailed donation information card */}
        <h3 className="text-2xl font-bold text-green-700 mb-3 mt-8">
          Donation Details
        </h3>
        <hr className="border-green-700 mb-4" />

        <div className="bg-white p-4 rounded-lg shadow">
          {getDetailRow(
            "Item & Quantity",
            `${normalizedDonation?.itemType} (${normalizedDonation?.quantity})`
          )}
          {getDetailRow("Pickup Address", normalizedDonation?.pickupAddress)}
          {getDetailRow(
            "Available From",
            formatDate(normalizedDonation?.availabilityTime)
          )}
          {getDetailRow("Notes", normalizedDonation?.notes || "N/A")}
        </div>
      </div>
    </div>
  );
};

export default AdminAssignmentDetailScreen;
