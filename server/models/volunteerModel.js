// Import mongoose library
const mongoose = require("mongoose");
// Extract Schema constructor from mongoose
const { Schema } = mongoose;

// Define the structure for a Volunteer document
const VolunteerSchema = new Schema({
  // Firebase UID of the volunteer (must be unique)
  userId: { type: String, required: true, unique: true },

  // Contact number for the volunteer (used for assignments)
  phone: { type: String, required: true },

  // Geolocation data that stores volunteer's home address
  // This is used to calculate who is closest to a donation pickup
  homeLocation: {
    // GeoJSON type for location
    type: { type: String, enum: ["Point"], default: "Point" },

    // Coordinates stored as [longitude, latitude]
    coordinates: { type: [Number] },

    // Human-readable address
    address: { type: String },
  },

  // Tracks how many tasks the volunteer has successfully completed
  tasksCompleted: { type: Number, default: 0 },

  // User rating (tracked by admin or future feature)
  rating: { type: Number, default: 5.0 },

  // Active/inactive status (admin can deactivate volunteers)
  status: { type: String, default: "active", enum: ["active", "inactive"] },

  // Timestamp of when volunteer record was created
  createdAt: { type: Date, default: Date.now },

  // Timestamp that updates anytime the record is modified
  updatedAt: { type: Date, default: Date.now },
});

// Create a geospatial index so MongoDB can perform
// "find nearest volunteers" queries efficiently
VolunteerSchema.index({ homeLocation: "2dsphere" });

// Convert the schema into a Mongoose model
const Volunteer = mongoose.model("Volunteer", VolunteerSchema);

// Create a new volunteer record
const createVolunteer = async (volunteerData) => {
  const newVolunteer = new Volunteer(volunteerData);
  return await newVolunteer.save();
};

// Fetch a volunteer using the Firebase UID
const getVolunteerByUserId = async (userId) => {
  return await Volunteer.findOne({ userId });
};

// Get all active volunteers and return essential fields only
// (used when admin assigns tasks)
const getActiveVolunteers = async () => {
  return await Volunteer.find({ status: "active" }).select(
    "userId phone homeLocation rating tasksCompleted"
  );
};

// Update volunteer record by UID and automatically update timestamp
const updateVolunteer = async (userId, updateData) => {
  return await Volunteer.findOneAndUpdate(
    { userId },
    { ...updateData, updatedAt: Date.now() },
    { new: true } // return updated document
  );
};

// Export model and service functions
module.exports = {
  Volunteer,
  createVolunteer,
  getVolunteerByUserId,
  getActiveVolunteers,
  updateVolunteer,
};
