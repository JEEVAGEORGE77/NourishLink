// Import React and React hooks for managing component state and lifecycle
import React, { useState, useEffect } from "react";
// Import navigation hook to redirect user after login/signup
import { useNavigate } from "react-router-dom";
// Import custom auth service that handles sign in / sign up requests
import { authService } from "../services/authService";
// Import axios for making HTTP requests to geocoding endpoints
import axios from "axios";

// AuthModal is a reusable popup component for login and signup.
// It receives two props:
// - isOpen: controls whether the modal is visible
// - onClose: function to close the modal
const AuthModal = ({ isOpen, onClose }) => {
  // Hook used to navigate to different routes in the app
  const navigate = useNavigate();

  // Whether the modal is in "Login" mode (true) or "Sign Up" mode (false)
  const [isLogin, setIsLogin] = useState(true);

  // Email input field value
  const [email, setEmail] = useState("");
  // Password input field value
  const [password, setPassword] = useState("");
  // Confirm password field, only used in Sign Up mode
  const [confirmPassword, setConfirmPassword] = useState("");
  // Name / organization name field
  const [name, setName] = useState("");
  // Phone number field (needed for volunteers)
  const [phone, setPhone] = useState("");
  // Selected role for signup: "Donor" or "Volunteer"
  const [selectedRole, setSelectedRole] = useState("Donor");
  // Error message to show in the UI when something goes wrong
  const [error, setError] = useState("");
  // Loading state to disable buttons and show "Loading..." text during requests
  const [isLoading, setIsLoading] = useState(false);

  // Address entered manually by the user
  const [manualAddress, setManualAddress] = useState("");
  // Autocomplete suggestions returned by the geocoding API
  const [suggestions, setSuggestions] = useState([]);
  // Home location object: contains coordinates and address string
  const [homeLocation, setHomeLocation] = useState(null);
  // Text describing the current status of the location (e.g., "Not set", "Captured")
  const [locationStatus, setLocationStatus] = useState("Not set");
  // Whether the app is currently resolving location (GPS or geocoding)
  const [isLocating, setIsLocating] = useState(false);
  // The place_id selected from autocomplete (if user picks a suggestion)
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);

  // Backend endpoints for different geocoding operations
  const GEOCODING_NODE_ENDPOINT = "/api/geocoding/reverse";
  const GEOCODING_FORWARD_ENDPOINT = "/api/geocoding/forward";
  const AUTOCOMPLETE_ENDPOINT = "/api/geocoding/autocomplete";

  // Tailwind utility class for accent text color
  const accentGold = "text-yellow-600";
  // Tailwind utility class for primary green text
  const primaryGreenText = "text-green-700";

  // Whenever the mode switches between Login and Sign Up,
  // reset all error and location-related fields so the form is clean.
  useEffect(() => {
    setError("");
    setPassword("");
    setConfirmPassword("");
    setHomeLocation(null);
    setLocationStatus("Not set");
    setManualAddress("");
    setSuggestions([]);
  }, [isLogin]);

  // Handle changes in the manual address input.
  // This triggers autocomplete after the user types at least 3 characters.
  const handleAddressChange = async (e) => {
    const value = e.target.value;
    setManualAddress(value);
    setSuggestions([]);
    setSelectedPlaceId(null);

    // Don't call autocomplete API if the user typed less than 3 characters
    if (value.length < 3) return;

    try {
      // Send entered text to autocomplete endpoint
      const response = await axios.post(AUTOCOMPLETE_ENDPOINT, {
        input: value,
      });
      // Use predictions from the backend response, or empty list if missing
      setSuggestions(response.data.predictions || []);
    } catch (e) {
      console.error("Autocomplete failed:", e);
      // If something fails, clear the suggestions list
      setSuggestions([]);
    }
  };

  // Called when user clicks one of the autocomplete suggestions
  const selectSuggestion = (suggestion) => {
    // Update address input to show the selected suggestion text
    setManualAddress(suggestion.description);
    // Store Google place_id (used for precise forward geocoding)
    setSelectedPlaceId(suggestion.place_id);
    // Hide the suggestion dropdown
    setSuggestions([]);
  };

  // Use device GPS to capture current location and reverse geocode to an address
  const handleGetLocation = async () => {
    // If browser does not support geolocation, show error
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    // Show locating state and reset old location-related values
    setIsLocating(true);
    setHomeLocation(null);
    setLocationStatus("Capturing current GPS...");
    setError("");
    setSuggestions([]);

    try {
      // Wrap geolocation API in a Promise for easier async/await usage
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      // Extract latitude and longitude from the GPS result
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      // Send coordinates to backend to reverse geocode into a human-readable address
      const geoResponse = await axios.post(GEOCODING_NODE_ENDPOINT, {
        lat,
        lng,
      });
      const displayAddress = geoResponse.data.address;

      // Save full location object with coordinates and address
      setHomeLocation({ coordinates: [lng, lat], address: displayAddress });
      // Show a short preview of the address in the status
      setLocationStatus(`Captured: ${displayAddress.substring(0, 30)}...`);
      // Also fill the manual address field with the detected address
      setManualAddress(displayAddress);
    } catch (e) {
      // If GPS or geocoding fails, show a friendly error message
      const errorMessage = e.message || "Could not get GPS location.";
      setError(`Location Error: ${errorMessage}`);
      setLocationStatus("Failed to set");
      setHomeLocation(null);
    } finally {
      // Stop the loading state for location capturing
      setIsLocating(false);
    }
  };

  // Use manually entered address (or selected prediction) to get coordinates
  const handleSetManualLocation = async () => {
    // Require an address to proceed
    if (!manualAddress) {
      setError("Please enter an address to set manually.");
      return;
    }

    // Show loading state while geocoding the address
    setIsLocating(true);
    setHomeLocation(null);
    setLocationStatus("Geocoding address...");
    setError("");
    setSuggestions([]);

    try {
      // If the user selected a prediction, send placeId, otherwise send raw address text
      const payload = selectedPlaceId
        ? { placeId: selectedPlaceId }
        : { address: manualAddress };

      // Call backend to convert address/placeId into coordinates
      const geoResponse = await axios.post(GEOCODING_FORWARD_ENDPOINT, payload);
      const { lat, lng } = geoResponse.data.coordinates;

      // Save coordinates and formatted address if provided
      setHomeLocation({
        coordinates: [lng, lat],
        address: geoResponse.data.formattedAddress || manualAddress,
      });
      // Update status text with a short preview of the address
      setLocationStatus(`Manual: ${manualAddress.substring(0, 30)}...`);
    } catch (e) {
      // Try to show a more specific error coming from the backend if available
      const errorMessage =
        e.response?.data?.message ||
        e.message ||
        "Could not find address coordinates.";
      setError(`Geocoding Error: ${errorMessage}`);
      setLocationStatus("Failed to set");
      setHomeLocation(null);
    } finally {
      // Stop locating state once geocoding is done
      setIsLocating(false);
    }
  };

  // Validate all form fields before sending login or signup request
  const validateForm = () => {
    // Email and password are always required
    if (!email || !password) {
      setError("Email and Password are required.");
      return false;
    }

    // Extra validations for Sign Up mode
    if (!isLogin) {
      // Require name and enforce minimum password length
      if (!name || password.length < 7) {
        setError(
          "Name is required, and password must be at least 7 characters."
        );
        return false;
      }
      // Confirm password must match original password
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return false;
      }
      // If role is Volunteer, require phone and a home location
      if (selectedRole === "Volunteer" && (!phone || !homeLocation)) {
        setError("Volunteers must provide a phone number and home location.");
        return false;
      }
    }

    // Clear previous errors if everything is valid
    setError("");
    return true;
  };

  // If the modal is not open, render nothing at all
  if (!isOpen) return null;

  // Reset core form fields and role when closing or after successful submit
  const resetForm = () => {
    setEmail("");
    setPassword("");
    setName("");
    setPhone("");
    setSelectedRole("Donor");
    setError("");
  };

  // Handle form submission for both Login and Sign Up modes
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent page refresh on form submit
    setError("");

    // Stop right away if validation fails
    if (!validateForm()) return;

    // Set loading state to disable button and show loading text
    setIsLoading(true);
    try {
      if (isLogin) {
        // Login flow: call authService.signIn with email and password
        await authService.signIn({ email, password });
      } else {
        // For Volunteer role, prepare extra fields (phone and home location)
        const volunteerDetails =
          selectedRole === "Volunteer" ? { phone, homeLocation } : {};

        // Sign up flow: call authService.signUp with full user details
        await authService.signUp({
          email,
          password,
          name,
          role: selectedRole,
          ...volunteerDetails,
        });
      }

      // After success, clear the form, close modal, and navigate to home route
      resetForm();
      onClose();
      navigate("/home");
    } catch (err) {
      // Show error message if auth fails, fallback to generic message
      setError(err.message || "Authentication failed.");
    } finally {
      // Always stop loading state after request finishes
      setIsLoading(false);
    }
  };

  // Base Tailwind class string for input fields to keep styling consistent
  const InputBaseClass =
    "w-full p-3 border border-gray-300 rounded-lg text-base";

  // Actual JSX returned by this component (the modal itself)
  return (
    // Full-screen fixed overlay to center the modal
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Semi-transparent dark background that closes modal on click */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          onClose();
        }}
      />

      {/* Main modal container with white background and rounded corners */}
      <div className="relative w-full max-w-md mx-4 bg-white rounded-xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header area with Login/Sign Up tabs and close button */}
        <div className="p-4 border-b flex-shrink-0">
          {" "}
          <div className="flex items-center justify-between">
            {/* Tab switches for Login and Sign Up */}
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`py-2 px-3 text-sm font-semibold ${
                  isLogin
                    ? "text-green-700 border-b-2 border-green-700"
                    : "text-gray-500"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className={`py-2 px-3 text-sm font-semibold ${
                  !isLogin
                    ? "text-green-700 border-b-2 border-green-700"
                    : "text-gray-500"
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Close (X) button on the top right of the modal */}
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-800"
              aria-label="Close auth modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable body section so form is usable even on smaller screens */}
        <div className="flex-grow overflow-y-auto">
          {/* Main form for login/sign up */}
          <form onSubmit={handleSubmit} className="p-6 space-y-3">
            <div className="space-y-4">
              {/* Name / Organization field shown only in Sign Up mode */}
              {!isLogin && (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Organization / Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={InputBaseClass}
                    required={!isLogin}
                  />
                </div>
              )}

              {/* Email input */}
              <div className="relative">
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={InputBaseClass}
                  required
                />
              </div>

              {/* Password input */}
              <div className="relative">
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={InputBaseClass}
                  required
                />
              </div>

              {/* Confirm password field shown only in Sign Up mode */}
              {!isLogin && (
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                    className={InputBaseClass}
                    required={!isLogin}
                  />
                </div>
              )}
            </div>

            {/* Role selection dropdown visible only in Sign Up mode */}
            {!isLogin && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  I am registering as:
                </label>
                <div className="relative p-1 rounded-lg border-2 border-green-700 bg-white shadow-sm">
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full py-2 px-2 text-base text-green-700 appearance-none bg-transparent focus:outline-none"
                  >
                    <option value="Donor">Donor</option>
                    <option value="Volunteer">Volunteer</option>
                  </select>
                </div>
              </div>
            )}

            {/* Extra fields and location section for Volunteer signups */}
            {!isLogin && selectedRole === "Volunteer" && (
              <div className="space-y-4 mt-4 p-4 border border-green-200 rounded-lg bg-green-50">
                <h4 className="text-md font-bold text-green-700 border-b border-green-700/50 pb-2">
                  Volunteer Details
                </h4>

                {/* Phone number input */}
                <div className="relative">
                  <input
                    type="tel"
                    placeholder="Phone Number (e.g., 555-123-4567)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={InputBaseClass}
                    required
                  />
                </div>

                {/* Manual address + autocomplete + GPS buttons */}
                <div className="relative space-y-2">
                  <input
                    type="text"
                    placeholder="Enter Address Manually"
                    value={manualAddress}
                    onChange={handleAddressChange}
                    className={InputBaseClass}
                  />

                  {/* Autocomplete dropdown list of suggestions */}
                  {suggestions.length > 0 && (
                    <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {suggestions.map((suggestion) => (
                        <li
                          key={suggestion.place_id}
                          className="p-3 cursor-pointer hover:bg-green-100 text-gray-800"
                          onClick={() => selectSuggestion(suggestion)}
                        >
                          {suggestion.description}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Buttons to confirm manual address or use GPS */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSetManualLocation}
                      disabled={isLocating || !manualAddress}
                      className={`flex-1 py-3 text-sm font-semibold rounded-lg transition duration-150 ease-in-out ${
                        isLocating
                          ? "bg-gray-300 text-gray-700 cursor-not-allowed"
                          : "bg-green-700 text-white hover:bg-green-800 shadow-md"
                      }`}
                    >
                      <span className="flex items-center justify-center space-x-1">
                        Confirm Address
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      disabled={isLocating}
                      className={`flex-1 py-3 text-sm font-semibold rounded-lg transition duration-150 ease-in-out ${
                        isLocating
                          ? "bg-gray-300 text-gray-700 cursor-not-allowed"
                          : "bg-yellow-600 text-white hover:bg-yellow-700 shadow-md"
                      }`}
                    >
                      <span className="flex items-center justify-center space-x-1">
                        Capture GPS
                      </span>
                    </button>
                  </div>

                  {/* Status message showing whether the location has been set */}
                  <p
                    className={`mt-2 text-sm text-center ${
                      homeLocation ? "text-green-700" : "text-red-500"
                    }`}
                  >
                    Location Status: {locationStatus}
                  </p>
                </div>
              </div>
            )}

            {/* Error message shown if validation or auth fails */}
            {error && (
              <div className="text-red-600 text-center mt-4 text-sm">
                {error}
              </div>
            )}

            {/* Submit button for Login or Sign Up */}
            <div className="p-6 pt-0">
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 mt-6 text-white text-xl font-bold rounded-xl shadow-lg transition duration-150 ease-in-out ${
                  isLoading
                    ? "bg-green-700/70 cursor-not-allowed"
                    : "bg-green-700 hover:bg-green-800 shadow-green-700/50"
                }`}
              >
                {isLoading ? "Loading..." : isLogin ? "LOGIN" : "SIGN UP"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Export the AuthModal so it can be used inside other components like HomeScreen
export default AuthModal;
