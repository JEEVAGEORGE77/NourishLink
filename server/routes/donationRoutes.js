// Import Express and create a new router instance
const express = require("express");
const router = express.Router();

// Import Donation model and helper methods
const {
  Donation,
  DonationStatus,
  createDonation,
  getDonationById,
  getDonationsByDonorId,
  getDonationsByStatus,
  updateDonation,
} = require("../models/donationModel");

// Import Task model and helper methods
const {
  Task,
  TaskStatus,
  TaskType,
  createTask,
  getTaskById,
  getTasksByVolunteerId,
  getTasksByDonationId,
  updateTask,
} = require("../models/taskModel");

// Import Volunteer model and helper methods
const {
  Volunteer,
  createVolunteer,
  getVolunteerByUserId,
  getActiveVolunteers,
  updateVolunteer,
} = require("../models/volunteerModel");

// Import Metrics model and helper methods
const {
  Metrics,
  createMetrics,
  getMetricsById,
  getMetricsByUserId,
  updateMetrics,
  getTopVolunteersByMetrics,
} = require("../models/metricsModel");
// Mongoose is used to generate IDs and work with MongoDB
const mongoose = require("mongoose");
// Import User model helpers to look up volunteer names/emails

const {
  User,
  createUser,
  getUserByUid,
  getUserByEmail,
  getUsersByRole,
  updateUser,
} = require("../models/userModel");
// Import organization helpers (used for predefined distribution centers)

const {
  Organization,
  getAllOrganizations,
  getOrganizationById,
} = require("../models/organizationModel");

/**
 * Helper: checks if the current user is an Admin.
 * Returns false and sends 403 response if not.
 */
const isAdmin = (req, res) => {
  if (req.user.role !== "Admin") {
    res.status(403).json({ message: "Access denied. Admin role required." });
    return false;
  }
  return true;
};

/**
 * Helper: checks if the current user is a Volunteer.
 * Returns false and sends 403 response if not.
 */
const isVolunteer = (req, res) => {
  if (req.user.role !== "Volunteer") {
    res
      .status(403)
      .json({ message: "Access denied. Volunteer role required." });
    return false;
  }
  return true;
};

/**
 * POST /api/donations/post
 * Allows a Donor or Admin to post a new donation.
 * Validates required fields and saves donation with status "pendingAssignment".
 */
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

  console.log("POST /api/donations/post called by:", {
    userId: req.user.uid,
    userName: req.user.name,
    userRole: req.user.role,
  });
  console.log("Request body:", {
    itemType,
    quantity,
    pickupAddress,
    pickupLocation,
    availabilityTime,
    notes,
  });

  if (
    !itemType ||
    !quantity ||
    !pickupAddress ||
    !pickupLocation ||
    !pickupLocation?.coordinates ||
    !availabilityTime
  ) {
    console.warn("Validation failed. Missing required fields.");
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

    console.log("Saving donation with ID:", docId);
    await newDonation.save();
    console.log("Donation saved successfully:", docId);

    // Update donor metrics: increment totalDonationsPosted and foodItemsCollected
    try {
      const qty = Number(quantity) || 0;
      const metrics = await getMetricsByUserId(req.user.uid);
      if (!metrics) {
        const metricsId = new mongoose.Types.ObjectId().toHexString();
        await createMetrics({
          metricsId,
          userId: req.user.uid,
          userType: "Donor",
          totalDonationsPosted: 1,
          foodItemsCollected: qty,
        });
      } else {
        await updateMetrics(req.user.uid, {
          totalDonationsPosted: (metrics.totalDonationsPosted || 0) + 1,
          foodItemsCollected: (metrics.foodItemsCollected || 0) + qty,
        });
      }
    } catch (err) {
      console.error("METRICS UPDATE ERROR (post donation):", err);
    }

    res.status(201).json({
      message: "Donation posted successfully.",
      donation: newDonation,
    });
  } catch (error) {
    console.error("POST DONATION ERROR:", {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack,
    });
    res
      .status(500)
      .json({ message: "Failed to post donation.", error: error.message });
  }
});

/**
 * GET /api/donations/pending
 * Admin-only: returns donations that either need collection assignment
 * or are already collected and awaiting distribution.
 */
router.get("/pending", async (req, res) => {
  if (!isAdmin(req, res)) return;

  try {
    const pendingDonations = await Donation.find({
      status: { $in: ["pendingAssignment", "collected"] },
    }).sort({ postedAt: -1 });

    res.json({ donations: pendingDonations });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch pending donations." });
  }
});

