// Import Express and create a router instance for geocoding-related routes
const express = require("express");
const router = express.Router();

// Import axios to make HTTP requests to the external Google APIs
const axios = require("axios");

// Read Google Geocoding / Places API key from environment variables
const GOOGLE_API_KEY = process.env.GEOCODING_API_KEY;

/**
 * POST /api/geocoding/reverse
 * Reverse geocoding: converts latitude/longitude (GPS coordinates) into a
 * human-readable address using the Google Geocoding API.
 */
router.post("/reverse", async (req, res) => {
  const { lat, lng } = req.body;

  // Validate that both latitude and longitude are provided in the request body
  if (!lat || !lng) {
    return res
      .status(400)
      .send({ message: "Latitude and longitude are required." });
  }

  try {
    // Build the Google Geocoding API URL using lat/lng and the API key
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`;
    const response = await axios.get(url);

    // Take the first result from the API response (most relevant address)
    const result = response.data.results[0];
    if (result) {
      const displayAddress = result.formatted_address;
      // Return the formatted address back to the client
      return res.status(200).send({ address: displayAddress });
    } else {
      // No address found for these coordinates
      return res
        .status(404)
        .send({ message: "No address found for these coordinates." });
    }
  } catch (error) {
    // If the Google API fails or network error occurs
    return res.status(500).send({ message: "External API service failed." });
  }
});

/**
 * POST /api/geocoding/forward
 * Forward geocoding: converts a text address OR a Google Place ID into
 * latitude/longitude coordinates using the Google Geocoding API.
 */
router.post("/forward", async (req, res) => {
  const { address, placeId } = req.body;

  // Require at least one of: address string or placeId
  if (!address && !placeId) {
    return res.status(400).send({
      message: "Address string or Place ID is required for forward geocoding.",
    });
  }

  try {
    let url;

    // If a Place ID is provided, use it directly in the Geocoding request
    if (placeId) {
      url = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${placeId}&key=${GOOGLE_API_KEY}`;
    } else {
      // Otherwise, encode the address string for use in a URL
      const encodedAddress = encodeURIComponent(address);
      url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_API_KEY}`;
    }

    const response = await axios.get(url);
    const result = response.data.results[0];

    if (result) {
      // Extract latitude and longitude from the response
      const { lat, lng } = result.geometry.location;

      return res.status(200).send({
        coordinates: { lat, lng },
        formattedAddress: result.formatted_address,
      });
    } else {
      // No coordinates found for this address/Place ID
      return res.status(404).send({
        message: "Could not find coordinates for the provided address.",
      });
    }
  } catch (error) {
    // If the Google API fails or network error occurs
    return res.status(500).send({ message: "External API service failed." });
  }
});

/**
 * POST /api/geocoding/autocomplete
 * Address autocomplete: sends the user’s partial input to the Google Places
 * Autocomplete API and returns a list of suggestions/predictions.
 */
router.post("/autocomplete", async (req, res) => {
  const { input } = req.body;

  // Validate that input text is provided (partial address or search term)
  if (!input) {
    return res
      .status(400)
      .send({ message: "Input string is required for autocomplete." });
  }

  try {
    // Call Google Places Autocomplete API with encoded user input
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      input
    )}&key=${GOOGLE_API_KEY}`;

    const response = await axios.get(url);

    // API can return "OK" (predictions found) or "ZERO_RESULTS" (no matches)
    if (
      response.data.status === "OK" ||
      response.data.status === "ZERO_RESULTS"
    ) {
      return res.status(200).send({ predictions: response.data.predictions });
    } else {
      // Some other Places API error status (e.g., OVER_QUERY_LIMIT, REQUEST_DENIED)
      return res
        .status(500)
        .send({ message: `Places API Error: ${response.data.status}` });
    }
  } catch (error) {
    // If the Google API fails or network error occurs
    return res
      .status(500)
      .send({ message: "External Autocomplete API service failed." });
  }
});

// Export the router so it can be mounted under /api/geocoding in the main server
module.exports = router;
