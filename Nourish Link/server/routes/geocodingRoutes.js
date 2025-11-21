const express = require("express");
const router = express.Router();
const axios = require("axios");

const GOOGLE_API_KEY = process.env.GEOCODING_API_KEY;

// Reverse geocoding: coordinates to address
router.post("/reverse", async (req, res) => {
  const { lat, lng } = req.body;

  if (!lat || !lng) {
    return res
      .status(400)
      .send({ message: "Latitude and longitude are required." });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`;
    const response = await axios.get(url);

    const result = response.data.results[0];
    if (result) {
      const displayAddress = result.formatted_address;
      return res.status(200).send({ address: displayAddress });
    } else {
      return res
        .status(404)
        .send({ message: "No address found for these coordinates." });
    }
  } catch (error) {
    return res.status(500).send({ message: "External API service failed." });
  }
});

// Forward geocoding: address to coordinates
router.post("/forward", async (req, res) => {
  const { address, placeId } = req.body;

  if (!address && !placeId) {
    return res.status(400).send({
      message: "Address string or Place ID is required for forward geocoding.",
    });
  }

  try {
    let url;
    if (placeId) {
      url = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${placeId}&key=${GOOGLE_API_KEY}`;
    } else {
      const encodedAddress = encodeURIComponent(address);
      url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_API_KEY}`;
    }

    const response = await axios.get(url);
    const result = response.data.results[0];

    if (result) {
      const { lat, lng } = result.geometry.location;

      return res.status(200).send({
        coordinates: { lat, lng },
        formattedAddress: result.formatted_address,
      });
    } else {
      return res.status(404).send({
        message: "Could not find coordinates for the provided address.",
      });
    }
  } catch (error) {
    return res.status(500).send({ message: "External API service failed." });
  }
});

// Address autocomplete
router.post("/autocomplete", async (req, res) => {
  const { input } = req.body;

  if (!input) {
    return res
      .status(400)
      .send({ message: "Input string is required for autocomplete." });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      input
    )}&key=${GOOGLE_API_KEY}`;

    const response = await axios.get(url);

    if (
      response.data.status === "OK" ||
      response.data.status === "ZERO_RESULTS"
    ) {
      return res.status(200).send({ predictions: response.data.predictions });
    } else {
      return res
        .status(500)
        .send({ message: `Places API Error: ${response.data.status}` });
    }
  } catch (error) {
    return res
      .status(500)
      .send({ message: "External Autocomplete API service failed." });
  }
});

module.exports = router;