/**
 * GET /api/donations/reported-issues
 * Admin-only: fetches all tasks that have an issue flagged by volunteers.
 * Returns a simplified list for Admin to review in the dashboard.
 */
router.get("/reported-issues", async (req, res) => {
  if (req.user.role !== "Admin") {
    return res.status(403).json({ message: "Access denied." });
  }

  try {
    const reportedTasks = await Task.find({ issueReported: true }).sort({
      assignedAt: -1,
    });

    console.log(`Found ${reportedTasks.length} reported tasks`);

    const formattedIssues = reportedTasks.map((task) => {
      const donation = task.donationId || {};

      return {
        _id: task._id,
        taskId: task.taskId,

        donationId: donation.donationId || donation._id,

        currentVolunteer: task.volunteerId,

        issueNotes: task.issueNotes || "No notes provided.",
        issueReportedAt: task.assignedAt,

        postedAt: donation.postedAt,

        foodItem: donation.itemType || "Unknown Item",
        quantity: donation.quantity,
        donorName: donation.donorName,

        address: task.address || donation.pickupAddress,
      };
    });

    res.json(formattedIssues);
  } catch (error) {
    console.error("FETCH REPORTED ISSUES ERROR:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
    });
    res.status(500).json({
      message: "Failed to fetch reported issues.",
      error: error.message,
    });
  }
});

/**
 * PUT /api/donations/report-issue/:taskId
 * Volunteer-only: mark a task as having an issue (e.g., wrong address),
 * attach issue notes, and move it into "pending_review" for Admin.
 */
router.put("/report-issue/:taskId", async (req, res) => {
  if (!isVolunteer(req, res)) return;

  const { taskId } = req.params;
  const { issueNotes } = req.body;
  const volunteerId = req.user.uid;

  if (!issueNotes) {
    return res
      .status(400)
      .json({ message: "Issue notes are required to report an issue." });
  }

  try {
    const task = await Task.findOne({ _id: taskId, volunteerId: volunteerId });

    if (!task) {
      return res
        .status(403)
        .json({ message: "Forbidden. Task not found or not assigned to you." });
    }

    const updatedTask = await Task.findOneAndUpdate(
      { _id: taskId },
      {
        issueReported: true,
        issueNotes: issueNotes,
        status: "pending_review",
      },
      { new: true }
    );

    res.json({
      message:
        "Issue reported successfully. Task status set to pending review.",
      task: updatedTask,
    });
  } catch (error) {
    console.error("REPORT ISSUE ERROR:", error);
    res.status(500).json({ message: "Failed to report issue." });
  }
});

/**
 * PUT /api/donations/reassign-task/:taskId
 * Admin-only: assigns a reported task to a different volunteer
 * and clears the issue flags.
 */
router.put("/reassign-task/:taskId", async (req, res) => {
  if (!isAdmin(req, res)) return;

  const { taskId } = req.params;
  const { newVolunteerId } = req.body;

  if (!newVolunteerId) {
    return res
      .status(400)
      .json({ message: "New Volunteer ID is required for reassignment." });
  }

  try {
    const updatedTask = await Task.findOneAndUpdate(
      { taskId },
      {
        volunteerId: newVolunteerId,
        status: "assigned",
        issueReported: false,
        issueNotes: null,
        assignedAt: new Date(),
      },
      { new: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ message: "Task not found." });
    }

    res.json({
      message: "Task successfully reassigned and issue flag cleared.",
      task: updatedTask,
    });
  } catch (error) {
    console.error("REASSIGN TASK ERROR:", error);
    res.status(500).json({ message: "Failed to reassign task." });
  }
});

/**
 * GET /api/donations/volunteers
 * Admin-only: returns list of active volunteers with basic profile data
 * and their linked User info (name + email).
 */
router.get("/volunteers", async (req, res) => {
  if (!isAdmin(req, res)) return;

  try {
    const volunteers = await Volunteer.find({ status: "active" }).select(
      "userId phone homeLocation rating tasksCompleted"
    );

    const volunteersWithNames = await Promise.all(
      volunteers.map(async (vol) => {
        const user = await User.findOne({ uid: vol.userId }).select(
          "name email"
        );
        return {
          ...vol.toObject(),
          uid: vol.userId,
          name: user?.name || "Unknown",
          email: user?.email || "",
        };
      })
    );

    res.json({ volunteers: volunteersWithNames });
  } catch (error) {
    console.error("FETCH VOLUNTEERS ERROR:", {
      message: error.message,
      name: error.name,
    });
    res.status(500).json({
      message: "Failed to fetch volunteer list.",
      error: error.message,
    });
  }
});

