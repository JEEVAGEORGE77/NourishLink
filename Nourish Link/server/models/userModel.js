const mongoose = require("mongoose");
const { Schema } = mongoose;

// Define the User schema
const UserSchema = new Schema({
  uid: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  role: { type: String, required: true, enum: ["Donor", "Volunteer", "Admin"] },
  status: { type: String, default: "active" },
  createdAt: { type: Date, default: Date.now },

  phone: { type: String },
  homeLocation: {
    address: { type: String },
    coordinates: { type: [Number], index: "2dsphere" },
  },

  organizationId: { type: String },
  primaryLocation: { type: String },
  tasksCompleted: { type: Number, default: 0 },
  rating: { type: Number, default: 5.0 },
});

const User = mongoose.model("User", UserSchema);

const createUser = async (userData) => {
  const newUser = new User(userData);
  return await newUser.save();
};

const getUserByUid = async (uid) => {
  return await User.findOne({ uid });
};

const getVolunteers = async () => {
  return await User.find({ role: "Volunteer", status: "active" }).select(
    "uid name phone homeLocation rating"
  );
};

module.exports = {
  User,
  createUser,
  getUserByUid,
  getVolunteers,
};
