// Load variables from the .env file (like MongoDB URL, Firebase keys, etc.)
require("dotenv").config();

// Import Express to create the backend server
const express = require("express");
// Import Mongoose to connect and interact with MongoDB
const mongoose = require("mongoose");
// Import CORS to allow the frontend to access the backend
const cors = require("cors");
// Import Firebase Admin to verify user authentication tokens
const admin = require("firebase-admin");
// Import fs to check and read the serviceAccountKey.json file
const fs = require("fs");


// Initialize Firebase Admin in a flexible way depending on what credentials we have
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // If Firebase credentials are stored in the environment variable (common in deployment)
  const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(parsed),
  });
} else if (fs.existsSync(__dirname + "/serviceAccountKey.json")) {
  // If a local JSON key file exists, use it (common during local development)
  const serviceAccount = require("./serviceAccountKey.json");
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  // If nothing is available, at least initialize the app (may fail on auth operations)
  admin.initializeApp();
}


// Import route handlers for users, donations, and geocoding features
const userRoutes = require("./routes/userRoutes");
const donationRoutes = require("./routes/donationRoutes");
const geocodingRoutes = require("./routes/geocodingRoutes");


// Create the Express application
const app = express();
// Choose the port from .env or default to 5000
const PORT = process.env.PORT || 5000;

// Enable CORS so frontend (localhost:5173) can talk to backend (localhost:5000)
app.use(cors());
// Allow Express to read JSON bodies from incoming requests
app.use(express.json());


// Use the MongoDB connection string from .env or use local MongoDB as backup
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/nourishlink";

// Connect to MongoDB and log success or errors
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB connection error:", err));



// Middleware that checks if the request has a valid Firebase token
const verifyAuth = async (req, res, next) => {
  // Extract token from the Authorization header (format: "Bearer <token>")
  const token = req.headers.authorization?.split(" ")[1];

  // If no token is provided, reject the request
  if (!token) {
    return res.status(401).json({ message: "Authentication token required." });
  }

  try {
    // Verify token using Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.firebaseUid = decodedToken.uid; // Save UID for next operations

    // Load the User model
    const User = mongoose.model("User");

    // Check if a matching user exists in MongoDB
    const user = await User.findOne({ uid: req.firebaseUid });

    // If no user is found, return an error
    if (!user) {
      return res
        .status(404)
        .json({ message: "User record not found in database." });
    }

    req.user = user; // Attach full user object to request
    next(); // Continue to actual route handler
  } catch (error) {
    console.error("TOKEN VERIFICATION FAILED:", error);
    res.status(401).json({ message: "Invalid or expired token." });
  }
};


// Load User model for middleware and routes
const User = mongoose.model("User");


// Register routes for different sections of the API
app.use("/api/users", userRoutes);                // Public user routes
app.use("/api/admin", verifyAuth, donationRoutes); // Admin donation routes (protected)
app.use("/api/donations", verifyAuth, donationRoutes); // Donor/volunteer donation routes (protected)
app.use("/api/geocoding", geocodingRoutes);       // Public geocoding routes


// Start the server and print a confirmation message
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