/**
 * GET /api/donations/donor/:uid/history
 * Returns full donation history for a specific donor.
 * Only that donor or an Admin is allowed to access it.
 */
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

    const taskIds = await Task.find({
      donationId: { $in: donations.map((d) => d.donationId) },
    }).select("volunteerId");

    const volunteers = await getUsersByRole("Volunteer");
    const volunteerMap = volunteers.reduce((map, user) => {
      map[user.uid] = user.name;
      return map;
    }, {});

    const donationsWithNames = donations.map((donation) => {
      const d = donation.toObject();
      return d;
    });

    res.json({ donations: donationsWithNames });
  } catch (error) {
    console.error("FETCH DONOR HISTORY ERROR:", {
      message: error.message,
      name: error.name,
      code: error.code,
    });
    res.status(500).json({
      message: "Failed to fetch donor history.",
      error: error.message,
    });
  }
});

/**
 * GET /api/donations/donor/:donorId/notifications
 * Donor or Admin: returns notification-style summaries for latest donations.
 */
router.get("/donor/:donorId/notifications", async (req, res) => {
  const { donorId } = req.params;
  if (req.user.uid !== donorId && req.user.role !== "Admin") {
    return res.status(403).json({ message: "Access denied." });
  }

  try {
    const latestDonations = await Donation.find({ donorId: donorId })
      .sort({ postedAt: -1 })
      .limit(5);

    const notifications = latestDonations.map((d) => {
      return {
        id: d.donationId,
        message: `Your donation of ${d.itemType} (${
          d.quantity
        }) is currently: ${d.status.replace(/([A-Z])/g, " $1").trim()}`,
        status: d.status,
        timestamp: d.postedAt,
      };
    });

    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch donor notifications." });
  }
});

/**
 * GET /api/donations/volunteer/:volunteerId/stats
 * Volunteer or Admin: returns statistics such as tasks completed
 * and count of distribution tasks.
 */
router.get("/volunteer/:volunteerId/stats", async (req, res) => {
  const { volunteerId } = req.params;

  if (req.user.uid !== volunteerId && req.user.role !== "Admin") {
    return res.status(403).json({ message: "Access denied." });
  }

  try {
    const activeTasks = await Task.find({
      volunteerId: volunteerId,
      status: { $nin: ["completed", "cancelled"] },
    })
      .sort({ assignedAt: -1 })
      .limit(10);

    const completedCount = await Task.countDocuments({
      volunteerId: volunteerId,
      status: "completed",
    });

    const distributionCount = await Task.countDocuments({
      volunteerId: volunteerId,
      taskType: "distribution",
    });

    const completedDistributionCount = await Task.countDocuments({
      volunteerId: volunteerId,
      status: "completed",
      taskType: "distribution",
    });

    res.json({
      tasksCompleted: completedCount,
      distributionCount: distributionCount,
      completedDistribution: completedDistributionCount,
      tasksAssigned: await Task.countDocuments({ volunteerId: volunteerId }),
      rating: 5.0,
      latestActiveTask: activeTasks.length > 0 ? activeTasks[0] : null,
    });
  } catch (error) {
    console.error("Stats Error:", error);
    res.status(500).json({ message: "Failed to fetch volunteer statistics." });
  }
});

/**
 * GET /api/donations/volunteer/:volunteerId/active-tasks
 * Volunteer or Admin: returns only non-completed, non-cancelled tasks.
 */
router.get("/volunteer/:volunteerId/active-tasks", async (req, res) => {
  const { volunteerId } = req.params;

  if (req.user.uid !== volunteerId && req.user.role !== "Admin") {
    return res
      .status(403)
      .json({ message: "Access denied. Can only view your own tasks." });
  }

  try {
    const activeTasks = await Task.find({
      volunteerId: volunteerId,
      status: { $nin: ["completed", "cancelled"] },
    })
      .sort({ assignedAt: -1 })
      .limit(20);

    res.json({ tasks: activeTasks });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch volunteer tasks." });
  }
});

