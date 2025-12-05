import axios from "axios";
import { getAuth } from "firebase/auth";

// Radius of the Earth in kilometers (used in distance calculation)
const R = 6371;

// Haversine formula to calculate distance between two [lng, lat] coordinates in km.
// Used to sort volunteers by how close they live to a pickup location.
const calculateDistance = (coord1, coord2) => {
  const dLat = (coord2[1] - coord1[1]) * (Math.PI / 180);
  const dLon = (coord2[0] - coord1[0]) * (Math.PI / 180);
  const lat1 = coord1[1] * (Math.PI / 180);
  const lat2 = coord2[1] * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Helper: get the current user's Firebase ID token to call protected backend APIs.
// Throws an error if the user is not logged in.
const getAuthToken = async () => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated.");
  }
  return await user.getIdToken();
};

// Get high-level dashboard metrics for admin/donor views.
const getMetrics = async () => {
  const token = await getAuthToken();
  try {
    const response = await axios.get("/api/donations/metrics", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch dashboard metrics."
    );
  }
};

// Create a new donation from donor input (item, quantity, location, etc.)
const postNewDonation = async (donationData) => {
  const token = await getAuthToken();
  try {
    const response = await axios.post("/api/donations/post", donationData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to post donation."
    );
  }
};

// Fetch list of distribution locations where donations can be delivered.
const getDistributionLocations = async () => {
  try {
    const response = await axios.get("/api/donations/distribution-locations", {
      headers: { Authorization: `Bearer ${await getAuthToken()}` },
    });
    return response.data.locations || [];
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch distribution locations."
    );
  }
};

// Donor: get history of all donations made by the currently logged-in donor.
const getDonorDonationHistory = async () => {
  const token = await getAuthToken();
  const uid = getAuth().currentUser.uid;
  try {
    const response = await axios.get(`/api/donations/donor/${uid}/history`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.donations || [];
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch donation history."
    );
  }
};

// Donor: fetch notification items related to a specific donor (status updates, etc.).
const getDonorNotifications = async (donorId) => {
  const token = await getAuthToken();
  try {
    const response = await axios.get(
      `/api/donations/donor/${donorId}/notifications`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data.notifications;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch donor notifications."
    );
  }
};

// Admin: load all pending donation/assignment requests that need review.
const getPendingAssignments = async () => {
  const token = await getAuthToken();
  try {
    const response = await axios.get("/api/donations/pending", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.donations || [];
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch pending requests."
    );
  }
};

// Admin: get list of tasks/donations where volunteers have reported issues.
const getReportedIssues = async () => {
  const token = await getAuthToken();
  try {
    const response = await axios.get("/api/donations/reported-issues", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data || [];
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch reported issues."
    );
  }
};

// Admin: fetch volunteers, and optionally sort them by how close they are to the pickup location.
const getVolunteers = async (pickupCoords) => {
  const token = await getAuthToken();
  try {
    const response = await axios.get("/api/donations/volunteers", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const volunteers = response.data.volunteers || [];

    // If pickup coordinates provided, compute distance and sort
    if (pickupCoords && pickupCoords.length === 2) {
      const volunteersWithDistance = volunteers
        .map((v) => {
          if (v.homeLocation && v.homeLocation.coordinates) {
            const distKm = calculateDistance(
              v.homeLocation.coordinates,
              pickupCoords
            );
            return { ...v, distanceKm: distKm };
          }
          // Volunteers with no location are sent to the bottom
          return { ...v, distanceKm: Infinity };
        })
        .sort((a, b) => a.distanceKm - b.distanceKm);

      return volunteersWithDistance;
    }

    return volunteers;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to load volunteer list."
    );
  }
};

// Admin: load all users in the system (donors, volunteers, admins).
const getAllUsers = async () => {
  const token = await getAuthToken();
  try {
    const response = await axios.get("/api/users", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.users || [];
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch user list."
    );
  }
};

