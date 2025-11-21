import axios from "axios";
import { getAuth } from "firebase/auth";

const R = 6371;

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

// Helper to get auth token
const getAuthToken = async () => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated.");
  }
  return await user.getIdToken();
};

// Service methods
const getMetrics = async () => {
  const token = await getAuthToken();
  try {
    const response = await axios.get("/api/admin/metrics", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch dashboard metrics."
    );
  }
};

// Post a new donation
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

// Fetch distribution locations
const getDistributionLocations = async () => {
  try {
    const response = await axios.get("/api/admin/distribution-locations", {
      headers: { Authorization: `Bearer ${await getAuthToken()}` },
    });
    return response.data.locations || [];
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch distribution locations."
    );
  }
};

// Fetch donor donation history
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

// Fetch pending assignment requests
const getPendingAssignments = async () => {
  const token = await getAuthToken();
  try {
    const response = await axios.get("/api/admin/pending", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.donations || [];
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch pending requests."
    );
  }
};

// Fetch volunteers with optional distance calculation
const getVolunteers = async (pickupCoords) => {
  const token = await getAuthToken();
  try {
    const response = await axios.get("/api/admin/volunteers", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const volunteers = response.data.volunteers || [];

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

// Assign collection task to volunteer
const assignCollectionTask = async (donationId, volunteerId) => {
  const token = await getAuthToken();
  try {
    const response = await axios.put(
      `/api/admin/assign-collection-task/${donationId}`,
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

// Fetch active tasks for a volunteer
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

// Update donation status
const updateDonationStatus = async (donationId, status) => {
  const token = await getAuthToken();
  try {
    const response = await axios.put(
      `/api/donations/${donationId}/status`,
      { status },
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

// Assign distribution task to location
const assignDistributionTask = async (donationId, locationId) => {
  const token = await getAuthToken();
  try {
    const response = await axios.put(
      `/api/admin/assign-distribution-task/${donationId}`,
      { locationId },
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

export const donationService = {
  getMetrics,
  postNewDonation,
  getDonorDonationHistory,
  getPendingAssignments,
  getVolunteers,
  assignCollectionTask,
  getActiveVolunteerTasks,
  updateDonationStatus,
  getVolunteerDetails,
  getDistributionLocations,
  assignDistributionTask,
};