/**
 * GET /api/donations/volunteer/:volunteerId/all-tasks
 * Volunteer or Admin: returns full task history for that volunteer.
 */
router.get("/volunteer/:volunteerId/all-tasks", async (req, res) => {
  const { volunteerId } = req.params;

  if (req.user.uid !== volunteerId && req.user.role !== "Admin") {
    return res
      .status(403)
      .json({ message: "Access denied. Can only view your own tasks." });
  }

  try {
    const allTasks = await Task.find({ volunteerId: volunteerId }).sort({
      assignedAt: -1,
    });

    res.json({ tasks: allTasks });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch volunteer history." });
  }
});

/**
 * GET /api/donations/tasks
 * Volunteer-only: shorthand endpoint to get active tasks for the logged-in volunteer.
 */
router.get("/tasks", async (req, res) => {
  if (!isVolunteer(req, res)) return;
  const volunteerId = req.user.uid;

  try {
    const activeTasks = await Task.find({
      volunteerId: volunteerId,
      status: { $nin: ["completed", "cancelled"] },
    }).sort({ assignedAt: -1 });

    res.json({ tasks: activeTasks });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch volunteer tasks." });
  }
});

/**
 * PUT /api/donations/assign-collection-task/:id
 * Admin-only: assigns a collection task to a volunteer for a pending donation.
 */
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
    const donation = await Donation.findOne({
      donationId: donationId,
      status: "pendingAssignment",
    });

    // Validate donation existence
    if (!donation) {
      return res.status(404).json({
        message: "Donation not found or status is not pendingAssignment.",
      });
    }

    const taskId = new mongoose.Types.ObjectId().toHexString();
    // Create a new Task for collection
    const task = await Task.create({
      taskId,
      donationId: donationId,
      volunteerId: volunteerId,
      taskType: "collection",
      status: "assigned",
      location: {
        type: "Point",
        coordinates: donation.pickupLocation.coordinates,
      },
      address: donation.pickupAddress,
    });

    // Update metrics: increment tasksAssigned for the volunteer
    try {
      const metrics = await getMetricsByUserId(volunteerId);
      if (!metrics) {
        const metricsId = new mongoose.Types.ObjectId().toHexString();
        await createMetrics({
          metricsId,
          userId: volunteerId,
          userType: "Volunteer",
          tasksAssigned: 1,
        });
      } else {
        await updateMetrics(volunteerId, {
          tasksAssigned: (metrics.tasksAssigned || 0) + 1,
        });
      }
    } catch (err) {
      console.error("METRICS UPDATE ERROR (assign collection):", err);
    }

    // Mark donation as assigned for collection
    const updatedDonation = await Donation.findOneAndUpdate(
      { donationId: donationId },
      { status: "assignedForCollection" },
      { new: true }
    );

    res.json({
      message: "Collection task assigned successfully.",
      donation: updatedDonation,
      task,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to assign task." });
  }
});

/**
 * GET /api/donations/distribution-locations
 * Admin-only: returns all predefined DistributionCenter organizations
 * so Admin can choose where food should be dropped off.
 */
router.get("/distribution-locations", async (req, res) => {
  if (!isAdmin(req, res)) return;

  try {
    const organizations = await getAllOrganizations("DistributionCenter");

    const formattedLocations = organizations.map((org) => ({
      id: parseInt(org.organizationId),
      name: org.name,
      address: org.address,
      coordinates: org.coordinates,
    }));

    res.json({ locations: formattedLocations });
  } catch (error) {
    console.error("FETCH ORGANIZATIONS ERROR:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch distribution locations." });
  }
});

/**
 * PUT /api/donations/assign-distribution-task/:id
 * Admin-only: assigns a distribution task to a volunteer and sets
 * the donation's drop-off location.
 */
