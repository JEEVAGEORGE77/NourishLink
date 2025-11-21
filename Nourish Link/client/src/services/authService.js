import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
} from "firebase/auth";
import axios from "axios";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const authService = {
  getAuthInstance: () => auth,
  signIn: async ({ email, password }) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  },

  signUp: async ({ email, password, name, role, phone, homeLocation }) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;
    const token = await user.getIdToken();

    const userData = {
      uid: user.uid,
      email: user.email,
      name,
      role,
      phone: phone || null,
      homeLocation: homeLocation || null,
    };

    await axios.post("/api/users/register", userData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return user;
  },

  signOut: async () => {
    return fbSignOut(auth);
  },
  onAuthStateChanged: (cb) => {
    return fbOnAuthStateChanged(auth, cb);
  },
  getIdToken: async () => {
    const user = auth.currentUser;
    if (!user) return null;
    return user.getIdToken();
  },
};

export { authService };
