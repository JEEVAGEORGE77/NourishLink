// Import Express and create a router for all user-related endpoints
const express = require("express");
const router = express.Router();

// Import User model helpers (for working with the main User collection)
const {
  User,
  createUser,
  getUserByUid,
  getUserByEmail,
  getUsersByRole,
  updateUser,
} = require("../models/userModel");

// Import Volunteer model helpers (for volunteer-specific profile data)
const {
  Volunteer,
  createVolunteer,
  getVolunteerByUserId,
  getActiveVolunteers,
  updateVolunteer,
} = require("../models/volunteerModel");

// Import Donor model helpers (for donor-specific profile data)
const {
  Donor,
  createDonor,
  getDonorByUserId,
  getActiveDonors,
  updateDonor,
} = require("../models/donorModel");

// Import Metrics model helpers (for tracking stats like tasks completed, rating)
const {
  Metrics,
  createMetrics,
  getMetricsById,
  getMetricsByUserId,
  updateMetrics,
  getTopVolunteersByMetrics,
} = require("../models/metricsModel");

// Firebase Admin SDK used for verifying Firebase ID tokens
const admin = require("firebase-admin");
// Mongoose used for generating ObjectId strings when needed
const mongoose = require("mongoose");

/**
 * Middleware: verifyToken
 * - Reads Bearer token from Authorization header
 * - Verifies it with Firebase Admin
 * - Loads corresponding User record from MongoDB
 * - Attaches the user document to req.user
 */
const verifyToken = async (req, res, next) => {
  const header = req.headers.authorization;

  // Token must be provided in the format "Bearer <token>"
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).send({ message: "No token provided." });
  }

  const idToken = header.split("Bearer ")[1];

  try {
    // Verify Firebase ID token and extract Firebase user information
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    // Look up corresponding user in our own User collection
    const user = await getUserByUid(decodedToken.uid);

    if (!user) {
      return res
        .status(404)
        .send({ message: "User record not found in database." });
    }

    // Attach full user document to the request for role checks later
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).send({ message: "Unauthorized or token expired." });
  }
};

/**
 * Middleware: verifyTokenOnly
 * - Only verifies Firebase token
 * - Does NOT load User record from MongoDB
 * - Stores Firebase UID in req.firebaseUid
 * - Used during registration (user may not exist in our DB yet)
 */
const verifyTokenOnly = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).send({ message: "No token provided." });
  }

  const idToken = header.split("Bearer ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    // Save Firebase UID so we can create a corresponding User record
    req.firebaseUid = decodedToken.uid;
    next();
  } catch (error) {
    return res.status(401).send({ message: "Unauthorized or token expired." });
  }
};

/**
 * POST /api/users/register
 * Registers a new user in the application database, after Firebase sign-up.
 * - Requires a valid Firebase token (verifyTokenOnly)
 * - Creates a User record
 * - If role is Volunteer or Donor, creates corresponding profile + metrics
 */
router.post("/register", verifyTokenOnly, async (req, res) => {
  try {
    const { email, name, role, phone, homeLocation } = req.body;
    const uid = req.firebaseUid;

    // Basic field validation (must have uid/email/name/role)
    if (!uid || !email || !name || !role) {
      return res.status(400).send({ message: "Missing required fields." });
    }

    // Base user object stored in the User collection
    const userData = {
      uid,
      email,
      name,
      role,
      status: "active",
    };

    const user = await createUser(userData);

    // If user is a Volunteer, also create a Volunteer profile and metrics record
    if (role === "Volunteer" && (phone || homeLocation)) {
      const volunteerId = new mongoose.Types.ObjectId().toHexString();

      const volunteerData = {
        userId: uid,
        phone: phone || "",
      };

      // If home location is provided, store coordinates and address as GeoJSON
      if (homeLocation && homeLocation.coordinates) {
        volunteerData.homeLocation = {
          type: "Point",
          coordinates: homeLocation.coordinates,
          address: homeLocation.address || "",
        };
      }

      await createVolunteer(volunteerData);

      const metricsId = new mongoose.Types.ObjectId().toHexString();
      await createMetrics({
        metricsId,
        userId: uid,
        userType: "Volunteer",
      });
    } else if (role === "Donor") {
      // If user is a Donor, create Donor profile and metrics record
      const donorId = new mongoose.Types.ObjectId().toHexString();
      await createDonor({
        userId: uid,
      });

      const metricsId = new mongoose.Types.ObjectId().toHexString();
      await createMetrics({
        metricsId,
        userId: uid,
        userType: "Donor",
      });
    }

    res.status(201).send({ message: "User registered successfully", user });
  } catch (error) {
    res.status(500).send({
      message: "Failed to register user details.",
      error: error.message,
    });
  }
});

