const mongoose = require("mongoose");
const { Schema } = mongoose;

// Schema for storing donor-specific information.
// Each donor is linked to a user account and may also belong to an organization.
const DonorSchema = new Schema({
  // Firebase user ID of the donor (unique identifier)
  userId: { type: String, required: true, unique: true },

  // Optional: Reference to an organization the donor belongs to
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization" },

  // Human-readable organization name (stored for quick UI display)
  organizationName: { type: String },

  // Donor status; ENUM ensures only "active" or "inactive" is allowed
  status: { type: String, default: "active", enum: ["active", "inactive"] },

  // Count of how many donations this donor has posted
  donationsPosted: { type: Number, default: 0 },

  // Timestamp when donor entry was created
  createdAt: { type: Date, default: Date.now },

  // Timestamp for last update
  updatedAt: { type: Date, default: Date.now },
});

// Create a Mongoose model for performing database operations
const Donor = mongoose.model("Donor", DonorSchema);

// Create a new donor entry
const createDonor = async (donorData) => {
  const newDonor = new Donor(donorData);
  return await newDonor.save();
};

// Get a donor using the Firebase userId
// `.populate("organizationId")` fetches full organization details
const getDonorByUserId = async (userId) => {
  return await Donor.findOne({ userId }).populate("organizationId");
};

// Fetch all donors with active status
const getActiveDonors = async () => {
  return await Donor.find({ status: "active" }).populate("organizationId");
};

// Update donor details and refresh the 'updatedAt' timestamp
const updateDonor = async (userId, updateData) => {
  return await Donor.findOneAndUpdate(
    { userId },
    { ...updateData, updatedAt: Date.now() },
    { new: true } // return updated object instead of old one
  );
};

module.exports = {
  Donor,
  createDonor,
  getDonorByUserId,
  getActiveDonors,
  updateDonor,
};
