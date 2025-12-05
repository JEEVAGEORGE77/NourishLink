// Import the Mongoose library 
const mongoose = require("mongoose");
// Extract the Schema constructor from Mongoose
const { Schema } = mongoose;

// Define the structure for a User document in the database
const UserSchema = new Schema({
  // Firebase UID of the user (comes from Firebase Auth)
  uid: { type: String, required: true, unique: true },

  // Email address of the user (must be unique across the system)
  email: { type: String, required: true, unique: true },

  // Full name of the user
  name: { type: String, required: true },

  // Defines whether user is a Donor, Volunteer, or Admin
  // ENUM restricts values so invalid roles can't be stored
  role: { type: String, required: true, enum: ["Donor", "Volunteer", "Admin"] },

  // Active/inactive user status (used by Admin to deactivate accounts)
  status: { type: String, default: "active" },

  // Automatically stores when the user record was created
  createdAt: { type: Date, default: Date.now },

  // Stores last update time for the user record
  updatedAt: { type: Date, default: Date.now },
});

// Compound index for efficient queries when filtering users by role + status
UserSchema.index({ role: 1, status: 1 });

// Convert the schema into a Mongoose model to access CRUD functions
const User = mongoose.model("User", UserSchema);

// Creates a new user in the database
const createUser = async (userData) => {
  const newUser = new User(userData);
  return await newUser.save();
};

// Fetch a user using their Firebase UID
const getUserByUid = async (uid) => {
  return await User.findOne({ uid });
};

// Fetch a user using their email address
const getUserByEmail = async (email) => {
  return await User.findOne({ email });
};

// Get users based on role (e.g., all Volunteers) but only active ones
const getUsersByRole = async (role) => {
  return await User.find({ role, status: "active" });
};

// Update a user’s data by UID and automatically refresh the updatedAt field
const updateUser = async (uid, updateData) => {
  return await User.findOneAndUpdate(
    { uid },
    { ...updateData, updatedAt: Date.now() },
    { new: true } // returns updated document instead of old one
  );
};

// Export model and helper functions for use in controllers or services
module.exports = {
  User,
  createUser,
  getUserByUid,
  getUserByEmail,
  getUsersByRole,
  updateUser,
};
