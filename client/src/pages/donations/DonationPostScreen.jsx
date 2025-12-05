import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { donationService } from "../../services/donationService";

const DonationPostScreen = () => {
  const navigate = useNavigate();

  // Form fields for the donation
  const [itemType, setItemType] = useState("Prepared Food");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  // Location-related state: coordinates + human-readable address
  const [pickupLocation, setPickupLocation] = useState(null);
  const [pickupAddress, setPickupAddress] = useState("");

  // UI state flags
  const [isLocating, setIsLocating] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState("");

  // Predefined categories a donor can choose from
  const itemTypes = [
    "Prepared Food",
    "Non-Perishables",
    "Produce",
    "Money/Gift Card",
    "Other Item",
  ];

  // Backend endpoint that converts GPS coordinates → address string
  const GEOCODING_NODE_ENDPOINT = "/api/geocoding/reverse";

  // Simple helper for showing messages / errors.
  // For now, this uses console + alert (no visual snackbar component).
  const showSnackbar = (message, isError = false) => {
    setError(isError ? message : "");
    if (!isError) console.log(message);
    if (isError) alert(`Error: ${message}`);
  };

  // On mount: try to auto-capture current location so donor doesn’t have to click
  useEffect(() => {
    handleGetLocation();
  }, []);

  /**
   * Get current location (GPS) from the browser,
   * then ask the backend to convert lat/lng into a human-readable address.
   */
  const handleGetLocation = async () => {
    if (!navigator.geolocation) {
      showSnackbar("Geolocation is not supported by your browser.", true);
      return;
    }

    setIsLocating(true);
    setPickupLocation(null);
    setPickupAddress("Fetching location...");
    setError("");

    try {
      // Wrap geolocation callback API in a Promise so we can await it
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      console.log("DEBUG: Sending Coords:", { lat, lng });

      // Send coordinates to backend, which calls a geocoding service
      const geoResponse = await axios.post(GEOCODING_NODE_ENDPOINT, {
        lat,
        lng,
      });
      const displayAddress = geoResponse.data.address;

      // Save coordinates + display address in state
      setPickupLocation({ lat, lng });
      setPickupAddress(displayAddress);
      showSnackbar("Location captured successfully!");
    } catch (e) {
      // If GPS or geocoding fails, ask user to handle manually
      const errorMessage =
        e.message || "Could not get location. Enter address manually.";
      showSnackbar(`Location Error: ${errorMessage}`, true);
      setPickupAddress("Location not set.");
    } finally {
      setIsLocating(false);
    }
  };

  /**
   * Submit handler for the donation form.
   * Validates required fields, builds a payload, and sends it to the backend
   * using donationService.postNewDonation().
   */
  const handlePostDonation = async (e) => {
    e.preventDefault();

    // Basic validation: all these fields are required
    if (
      !quantity ||
      !selectedDate ||
      !selectedTime ||
      !pickupLocation ||
      !pickupAddress
    ) {
      showSnackbar(
        "Please fill all required fields and capture a valid location.",
        true
      );
      return;
    }

    setIsPosting(true);
    setError("");

    try {
      // Combine date + time into one Date object for availability window
      const availabilityDateTime = new Date(`${selectedDate}T${selectedTime}`);

      // Build the payload expected by the backend donation API
      const donationData = {
        itemType,
        quantity,
        notes: notes || null,
        pickupAddress,
        availabilityTime: availabilityDateTime.toISOString(),
        pickupLocation: {
          // Store coordinates as [lng, lat] to follow GeoJSON convention
          coordinates: [pickupLocation.lng, pickupLocation.lat],
        },
      };

      // POST to /api/donations/post via donationService
      await donationService.postNewDonation(donationData);

      showSnackbar("Donation Posted! Awaiting Volunteer Assignment.");
      // Redirect donor back to their dashboard after successful post
      navigate("/donor-dashboard");
    } catch (e) {
      showSnackbar(`Failed to post donation: ${e.message}`, true);
    } finally {
      setIsPosting(false);
    }
  };

  // Convenience boolean so we can disable submit button when date/time missing
  const isDateTimeSelected = selectedDate && selectedTime;

  const accentGold = "text-yellow-600";

  // Shared Tailwind classes for consistent input styling
  const inputStyleClass =
    "w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-green-700 focus:border-green-700";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar with back arrow and title */}
      <header className="bg-green-700 text-white p-4 flex items-center shadow-lg">
        <button
          onClick={() => navigate(-1)}
          className="text-white mr-4 text-2xl"
        >
          &larr;
        </button>
        <h1 className="text-xl font-bold">Post New Donation</h1>
      </header>

      <div className="p-5">
        {/* Main donation form */}
        <form onSubmit={handlePostDonation}>
          {/* ---------------- Donation Details ---------------- */}
          <h3 className="text-xl font-bold text-green-700 mt-4">
            Donation Details
          </h3>
          <hr className="border-green-700 mb-5" />

          {/* Item type dropdown */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1">
              Item Type
            </label>
            <select
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
              className={inputStyleClass}
            >
              {itemTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity input */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1">
              Quantity (e.g., 50 lbs, 3 boxes)
            </label>
            <input
              type="text"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={inputStyleClass}
              placeholder="Enter quantity"
              required
            />
          </div>

          {/* Optional notes for special instructions */}
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-1">
              Special Notes / Instructions (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows="3"
              className={inputStyleClass + " resize-none"}
              placeholder="Any special pickup instructions or details"
            />
          </div>

          {/* ---------------- Pickup Details ---------------- */}
          <h3 className="text-xl font-bold text-green-700">Pickup Details</h3>
          <hr className="border-green-700 mb-5" />

          {/* Availability date + time fields */}
          <div className="mb-4 flex gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={inputStyleClass}
              required
            />
            <input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className={inputStyleClass}
              required
            />
          </div>
          {!isDateTimeSelected && (
            <p className="text-red-600 text-xs mb-4">
              Please select a date and time.
            </p>
          )}

          {/* Button to capture GPS location using browser geolocation */}
          <button
            type="button"
            onClick={handleGetLocation}
            disabled={isLocating}
            className={`w-full py-3 text-lg font-semibold rounded-lg transition duration-150 ease-in-out flex items-center justify-center space-x-2 ${
              isLocating
                ? "bg-gray-300 text-gray-700 cursor-not-allowed"
                : "bg-yellow-100 text-green-700 border border-green-700/50 hover:bg-yellow-200"
            }`}
          >
            {isLocating ? (
              "Capturing Location..."
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-6 w-6 ${accentGold}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Capture Current Location (GPS)</span>
              </>
            )}
          </button>

          {/* Display of current pickup address */}
          <p className="mt-3 text-sm font-bold text-gray-600">
            Pickup Address:
          </p>
          <p
            className={`text-base font-medium ${
              pickupLocation ? "text-green-700" : "text-red-600"
            } mb-8`}
          >
            {pickupAddress || "Location not set."}
          </p>

          {/* Any error text from posting or locating */}
          {error && <p className="text-red-600 text-center mb-4">{error}</p>}

          {/* Submit button for posting donation */}
          <button
            type="submit"
            disabled={isPosting || !isDateTimeSelected || !pickupLocation}
            className={`w-full py-4 text-xl font-bold rounded-xl shadow-xl transition duration-150 ease-in-out ${
              isPosting || !isDateTimeSelected || !pickupLocation
                ? "bg-green-700/70 cursor-not-allowed text-white"
                : "bg-green-700 text-white hover:bg-green-800 shadow-green-700/50"
            }`}
          >
            {isPosting ? "Posting..." : "Post Donation"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default DonationPostScreen;
