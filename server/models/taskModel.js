// Import the Mongoose library
const mongoose = require("mongoose");
// Extract Schema constructor from Mongoose
const { Schema } = mongoose;

// Allowed list of task statuses.
// Using ENUM helps ensure only valid statuses are stored.
const TaskStatus = [
  "pending",      // Task assigned but not accepted/en route yet
  "assigned",     // Task has been assigned to a volunteer
  "enRoute",      // Volunteer is on the way (pickup/dropoff)
  "completed",    // Task successfully finished
  "cancelled",    // Cancelled by admin or system
  "failed",       // Volunteer failed to complete task
];

// Allowed list of task types — determines if it’s a pickup or dropoff task.
const TaskType = ["collection", "distribution"];

// Define task structure for MongoDB
const TaskSchema = new Schema({
  // Unique string ID generated for each task
  taskId: { type: String, required: true, unique: true },

  // The donation this task is associated with
  donationId: { type: String, required: true, ref: "Donation" },

  // Volunteer assigned to this task
  volunteerId: { type: String, required: true, index: true },

  // Whether this is a collection or distribution task
  taskType: { type: String, required: true, enum: TaskType },

  // Current status of the task (restricted by the enum above)
  status: {
    type: String,
    required: true,
    enum: TaskStatus,
    default: "pending",
  },

  // Geographic location involved in this task (pickup or dropoff point)
  location: {
    type: { type: String, enum: ["Point"], default: "Point" }, // GeoJSON point
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
  },

  // Full address associated with the task location
  address: { type: String, required: true },

  // Timestamp for when the task was assigned
  assignedAt: { type: Date, default: Date.now },

  // Timestamp when volunteer started the task (en route)
  startedAt: { type: Date },

  // Timestamp when volunteer completed the task
  completedAt: { type: Date },

  // Additional notes by volunteer or admin (optional)
  notes: { type: String },

  // Indicates if the volunteer reported a problem during task
  issueReported: { type: Boolean, default: false },

  // Text describing what issue was reported
  issueNotes: { type: String },
});

// Index that enables geospatial location queries
TaskSchema.index({ location: "2dsphere" });

// Index to quickly find tasks by volunteer and status
TaskSchema.index({ volunteerId: 1, status: 1 });

// Convert schema into a database model
const Task = mongoose.model("Task", TaskSchema);

// Create a new task in the database
const createTask = async (taskData) => {
  const newTask = new Task(taskData);
  return await newTask.save();
};

// Find a single task using its unique taskId
const getTaskById = async (taskId) => {
  return await Task.findOne({ taskId });
};

// Get all tasks assigned to a specific volunteer
const getTasksByVolunteerId = async (volunteerId) => {
  return await Task.find({ volunteerId }).sort({ assignedAt: -1 });
};

// Find all tasks that belong to a specific donation
const getTasksByDonationId = async (donationId) => {
  return await Task.find({ donationId });
};

// Update a task using its ID and return the updated version
const updateTask = async (taskId, updateData) => {
  return await Task.findOneAndUpdate({ taskId }, updateData, { new: true });
};

// Export model and helper functions
module.exports = {
  Task,
  TaskStatus,
  TaskType,
  createTask,
  getTaskById,
  getTasksByVolunteerId,
  getTasksByDonationId,
  updateTask,
};
