const mongoose = require("mongoose");
const { Schema } = mongoose;

// List of allowed donation statuses.
// ENUM ensures the 'status' field can only be one of these values.
const DonationStatus = [
  "pendingAssignment",
  "assignedForCollection",
  "collected",
  "assignedForDistribution",
  "delivered",
];

// Donation schema defines the structure of a donation document in MongoDB.
const donationSchema = new Schema({
  // Unique ID for each donation (not MongoDB ID, custom generated)
  donationId: { type: String, required: true, unique: true },

  // Donor information
  donorId: { type: String, required: true, index: true },
  donorName: { type: String, required: true },

  // Item details
  itemType: { type: String, required: true },
  quantity: { type: String, required: true },
  notes: { type: String },

  // Status must match one of the values from DonationStatus (ENUM validation)
  status: {
    type: String,
    required: true,
    enum: DonationStatus,
    default: "pendingAssignment",
  },

  // Pickup location stored as GeoJSON Point
  pickupLocation: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
  },

  pickupAddress: { type: String, required: true },

  // Dropoff location (filled after collection assignment)
  dropoffLocation: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number] },
  },

  dropoffAddress: { type: String },

  // Important timestamps
  availabilityTime: { type: Date, required: true },
  postedAt: { type: Date, default: Date.now },
  collectedAt: { type: Date },
  deliveredAt: { type: Date },

  // Volunteer details
  collectedByVolunteerId: { type: String },
  distributionVolunteerId: { type: String },
});

// Geospatial index needed for finding nearest volunteers
donationSchema.index({ pickupLocation: "2dsphere" });

// Index to optimize donor- and status-based queries
donationSchema.index({ donorId: 1, status: 1 });

// Creates a model for interacting with the donations collection
const Donation = mongoose.model("Donation", donationSchema);

// Creates a new donation in the database
const createDonation = async (donationData) => {
  const newDonation = new Donation(donationData);
  return await newDonation.save();
};

// Fetch donation by its donationId
const getDonationById = async (donationId) => {
  return await Donation.findOne({ donationId });
};

// Fetch all donations created by a specific donor
const getDonationsByDonorId = async (donorId) => {
  return await Donation.find({ donorId }).sort({ postedAt: -1 });
};

// Fetch donations by status (pending, collected, etc.)
const getDonationsByStatus = async (status) => {
  return await Donation.find({ status }).sort({ availabilityTime: 1 });
};

// Update a donation document by donationId
const updateDonation = async (donationId, updateData) => {
  return await Donation.findOneAndUpdate({ donationId }, updateData, {
    new: true, // return the updated document
  });
};

module.exports = {
  Donation,
  DonationStatus,
  createDonation,
  getDonationById,
  getDonationsByDonorId,
  getDonationsByStatus,
  updateDonation,
};
