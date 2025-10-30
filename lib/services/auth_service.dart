import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';

// import 'package:nourish_link/models/user_model.dart';
class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // Collection reference for storing custom user data (profiles)
  final String _usersCollectionPath = 'users';

  // --- SIGN UP METHOD ---
  Future<void> signUp({
    required String email,
    required String password,
    required String name,
    required String role,
  }) async {
    try {
      // 1. Create user in Firebase Authentication
      UserCredential userCredential = await _auth
          .createUserWithEmailAndPassword(email: email, password: password);

      final user = userCredential.user;
      if (user != null) {
        // 2. Store user role and name in Firestore
        await _firestore.collection(_usersCollectionPath).doc(user.uid).set({
          'uid': user.uid,
          'email': email,
          'name': name,
          'role': role, // Donor, Volunteer, or Admin
          'createdAt': Timestamp.now(),
          'status': 'active', // For volunteer screening later
        });
        debugPrint('New user registered successfully with role: $role');
      }
    } on FirebaseAuthException catch (e) {
      // Handle Firebase specific errors (e.g., weak-password, email-already-in-use)
      throw Exception(e.message ?? 'An unknown authentication error occurred.');
    } catch (e) {
      // Handle other general errors (e.g., Firestore write errors)
      debugPrint('Error during sign up: $e');
      throw Exception('Failed to sign up. Please try again.');
    }
  }

  // --- SIGN IN METHOD ---
  Future<void> signIn({required String email, required String password}) async {
    try {
      await _auth.signInWithEmailAndPassword(email: email, password: password);
      debugPrint('User signed in successfully.');
    } on FirebaseAuthException catch (e) {
      // Handle Firebase specific errors (e.g., wrong-password, user-not-found)
      throw Exception(e.message ?? 'Invalid credentials or user not found.');
    } catch (e) {
      debugPrint('Error during sign in: $e');
      throw Exception('Failed to sign in. Please try again.');
    }
  }

  // --- SIGN OUT METHOD ---
  Future<void> signOut() async {
    try {
      await _auth.signOut();
      debugPrint('User signed out successfully.');
    } catch (e) {
      debugPrint('Error during sign out: $e');
      throw Exception('Error signing out.');
    }
  }

  // --- USER STREAM ---
  // A stream to listen to changes in the user's authentication state (logged in/out)
  Stream<User?> get userChanges => _auth.authStateChanges();
}
