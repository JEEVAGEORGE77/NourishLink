// Import the Mongoose library
const mongoose = require("mongoose");

// Extract the Schema class from mongoose (used to define MongoDB document structure)
const { Schema } = mongoose;

// List of allowed organization types
// This will be used as ENUM values in the schema
const OrganizationType = [
  "DonorBusiness",
  "DistributionCenter",
  "CommunityPartner",
];

// Define the structure of an Organization document in MongoDB
const OrganizationSchema = new Schema({
  // A unique string ID assigned to each organization
  organizationId: { type: String, required: true, unique: true, index: true },

  // Name of the organization (must be unique)
  name: { type: String, required: true, unique: true },

  // Full address of the organization
  address: { type: String, required: true },

  // [longitude, latitude] coordinates used for maps
  coordinates: { type: [Number], required: true },

  // Type of organization — allowed values are limited to OrganizationType array
  organizationType: {
    type: String,
    required: true,
    enum: OrganizationType, // ensures only valid organization types are stored
    default: "DistributionCenter",
  },

  // Optional: User ID of the manager responsible for this organization
  managerUserId: { type: String, default: null },
});

// Create a geospatial index so MongoDB can perform location-based queries
OrganizationSchema.index({ coordinates: "2dsphere" });

// Create the Organization model from the schema
const Organization = mongoose.model("Organization", OrganizationSchema);

// Fetch all organizations of a specific type (default: DistributionCenter)
const getAllOrganizations = async (type = "DistributionCenter") => {
  return await Organization.find({ organizationType: type });
};

// Fetch a single organization by its organizationId
const getOrganizationById = async (organizationId) => {
  return await Organization.findOne({ organizationId });
};

// Export model and functions so they can be used in routes/controllers
module.exports = {
  Organization,
  OrganizationType,
  getAllOrganizations,
  getOrganizationById,
};
