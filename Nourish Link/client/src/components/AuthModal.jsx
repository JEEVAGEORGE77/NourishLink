import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import axios from "axios";

const AuthModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedRole, setSelectedRole] = useState("Donor");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [manualAddress, setManualAddress] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [homeLocation, setHomeLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("Not set");
  const [isLocating, setIsLocating] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);

  const GEOCODING_NODE_ENDPOINT = "/api/geocoding/reverse";
  const GEOCODING_FORWARD_ENDPOINT = "/api/geocoding/forward";
  const AUTOCOMPLETE_ENDPOINT = "/api/geocoding/autocomplete";

  const accentGold = "text-yellow-600";
  const primaryGreenText = "text-green-700";

  useEffect(() => {
    setError("");
    setPassword("");
    setConfirmPassword("");
    setHomeLocation(null);
    setLocationStatus("Not set");
    setManualAddress("");
    setSuggestions([]);
  }, [isLogin]);

  // Handle address input change for autocomplete
  const handleAddressChange = async (e) => {
    const value = e.target.value;
    setManualAddress(value);
    setSuggestions([]);
    setSelectedPlaceId(null);

    if (value.length < 3) return;

    try {
      const response = await axios.post(AUTOCOMPLETE_ENDPOINT, {
        input: value,
      });
      setSuggestions(response.data.predictions || []);
    } catch (e) {
      console.error("Autocomplete failed:", e);
      setSuggestions([]);
    }
  };

  // Select suggestion from autocomplete
  const selectSuggestion = (suggestion) => {
    setManualAddress(suggestion.description);
    setSelectedPlaceId(suggestion.place_id);
    setSuggestions([]);
  };

  // Get current location handler
  const handleGetLocation = async () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setHomeLocation(null);
    setLocationStatus("Capturing current GPS...");
    setError("");
    setSuggestions([]);

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      const geoResponse = await axios.post(GEOCODING_NODE_ENDPOINT, {
        lat,
        lng,
      });
      const displayAddress = geoResponse.data.address;

      setHomeLocation({ coordinates: [lng, lat], address: displayAddress });
      setLocationStatus(`Captured: ${displayAddress.substring(0, 30)}...`);
      setManualAddress(displayAddress);
    } catch (e) {
      const errorMessage = e.message || "Could not get GPS location.";
      setError(`Location Error: ${errorMessage}`);
      setLocationStatus("Failed to set");
      setHomeLocation(null);
    } finally {
      setIsLocating(false);
    }
  };

  // Set manual address location
  const handleSetManualLocation = async () => {
    if (!manualAddress) {
      setError("Please enter an address to set manually.");
      return;
    }

    setIsLocating(true);
    setHomeLocation(null);
    setLocationStatus("Geocoding address...");
    setError("");
    setSuggestions([]);

    try {
      const payload = selectedPlaceId
        ? { placeId: selectedPlaceId }
        : { address: manualAddress };
      const geoResponse = await axios.post(GEOCODING_FORWARD_ENDPOINT, payload);
      const { lat, lng } = geoResponse.data.coordinates;

      setHomeLocation({
        coordinates: [lng, lat],
        address: geoResponse.data.formattedAddress || manualAddress,
      });
      setLocationStatus(`Manual: ${manualAddress.substring(0, 30)}...`);
    } catch (e) {
      const errorMessage =
        e.response?.data?.message ||
        e.message ||
        "Could not find address coordinates.";
      setError(`Geocoding Error: ${errorMessage}`);
      setLocationStatus("Failed to set");
      setHomeLocation(null);
    } finally {
      setIsLocating(false);
    }
  };

  // Validate form inputs
  const validateForm = () => {
    if (!email || !password) {
      setError("Email and Password are required.");
      return false;
    }
    if (!isLogin) {
      if (!name || password.length < 7) {
        setError(
          "Name is required, and password must be at least 7 characters."
        );
        return false;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return false;
      }
      if (selectedRole === "Volunteer" && (!phone || !homeLocation)) {
        setError("Volunteers must provide a phone number and home location.");
        return false;
      }
    }
    setError("");
    return true;
  };

  if (!isOpen) return null;

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setName("");
    setPhone("");
    setSelectedRole("Donor");
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      if (isLogin) {
        await authService.signIn({ email, password });
      } else {
        const volunteerDetails =
          selectedRole === "Volunteer" ? { phone, homeLocation } : {};

        await authService.signUp({
          email,
          password,
          name,
          role: selectedRole,
          ...volunteerDetails,
        });
      }
      resetForm();
      onClose();
      navigate("/home");
    } catch (err) {
      setError(err.message || "Authentication failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const InputBaseClass =
    "w-full p-3 border border-gray-300 rounded-lg text-base";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          onClose();
        }}
      />

      <div className="relative w-full max-w-md mx-4 bg-white rounded-xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex-shrink-0">
          {" "}
          <div className="flex items-center justify-between">
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

            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-800"
              aria-label="Close auth modal"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-3">
            <div className="space-y-4">
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

            {!isLogin && selectedRole === "Volunteer" && (
              <div className="space-y-4 mt-4 p-4 border border-green-200 rounded-lg bg-green-50">
                <h4 className="text-md font-bold text-green-700 border-b border-green-700/50 pb-2">
                  Volunteer Details
                </h4>

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

                <div className="relative space-y-2">
                  <input
                    type="text"
                    placeholder="Enter Address Manually"
                    value={manualAddress}
                    onChange={handleAddressChange}
                    className={InputBaseClass}
                  />
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

            {error && (
              <div className="text-red-600 text-center mt-4 text-sm">
                {error}
              </div>
            )}

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

export default AuthModal;
