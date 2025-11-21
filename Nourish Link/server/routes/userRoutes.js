const express = require("express");
const router = express.Router();
const userModel = require("../models/userModel");
const admin = require("firebase-admin");

const verifyToken = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).send({ message: "No token provided." });
  }
  const idToken = header.split("Bearer ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).send({ message: "Unauthorized or token expired." });
  }
};

// register the user details in the mongodb
router.post("/register", verifyToken, async (req, res) => {
  try {
    const { uid, email, name, role, phone, homeLocation } = req.body;

    if (uid !== req.user.uid) {
      return res.status(403).send({ message: "UID mismatch." });
    }

    const userData = {
      uid,
      email,
      name,
      role,
      phone: phone || null,
      homeLocation: homeLocation || null,
      createdAt: new Date().toISOString(),
    };

    const result = await userModel.createUser(userData);
    res
      .status(201)
      .send({ message: "User registered successfully", user: result });
  } catch (error) {
    res.status(500).send({
      message: "Failed to register user details.",
      error: error.message,
    });
  }
});

// get the role of user by uid
router.get("/role-details/:uid", verifyToken, async (req, res) => {
  try {
    const { uid } = req.params;
    if (uid !== req.user.uid) {
      if (req.user.role !== "Admin") {
        return res.status(403).send({ message: "Access denied." });
      }
    }

    const user = await userModel.getUserByUid(uid);
    if (!user) {
      return res.status(404).send({ message: "User not found in database." });
    }

    res.status(200).send({ user });
  } catch (error) {
    res.status(500).send({ message: "Failed to retrieve user data." });
  }
});

// get the profile detials of user by uid
router.get("/:uid", verifyToken, async (req, res) => {
  try {
    const { uid } = req.params;

    if (req.user.uid !== uid && req.user.role !== "Admin") {
      return res
        .status(403)
        .send({ message: "Access denied to user profile details." });
    }

    const user = await userModel.getUserByUid(uid);

    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    res.status(200).send({
      user: {
        uid: user.uid,
        name: user.name,
        phone: user.phone,
        homeLocation: user.homeLocation,
        role: user.role,
      },
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Failed to retrieve user profile details." });
  }
});

module.exports = router;
