// Import Firebase functions that help initialize the app
import { initializeApp } from "firebase/app";
// Import Firebase Authentication functions:
// getAuth → access Firebase Auth instance
// signInWithEmailAndPassword → login
// createUserWithEmailAndPassword → signup
// fbSignOut → logout
// fbOnAuthStateChanged → listen to login/logout events
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
} from "firebase/auth";

// Import axios to send requests to your Node backend (register user, etc.)
import axios from "axios";


// Firebase configuration stored in Vite environment variables.
// These values are invisible to anyone else and safe when deployed.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize the Firebase app using the config above
const app = initializeApp(firebaseConfig);
// Get the Firebase Auth instance associated with this app
const auth = getAuth(app);


// The authService object contains all authentication-related functions
// that your React app will use, such as login, signup, logout, etc.
const authService = {
  // Allows other files to access the Firebase Auth instance
  getAuthInstance: () => auth,

  // Login function using Firebase email/password authentication
  signIn: async ({ email, password }) => {
    // Firebase logs in the user and returns user credentials
    const cred = await signInWithEmailAndPassword(auth, email, password);
    // Return only the user object for convenience
    return cred.user;
  },

  // Signup function: 
  // 1) Create Firebase account
  // 2) Get Firebase token
  // 3) Send user details to backend to create MongoDB user
  signUp: async ({ email, password, name, role, phone, homeLocation }) => {
    // Create the account in Firebase Authentication
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;

    // Get the secure ID token from Firebase to authorize backend requests
    const token = await user.getIdToken();

    // The fields we want to store for the user in MongoDB
    const userData = {
      email: user.email,
      name,
      role,
      phone: phone || null,
      homeLocation: homeLocation || null,
    };

    // Send the user details to your backend (Node.js → MongoDB)
    // Authorization header contains Firebase token to verify identity
    await axios.post("/api/users/register", userData, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Return the Firebase user object
    return user;
  },

  // Logout function: removes user session from Firebase
  signOut: async () => {
    return fbSignOut(auth);
  },

  // Listener that triggers whenever the user logs in or logs out.
  // The callback receives the updated user or null.
  onAuthStateChanged: (cb) => {
    return fbOnAuthStateChanged(auth, cb);
  },

  // Returns the Firebase ID token of the currently logged-in user.
  // The backend uses this token to verify the user's identity.
  getIdToken: async () => {
    const user = auth.currentUser;
    if (!user) return null;
    return user.getIdToken();
  },
};

// Export the authService so other parts of the app can use it
export { authService };
