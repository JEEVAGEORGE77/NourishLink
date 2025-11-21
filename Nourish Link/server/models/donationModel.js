const mongoose = require("mongoose");
const { Schema } = mongoose;

// Define possible donation statuses
const DonationStatus = [
  "pendingAssignment",
  "assignedForCollection",
  "enRouteForCollection",
  "collected",
  "assignedForDistribution",
  "enRouteForDistribution",
  "delivered",
  "issueReported",
];

// Define the Donation schema
const donationSchema = new Schema({
  donationId: { type: String, required: true, unique: true },
  donorId: { type: String, required: true },
  donorName: { type: String, required: true },

  itemType: { type: String, required: true },
  quantity: { type: String, required: true },
  notes: { type: String },

  status: {
    type: String,
    required: true,
    enum: DonationStatus,
    default: "pendingAssignment",
  },

  collectionVolunteerId: { type: String, index: true },
  distributionVolunteerId: { type: String },

  collectedByVolunteerId: { type: String },

  pickupLocation: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true },
  },
  pickupAddress: { type: String, required: true },

  availabilityTime: { type: Date, required: true },
  postedAt: { type: Date, default: Date.now },
  collectedAt: { type: Date },
  deliveredAt: { type: Date },
});

donationSchema.index({ pickupLocation: "2dsphere" });

module.exports = mongoose.model("Donation", donationSchema);
