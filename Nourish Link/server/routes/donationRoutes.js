const express = require("express");
const router = express.Router();
const Donation = require("../models/donationModel");
const mongoose = require("mongoose");
const userModel = require("../models/userModel");

// Predefined distribution locations
const DISTRIBUTION_LOCATIONS = [
  {
    id: 1,
    name: "Community Shelter Downtown",
    address: "100 Main St, Waterloo, ON",
    coordinates: [-80.533, 43.466],
  },
  {
    id: 2,
    name: "Food Bank North End",
    address: "250 Northfield Dr W, Waterloo, ON",
    coordinates: [-80.53, 43.5],
  },
  {
    id: 3,
    name: "Regional Housing Center",
    address: "500 University Ave W, Waterloo, ON",
    coordinates: [-80.55, 43.475],
  },
];

// Middleware to check for Admin role
const isAdmin = (req, res) => {
  if (req.user.role !== "Admin") {
    res.status(403).json({ message: "Access denied. Admin role required." });
    return false;
  }
  return true;
};

// Middleware to check for Volunteer role
const isVolunteer = (req, res) => {
  if (req.user.role !== "Volunteer") {
    res
      .status(403)
      .json({ message: "Access denied. Volunteer role required." });
    return false;
  }
  return true;
};

// Post a new donation
router.post("/post", async (req, res) => {
  if (req.user.role !== "Donor" && req.user.role !== "Admin") {
    return res
      .status(403)
      .json({ message: "Access denied. Donor or Admin role required." });
  }

  const {
    itemType,
    quantity,
    pickupAddress,
    pickupLocation,
    availabilityTime,
    notes,
  } = req.body;

  if (
    !itemType ||
    !quantity ||
    !pickupAddress ||
    !pickupLocation ||
    !availabilityTime
  ) {
    return res
      .status(400)
      .json({ message: "Missing required donation fields." });
  }

  try {
    const docId = new mongoose.Types.ObjectId().toHexString();

    const newDonation = new Donation({
      donationId: docId,
      donorId: req.user.uid,
      donorName: req.user.name,
      itemType,
      quantity,
      notes,
      status: "pendingAssignment",
      pickupLocation: {
        type: "Point",
        coordinates: pickupLocation.coordinates,
      },
      pickupAddress,
      availabilityTime: new Date(availabilityTime),
      postedAt: new Date(),
    });

    await newDonation.save();
    res.status(201).json({
      message: "Donation posted successfully.",
      donation: newDonation,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to post donation." });
  }
});

// Get pending donations for admin review
router.get("/pending", async (req, res) => {
  if (!isAdmin(req, res)) return;

  try {
    const pendingDonations = await Donation.find({
      $or: [{ status: "pendingAssignment" }, { status: "collected" }],
    }).sort({ postedAt: -1 });
    res.json({ donations: pendingDonations });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch pending donations." });
  }
});

// get the volunteer list data with their distance (calculated in frontend)
router.get("/volunteers", async (req, res) => {
  if (!isAdmin(req, res)) return;

  try {
    const volunteers = await userModel.getVolunteers();
    res.json({ volunteers });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch volunteer list." });
  }
});

// Get donation history for a donor
router.get("/donor/:uid/history", async (req, res) => {
  const { uid } = req.params;

  if (req.user.uid !== uid && req.user.role !== "Admin") {
    return res
      .status(403)
      .json({ message: "Access denied. Cannot view another user's history." });
  }

  try {
    const donations = await Donation.find({ donorId: uid }).sort({
      postedAt: -1,
    });
    res.json({ donations });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch donor history." });
  }
});

// Get active tasks for a volunteer
router.get("/volunteer/:volunteerId/active-tasks", async (req, res) => {
  const { volunteerId } = req.params;

  if (req.user.uid !== volunteerId && req.user.role !== "Admin") {
    return res
      .status(403)
      .json({ message: "Access denied. Can only view your own tasks." });
  }

  try {
    const activeTasks = await Donation.find({
      $or: [
        { collectionVolunteerId: volunteerId },
        { distributionVolunteerId: volunteerId },
      ],
      status: { $nin: ["delivered", "issueReported"] },
    }).sort({ postedAt: -1 });

    res.json({ tasks: activeTasks });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch volunteer tasks." });
  }
});

// Get all active tasks for the logged-in volunteer
router.get("/tasks", async (req, res) => {
  if (!isVolunteer(req, res)) return;
  const volunteerId = req.user.uid;

  try {
    const activeTasks = await Donation.find({
      $or: [
        { collectionVolunteerId: volunteerId },
        { distributionVolunteerId: volunteerId },
      ],
      status: { $nin: ["delivered", "issueReported"] },
    }).sort({ postedAt: -1 });

    res.json({ tasks: activeTasks });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch volunteer tasks." });
  }
});

// Assign collection task to a volunteer
router.put("/assign-collection-task/:id", async (req, res) => {
  if (!isAdmin(req, res)) return;

  const { volunteerId } = req.body;
  const donationId = req.params.id;

  if (!volunteerId) {
    return res
      .status(400)
      .json({ message: "Volunteer ID is required for assignment." });
  }

  try {
    const updatedDonation = await Donation.findOneAndUpdate(
      { donationId: donationId, status: "pendingAssignment" },
      {
        status: "assignedForCollection",
        collectionVolunteerId: volunteerId,
        distributionVolunteerId: null,
      },
      { new: true }
    );

    if (!updatedDonation) {
      return res.status(404).json({
        message: "Donation not found or status is not pendingAssignment.",
      });
    }

    res.json({
      message: "Collection task assigned successfully.",
      donation: updatedDonation,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to assign task." });
  }
});

// Get predefined distribution locations
router.get("/distribution-locations", async (req, res) => {
  if (!isAdmin(req, res)) return;

  res.json({ locations: DISTRIBUTION_LOCATIONS });
});

router.put("/assign-distribution-task/:id", async (req, res) => {
  if (!isAdmin(req, res)) return;

  const { locationId } = req.body;
  const donationId = req.params.id;

  if (!locationId) {
    return res.status(400).json({ message: "Location ID is required." });
  }

  const dropoffLocation = DISTRIBUTION_LOCATIONS.find(
    (loc) => loc.id === parseInt(locationId)
  );

  if (!dropoffLocation) {
    return res
      .status(404)
      .json({ message: "Invalid drop-off location selected." });
  }

  try {
    const collectedDonation = await Donation.findOne({
      donationId: donationId,
      status: "collected",
    });

    if (!collectedDonation || !collectedDonation.collectedByVolunteerId) {
      return res
        .status(404)
        .json({ message: "Donation not found or collector ID is missing." });
    }

    const distributionVolunteerId = collectedDonation.collectedByVolunteerId;

    const updatedDonation = await Donation.findOneAndUpdate(
      { donationId: donationId },
      {
        status: "assignedForDistribution",
        distributionVolunteerId: distributionVolunteerId,
        dropoffLocation: {
          type: "Point",
          coordinates: dropoffLocation.coordinates,
        },
        dropoffAddress: dropoffLocation.address,
      },
      { new: true }
    );

    if (!updatedDonation) {
      return res.status(500).json({
        message: "Failed to update donation after finding collector.",
      });
    }

    res.json({
      message: "Distribution task assigned successfully.",
      donation: updatedDonation,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to assign distribution task." });
  }
});

// Update donation status by volunteer
router.patch("/:id/status", async (req, res) => {
  if (!isVolunteer(req, res)) return;

  const { status } = req.body;
  const donationId = req.params.id;
  const volunteerId = req.user.uid;

  if (!status || !Donation.schema.path("status").enumValues.includes(status)) {
    return res.status(400).json({ message: "Invalid or missing new status." });
  }

  let updateData = { status: status };

  const donation = await Donation.findOne({ donationId: donationId });
  if (
    !donation ||
    (donation.collectionVolunteerId !== volunteerId &&
      donation.distributionVolunteerId !== volunteerId)
  ) {
    return res
      .status(403)
      .json({ message: "Forbidden. You are not assigned to this task." });
  }

  if (status === "collected") {
    updateData.collectedAt = new Date();
    updateData.collectedByVolunteerId = volunteerId;
    updateData.collectionVolunteerId = null;
    updateData.distributionVolunteerId = null;
  } else if (status === "delivered") {
    updateData.deliveredAt = new Date();
    updateData.distributionVolunteerId = null;
  }

  try {
    const updatedDonation = await Donation.findOneAndUpdate(
      { donationId: donationId },
      updateData,
      { new: true }
    );

    if (!updatedDonation) {
      return res.status(404).json({ message: "Donation not found." });
    }

    res.json({
      message: `Status updated to ${status}`,
      donation: updatedDonation,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update donation status." });
  }
});

// Update donation status by volunteer
router.put("/:id/status", async (req, res) => {
  if (!isVolunteer(req, res)) return;

  const { status } = req.body;
  const donationId = req.params.id;
  const volunteerId = req.user.uid;

  if (!status || !Donation.schema.path("status").enumValues.includes(status)) {
    return res.status(400).json({ message: "Invalid or missing new status." });
  }

  let updateData = { status: status };

  const donation = await Donation.findOne({ donationId: donationId });
  if (
    !donation ||
    (donation.collectionVolunteerId !== volunteerId &&
      donation.distributionVolunteerId !== volunteerId)
  ) {
    return res
      .status(403)
      .json({ message: "Forbidden. You are not assigned to this task." });
  }

  if (status === "collected") {
    updateData.collectedAt = new Date();
    updateData.collectedByVolunteerId = volunteerId;
    updateData.collectionVolunteerId = null;
    updateData.distributionVolunteerId = null;
  } else if (status === "delivered") {
    updateData.deliveredAt = new Date();
    updateData.distributionVolunteerId = null;
  }

  try {
    const updatedDonation = await Donation.findOneAndUpdate(
      { donationId: donationId },
      updateData,
      { new: true }
    );

    if (!updatedDonation) {
      return res.status(404).json({ message: "Donation not found." });
    }

    res.json({
      message: `Status updated to ${status}`,
      donation: updatedDonation,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update donation status." });
  }
});

// Get dashboard metrics for admin
router.get("/metrics", async (req, res) => {
  if (!isAdmin(req, res)) return;

  try {
    const totalDonations = await Donation.countDocuments();
    const tasksCompleted = await Donation.countDocuments({
      status: "delivered",
    });
    const tasksInTransit = await Donation.countDocuments({
      status: {
        $in: [
          "assignedForCollection",
          "enRouteForCollection",
          "assignedForDistribution",
          "enRouteForDistribution",
        ],
      },
    });

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyMetrics = await Donation.aggregate([
      { $match: { postedAt: { $gte: sixMonthsAgo } } },
      {
        $project: {
          year: { $year: "$postedAt" },
          month: { $month: "$postedAt" },
          isDelivered: { $eq: ["$status", "delivered"] },
        },
      },
      {
        $group: {
          _id: { year: "$year", month: "$month" },
          received: { $sum: 1 },
          delivered: {
            $sum: { $cond: [{ $eq: ["$isDelivered", true] }, 1, 0] },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthlyData = monthlyMetrics.map((item) => ({
      month: monthNames[item._id.month - 1],
      received: item.received,
      delivered: item.delivered,
    }));

    res.json({
      totalDonations,
      tasksCompleted,
      tasksInTransit,
      completionRate:
        totalDonations > 0
          ? ((tasksCompleted / totalDonations) * 100).toFixed(1)
          : "0.0",
      monthlyData,
    });
  } catch (error) {
    console.error("METRICS AGGREGATION ERROR:", error);
    res.status(500).json({ message: "Failed to fetch dashboard metrics." });
  }
});

module.exports = router;
