const mongoose = require("mongoose");
const { Schema } = mongoose;

// Schema to store performance metrics for each user.
// Supports two user types: Volunteer and Donor.
const MetricsSchema = new Schema({
  // Unique ID for metrics entry (separate from MongoDB _id)
  metricsId: { type: String, required: true, unique: true },

  // Firebase user ID
  userId: { type: String, required: true },

  // Specifies whose metrics these belong to (Volunteer or Donor)
  userType: { type: String, enum: ["Volunteer", "Donor"], required: true },

  // Total tasks successfully completed
  tasksCompleted: { type: Number, default: 0 },

  // How many tasks have been assigned to the user
  tasksAssigned: { type: Number, default: 0 },

  // For volunteers: count of donations collected
  donationsCollected: { type: Number, default: 0 },

  // For volunteers: count of donations delivered
  donationsDelivered: { type: Number, default: 0 },

  // For donors: total number of donations they have posted
  totalDonationsPosted: { type: Number, default: 0 },

  // Total food items collected (used for analytics)
  foodItemsCollected: { type: Number, default: 0 },

  // Average rating given to this user (5.0 = default perfect rating)
  rating: { type: Number, default: 5.0 },

  // How many reviews contributed to the rating
  reviewCount: { type: Number, default: 0 },

  // Record creation timestamp
  createdAt: { type: Date, default: Date.now },

  // Last updated timestamp
  updatedAt: { type: Date, default: Date.now },
});

// Index for fast querying by user and type
MetricsSchema.index({ userId: 1, userType: 1 });

// Create model to interact with metrics collection
const Metrics = mongoose.model("Metrics", MetricsSchema);

// Create a new metrics record
const createMetrics = async (metricsData) => {
  const newMetrics = new Metrics(metricsData);
  return await newMetrics.save();
};

// Get metrics using custom metricsId
const getMetricsById = async (metricsId) => {
  return await Metrics.findOne({ metricsId });
};

// Get metrics using Firebase userId
const getMetricsByUserId = async (userId) => {
  return await Metrics.findOne({ userId });
};

// Update metrics and refresh updatedAt timestamp
const updateMetrics = async (userId, updateData) => {
  return await Metrics.findOneAndUpdate(
    { userId },
    { ...updateData, updatedAt: Date.now() },
    { new: true }
  );
};

// Get top-performing volunteers based on rating and completed tasks
const getTopVolunteersByMetrics = async (limit = 10) => {
  return await Metrics.find({ userType: "Volunteer" })
    .sort({ rating: -1, tasksCompleted: -1 })
    .limit(limit);
};

module.exports = {
  Metrics,
  createMetrics,
  getMetricsById,
  getMetricsByUserId,
  updateMetrics,
  getTopVolunteersByMetrics,
};