// Admin: update a user (e.g. role changes, deactivation, etc.).
const updateUser = async (uid, updateData) => {
  const token = await getAuthToken();
  try {
    const response = await axios.put(`/api/users/${uid}`, updateData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.user;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to update user.");
  }
};

// Admin: assign a collection task (picking up donation) to a volunteer.
const assignCollectionTask = async (donationId, volunteerId) => {
  const token = await getAuthToken();
  try {
    const response = await axios.put(
      `/api/donations/assign-collection-task/${donationId}`,
      { volunteerId },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Assignment failed.");
  }
};

// Admin: assign a distribution task (drop off donation) to a volunteer and location.
const assignDistributionTask = async (donationId, volunteerId, locationId) => {
  const token = await getAuthToken();
  try {
    const response = await axios.put(
      `/api/donations/assign-distribution-task/${donationId}`,
      { volunteerId, locationId },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Distribution assignment failed."
    );
  }
};

// Volunteer: report a problem with a task (e.g. donor unavailable, address incorrect).
const reportTaskIssue = async (taskId, issueNotes) => {
  const token = await getAuthToken();
  try {
    const response = await axios.put(
      `/api/donations/report-issue/${taskId}`,
      { issueNotes },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to report issue.");
  }
};

// Admin: assign the reported task to a different volunteer.
const reassignTask = async (taskId, newVolunteerId) => {
  const token = await getAuthToken();
  try {
    const response = await axios.put(
      `/api/donations/reassign-task/${taskId}`,
      { newVolunteerId },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to reassign task."
    );
  }
};

// Volunteer: fetch tasks that are currently active for a specific volunteer.
const getActiveVolunteerTasks = async (volunteerId) => {
  const token = await getAuthToken();
  try {
    const response = await axios.get(
      `/api/donations/volunteer/${volunteerId}/active-tasks`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data.tasks || [];
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch active tasks."
    );
  }
};

// Volunteer: get summary stats such as completed tasks, active task, etc.
const getVolunteerStats = async (volunteerId) => {
  const token = await getAuthToken();
  try {
    const response = await axios.get(
      `/api/donations/volunteer/${volunteerId}/stats`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch volunteer stats."
    );
  }
};

// Volunteer: history of all tasks the volunteer has worked on.
const getVolunteerTaskHistory = async () => {
  const token = await getAuthToken();
  const uid = getAuth().currentUser.uid;
  try {
    const response = await axios.get(
      `/api/donations/volunteer/${uid}/all-tasks`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data.tasks || [];
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch volunteer task history."
    );
  }
};

// Update status of a task (new task-based tracking system).
const updateTaskStatus = async (taskId, status) => {
  const token = await getAuthToken();

  const payload = {
    taskId,
    status,
  };

  try {
    const response = await axios.put(
      `/api/donations/${taskId}/status`,
      payload,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to update task status."
    );
  }
};

// Legacy method: update donation status directly (kept for backwards compatibility).
const updateDonationStatus = async (
  donationId,
  status,
  issueNotes = null,
  reportingVolunteerId = null
) => {
  const token = await getAuthToken();

  const payload = {
    status,
    issueNotes,
    reportingVolunteerId,
  };

  try {
    const response = await axios.put(
      `/api/donations/${donationId}/status`,
      payload,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to update status."
    );
  }
};

// Legacy method: clear issue flag on a donation (old model before task-based issues).
const clearIssue = async (donationId, newStatus) => {
  const token = await getAuthToken();
  try {
    const response = await axios.put(
      `/api/donations/${donationId}`,
      { status: newStatus },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to clear issue.");
  }
};

// Fetch full profile details of a specific volunteer by ID.
const getVolunteerDetails = async (volunteerId) => {
  const token = await getAuthToken();
  try {
    const response = await axios.get(`/api/users/${volunteerId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to fetch assigned volunteer details."
    );
  }
};

// Fetch a single donation document with all its details.
const getDonationDetails = async (donationId) => {
  const token = await getAuthToken();
  try {
    const response = await axios.get(`/api/donations/${donationId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch donation details."
    );
  }
};

// Export all donation-related service functions for use in components and dashboards.
export const donationService = {
  getMetrics,
  postNewDonation,
  getDonorDonationHistory,
  getDonorNotifications,
  getPendingAssignments,
  getReportedIssues,
  getVolunteers,
  getAllUsers,
  updateUser,
  assignCollectionTask,
  getActiveVolunteerTasks,
  getVolunteerStats,
  getVolunteerTaskHistory,
  updateDonationStatus,
  updateTaskStatus,
  reportTaskIssue,
  reassignTask,
  getVolunteerDetails,
  getDonationDetails,
  getDistributionLocations,
  assignDistributionTask,
  clearIssue,
};
