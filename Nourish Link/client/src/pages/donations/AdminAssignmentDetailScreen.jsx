import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";
import { donationService } from "../../services/donationService";

const libraries = ["places"];
const mapContainerStyle = {
  height: "250px",
  width: "100%",
  borderRadius: "10px",
};

const AdminAssignmentDetailScreen = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const donation = location.state?.donation;

  const [volunteers, setVolunteers] = useState([]);
  const [distributionLocations, setDistributionLocations] = useState([]);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState("");
  const [selectedVolunteerName, setSelectedVolunteerName] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState("");

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const isPendingCollection = donation?.status === "pendingAssignment";
  const isPendingDistribution = donation?.status === "collected";

  useEffect(() => {
    if (!donation) {
      setError("Donation data not available. Please return to the dashboard.");
      setIsLoading(false);
      return;
    }

    // Fetch volunteers or distribution locations based on donation status
    const fetchAssignmentData = async () => {
      try {
        if (isPendingCollection) {
          const pickupCoords = donation.pickupLocation.coordinates;
          const volData = await donationService.getVolunteers(pickupCoords);
          setVolunteers(volData);
          if (volData.length > 0) {
            setSelectedVolunteerId(volData[0].uid);
            setSelectedVolunteerName(volData[0].name);
          }
        }

        if (isPendingDistribution) {
          const locData = await donationService.getDistributionLocations();
          setDistributionLocations(locData);
          if (donation.collectedByVolunteerId) {
            setSelectedVolunteerId(donation.collectedByVolunteerId);
            setSelectedVolunteerName(donation.collectedByVolunteerId);
          }
        }
      } catch (err) {
        setError("Failed to load assignment data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssignmentData();
  }, [donation]);

  // Assign collection task handler
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

  // Assign distribution task handler
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

  // Format date utility
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Detail row component
  const getDetailRow = (title, value) => (
    <div className="flex mb-2 text-gray-800">
      <p className="font-semibold w-1/3 min-w-[150px]">{title}:</p>
      <p className="w-2/3">{value}</p>
    </div>
  );

  // Format volunteer option text
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

  // Render collection assignment section
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

  // Render distribution assignment section
  const renderDistributionAssignment = () => (
    <>
      <h3 className="text-2xl font-bold text-blue-700 mb-3">
        Assign Dropoff Location
      </h3>
      <hr className="border-blue-700 mb-4" />

      <div className="text-sm text-gray-600 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        Item collected by **{donation.collectedByVolunteerId || "N/A"}**. Select
        a destination.
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

  if (loadError)
    return (
      <div className="p-4 text-red-600 text-center">
        Map Loading Error: {loadError.message}
      </div>
    );

  const [lng, lat] = donation?.pickupLocation?.coordinates || [0, 0];
  const center = { lat: lat, lng: lng };
  const mapOptions = { zoom: 15, disableDefaultUI: false };

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

  if (error || !donation) {
    return <div className="p-4 text-red-600 text-center">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-700 text-white p-4 flex items-center shadow-lg">
        <button
          onClick={() => navigate(-1)}
          className="text-white mr-4 text-2xl"
        >
          &larr;
        </button>
        <h1 className="text-xl font-bold">Assignment Details</h1>
      </header>

      <div className="p-5">
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

        <div className="mt-8">
          {isPendingCollection && renderCollectionAssignment()}
          {isPendingDistribution && renderDistributionAssignment()}

          {!isPendingCollection && !isPendingDistribution && (
            <p className="text-xl text-gray-500 text-center p-8">
              Donation is currently {donation?.status}. No action required.
            </p>
          )}
        </div>

        <h3 className="text-2xl font-bold text-green-700 mb-3 mt-8">
          Donation Details
        </h3>
        <hr className="border-green-700 mb-4" />

        <div className="bg-white p-4 rounded-lg shadow">
          {getDetailRow(
            "Item & Quantity",
            `${donation?.itemType} (${donation?.quantity})`
          )}
          {getDetailRow("Pickup Address", donation?.pickupAddress)}
          {getDetailRow(
            "Available From",
            formatDate(donation?.availabilityTime)
          )}
          {getDetailRow("Notes", donation?.notes || "N/A")}
        </div>
      </div>
    </div>
  );
};

export default AdminAssignmentDetailScreen;
