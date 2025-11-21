require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const admin = require("firebase-admin");
const fs = require("fs");

// Initialize Firebase Admin SDK
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(parsed),
  });
} else if (fs.existsSync(__dirname + "/serviceAccountKey.json")) {
  const serviceAccount = require("./serviceAccountKey.json");
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  admin.initializeApp();
}

const userRoutes = require("./routes/userRoutes");
const donationRoutes = require("./routes/donationRoutes");
const geocodingRoutes = require("./routes/geocodingRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/nourishlink";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB connection error:", err));

// Middleware to verify Firebase Auth token
const verifyAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Authentication token required." });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.firebaseUid = decodedToken.uid;

    const User = mongoose.model("User");
    const user = await User.findOne({ uid: req.firebaseUid });

    if (!user) {
      return res
        .status(404)
        .json({ message: "User record not found in database." });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("TOKEN VERIFICATION FAILED:", error);
    res.status(401).json({ message: "Invalid or expired token." });
  }
};

const User = mongoose.model("User");

// Routes
app.use("/api/users", userRoutes);
app.use("/api/admin", verifyAuth, donationRoutes);
app.use("/api/donations", verifyAuth, donationRoutes);
app.use("/api/geocoding", geocodingRoutes);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