router.put("/assign-distribution-task/:id", async (req, res) => {
  if (!isAdmin(req, res)) return;

  const { volunteerId, locationId } = req.body;
  const donationId = req.params.id;

  if (!volunteerId || !locationId) {
    return res
      .status(400)
      .json({ message: "Volunteer ID and Location ID are required." });
  }

  // Fetch the selected drop-off organization
  const dropoffOrganization = await getOrganizationById(String(locationId));

  if (!dropoffOrganization) {
    return res
      .status(404)
      .json({ message: "Invalid drop-off location selected." });
  }

  try {
    // Ensure donation has been collected before assigning distribution

    const donation = await Donation.findOne({
      donationId: donationId,
      status: "collected",
    });

    if (!donation) {
      return res
        .status(404)
        .json({ message: "Donation not found or not yet collected." });
    }

    // Create a distribution task

    const taskId = new mongoose.Types.ObjectId().toHexString();
    const task = await Task.create({
      taskId,
      donationId: donationId,
      volunteerId: volunteerId,
      taskType: "distribution",
      status: "assigned",
      location: {
        type: "Point",
        coordinates: dropoffOrganization.coordinates,
      },
      address: dropoffOrganization.address,
    });

    // Update metrics: increment tasksAssigned for the volunteer
    try {
      const metrics = await getMetricsByUserId(volunteerId);
      if (!metrics) {
        const metricsId = new mongoose.Types.ObjectId().toHexString();
        await createMetrics({
          metricsId,
          userId: volunteerId,
          userType: "Volunteer",
          tasksAssigned: 1,
        });
      } else {
        await updateMetrics(volunteerId, {
          tasksAssigned: (metrics.tasksAssigned || 0) + 1,
        });
      }
    } catch (err) {
      console.error("METRICS UPDATE ERROR (assign distribution):", err);
    }

    const updatedDonation = await Donation.findOneAndUpdate(
      { donationId: donationId },
      {
        status: "assignedForDistribution",
        dropoffLocation: {
          type: "Point",
          coordinates: dropoffOrganization.coordinates,
        },
        dropoffAddress: dropoffOrganization.address,
      },
      { new: true }
    );

    res.json({
      message: "Distribution task assigned successfully.",
      donation: updatedDonation,
      task,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to assign distribution task." });
  }
});

/**
 * PUT /api/donations/:taskId/status
 * Volunteer-only: update status of a task they are assigned to
 * (enRoute, completed, cancelled, failed).
 * Also syncs the related Donation's status when appropriate.
 */ router.put("/:taskId/status", async (req, res) => {
  if (!isVolunteer(req, res)) return;

  const { taskId } = req.params;
  const { status } = req.body;
  const volunteerId = req.user.uid;

  // Only allow specific status transitions

  if (
    !status ||
    !["enRoute", "completed", "cancelled", "failed"].includes(status)
  ) {
    return res.status(400).json({ message: "Invalid or missing new status." });
  }

  try {
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(403).json({ message: "Forbidden. Task not found." });
    }

    // Ensure this task belongs to the logged-in volunteer

    if (task.volunteerId !== volunteerId) {
      return res
        .status(403)
        .json({ message: "Forbidden. You are not assigned to this task." });
    }

    // If an issue is reported, prevent further status updates by volunteer

    if (task.issueReported || task.status === "pending_review") {
      return res.status(400).json({
        message:
          "Task is under Admin review (issue reported) and cannot have its status changed.",
      });
    }

    let updateData = { status };
    if (status === "completed") {
      updateData.completedAt = new Date();
    } else if (status === "enRoute") {
      updateData.startedAt = new Date();
    }

    // Build status update payload

    const updatedTask = await Task.findByIdAndUpdate(taskId, updateData, {
      new: true,
    });

    // Keep related Donation in sync with task completion

    const donation = await Donation.findOne({ donationId: task.donationId });
    if (donation) {
      let donationUpdate = {};
      if (task.taskType === "collection" && status === "completed") {
        donationUpdate.status = "collected";
        donationUpdate.collectedAt = new Date();
        donationUpdate.collectedByVolunteerId = volunteerId;
      } else if (task.taskType === "distribution" && status === "completed") {
        donationUpdate.status = "delivered";
        donationUpdate.deliveredAt = new Date();
        donationUpdate.distributionVolunteerId = volunteerId;
      }

      if (Object.keys(donationUpdate).length > 0) {
        await Donation.findOneAndUpdate(
          { donationId: task.donationId },
          donationUpdate
        );
      }
    }

    // Update metrics when a task is completed
    try {
      if (status === "completed") {
        const metrics = await getMetricsByUserId(volunteerId);
        if (!metrics) {
          const metricsId = new mongoose.Types.ObjectId().toHexString();
          const base = {
            metricsId,
            userId: volunteerId,
            userType: "Volunteer",
            tasksCompleted: 1,
          };
          if (task.taskType === "collection") base.donationsCollected = 1;
          if (task.taskType === "distribution") base.donationsDelivered = 1;
          await createMetrics(base);
        } else {
          const updateData = {
            tasksCompleted: (metrics.tasksCompleted || 0) + 1,
          };
          if (task.taskType === "collection") {
            updateData.donationsCollected =
              (metrics.donationsCollected || 0) + 1;
          }
          if (task.taskType === "distribution") {
            updateData.donationsDelivered =
              (metrics.donationsDelivered || 0) + 1;
          }
          await updateMetrics(volunteerId, updateData);
        }
      }
    } catch (err) {
      console.error("METRICS UPDATE ERROR (task complete):", err);
    }

    res.json({
      message: `Task status updated to ${status}`,
      task: updatedTask,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update task status." });
  }
});

/**
 * GET /api/donations/metrics
 * Admin-only: aggregate platform-wide stats used for the Admin Dashboard
 * (total donations, tasks completed, in-transit, monthly breakdown, etc.)
 */ router.get("/metrics", async (req, res) => {
  if (!isAdmin(req, res)) return;

  try {
    const totalDonations = await Donation.countDocuments();
    const tasksCompleted = await Task.countDocuments({
      taskType: "distribution",
      status: "completed",
    });
    const tasksInTransit = await Task.countDocuments({
      status: { $in: ["assigned", "enRoute"] },
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

/**
 * GET /api/donations/admin/orphaned-tasks
 * Admin-only: debugging endpoint to detect tasks whose donation no longer exists.
 */
router.get("/admin/orphaned-tasks", async (req, res) => {
  if (!isAdmin(req, res)) return;

  try {
    const allTasks = await Task.find();

    const allDonations = await Donation.find();
    const donationIds = new Set(allDonations.map((d) => d.donationId));

    // Orphaned = task references a donationId that does not exist in Donation collection

    const orphanedTasks = allTasks.filter((task) => {
      return task.donationId && !donationIds.has(task.donationId);
    });

    res.json({
      totalTasks: allTasks.length,
      totalDonations: allDonations.length,
      orphanedTasksCount: orphanedTasks.length,
      orphanedTasks: orphanedTasks.map((t) => ({
        taskId: t.taskId,
        donationId: t.donationId,
        volunteerId: t.volunteerId,
        status: t.status,
        createdAt: t.assignedAt,
      })),
    });
  } catch (error) {
    console.error("ORPHANED TASKS CHECK ERROR:", error);
    res.status(500).json({ message: "Failed to check orphaned tasks." });
  }
});

/**
 * GET /api/donations/:donationId
 * Fetch donation details by donationId.
 * Includes extra logging and a fallback search by MongoDB _id for debugging.
 */ router.get("/:donationId", async (req, res) => {
  const { donationId } = req.params;

  try {
    console.log("=== DONATION FETCH DEBUG ===");
    console.log("Requested donationId:", donationId);
    console.log("Type:", typeof donationId);

    // First: try to find by donationId field

    let donation = await Donation.findOne({ donationId });
    console.log("Query result by donationId:", !!donation);

    if (donation) {
      console.log("Found donation:");
      console.log("  _id:", donation._id);
      console.log("  donationId:", donation.donationId);
      console.log("  itemType:", donation.itemType);
      return res.json({ donation });
    }

    // If donationId looks like a Mongo ObjectId, try fallback by _id

    if (donationId.length === 24) {
      console.log("Trying fallback search by _id:", donationId);
      donation = await Donation.findById(donationId);
      if (donation) {
        console.log(
          "Found by _id - donationId field value is:",
          donation.donationId
        );
        return res.json({ donation });
      }
    }

    // Debug info: show sample donations if nothing was found

    const allDonations = await Donation.find().limit(5);
    console.log("Sample donations in DB:", allDonations.length);
    if (allDonations.length > 0) {
      console.log("First donation sample:", {
        _id: allDonations[0]._id,
        donationId: allDonations[0].donationId,
        donorName: allDonations[0].donorName,
      });
    }

    console.warn(`Donation not found for donationId: ${donationId}`);
    return res
      .status(404)
      .json({ message: "Donation not found.", donation: null });
  } catch (error) {
    console.error("FETCH DONATION DETAILS ERROR:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
    });
    res.status(500).json({
      message: "Failed to fetch donation details.",
      error: error.message,
    });
  }
});

// Export the router so it can be mounted under /api/donations in server.js

module.exports = router;