/**
 * GET /api/users/
 * Returns a list of all users in the system.
 * - Only accessible by Admin users (checked via verifyToken + role check)
 */
router.get("/", verifyToken, async (req, res) => {
  if (req.user.role !== "Admin") {
    return res
      .status(403)
      .send({ message: "Access denied. Admin role required." });
  }

  try {
    // Load all users, excluding the internal __v version field
    const users = await User.find({}).select("-__v");
    res.status(200).send({ users });
  } catch (error) {
    res.status(500).send({ message: "Failed to retrieve user list." });
  }
});

/**
 * PUT /api/users/:uid
 * Updates a user’s details (e.g., role, status) in the User collection.
 * - Only Admins are allowed to perform updates
 */
router.put("/:uid", verifyToken, async (req, res) => {
  if (req.user.role !== "Admin") {
    return res
      .status(403)
      .send({ message: "Access denied. Admin role required." });
  }

  const { uid } = req.params;
  const updates = req.body;

  try {
    const updatedUser = await updateUser(uid, updates);

    if (!updatedUser) {
      return res.status(404).send({ message: "User not found." });
    }

    res
      .status(200)
      .send({ message: "User updated successfully.", user: updatedUser });
  } catch (error) {
    res.status(500).send({ message: "Failed to update user." });
  }
});

/**
 * GET /api/users/role-details/:uid
 * Returns:
 * - core User document, plus
 * - role-specific extra data (Volunteer or Donor document)
 * Access control:
 * - User can access their own data
 * - Admin can access any user’s data
 */
router.get("/role-details/:uid", verifyToken, async (req, res) => {
  try {
    const { uid } = req.params;

    // Non-admin users can only request their own record
    if (uid !== req.user.uid) {
      if (req.user.role !== "Admin") {
        return res.status(403).send({ message: "Access denied." });
      }
    }

    const user = await getUserByUid(uid);
    if (!user) {
      return res.status(404).send({ message: "User not found in database." });
    }

    let roleData = null;
    if (user.role === "Volunteer") {
      roleData = await getVolunteerByUserId(uid);
    } else if (user.role === "Donor") {
      roleData = await getDonorByUserId(uid);
    }

    res.status(200).send({ user, roleData });
  } catch (error) {
    res.status(500).send({ message: "Failed to retrieve user data." });
  }
});

/**
 * GET /api/users/:uid
 * Returns basic profile info and role-specific details for a single user.
 * Access control:
 * - User can see their own profile
 * - Admin can see any user’s profile
 */
router.get("/:uid", verifyToken, async (req, res) => {
  try {
    const { uid } = req.params;

    // Enforce that non-admins can only view their own profile
    if (req.user.uid !== uid && req.user.role !== "Admin") {
      return res
        .status(403)
        .send({ message: "Access denied to user profile details." });
    }

    const user = await getUserByUid(uid);

    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    // Load extra role-specific data, if applicable
    let roleDetails = null;
    if (user.role === "Volunteer") {
      roleDetails = await getVolunteerByUserId(uid);
    } else if (user.role === "Donor") {
      roleDetails = await getDonorByUserId(uid);
    }

    // Return a simplified user object (no internal fields) plus role details
    res.status(200).send({
      user: {
        uid: user.uid,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      roleDetails,
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Failed to retrieve user profile details." });
  }
});

// Export the router so it can be mounted under /api/users in the main server
module.exports = router;
