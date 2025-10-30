import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import '../models/user_model.dart';

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  final String _usersCollectionPath = 'users';

  String get currentUserId {
    return _auth.currentUser?.uid ?? '';
  }

  // --- NEW: Stream all active Volunteers for Admin Assignment ---
  Stream<List<UserModel>> streamVolunteers() {
    return _firestore
        .collection(_usersCollectionPath)
        .where('role', isEqualTo: 'Volunteer')
        .where('status', isEqualTo: 'active')
        .snapshots()
        .map(
          (snapshot) => snapshot.docs
              .map((doc) => UserModel.fromMap(doc.data()))
              .toList(),
        );
  }

  // --- SIGN UP METHOD ---
  Future<void> signUp({
    required String email,
    required String password,
    required String name,
    required String role,
  }) async {
    try {
      UserCredential userCredential = await _auth
          .createUserWithEmailAndPassword(email: email, password: password);

      final user = userCredential.user;
      if (user != null) {
        UserModel newUser = UserModel(
          uid: user.uid,
          email: email,
          name: name,
          role: role,
          status: 'active',
          createdAt: Timestamp.now(),
        );

        await _firestore
            .collection(_usersCollectionPath)
            .doc(user.uid)
            .set(newUser.toMap());
      }
    } on FirebaseAuthException catch (e) {
      throw Exception(e.message ?? 'An unknown authentication error occurred.');
    } catch (e) {
      debugPrint('Error during sign up: $e');
      throw Exception('Failed to sign up. Please try again.');
    }
  }

  // --- SIGN IN METHOD ---
  Future<void> signIn({required String email, required String password}) async {
    try {
      await _auth.signInWithEmailAndPassword(email: email, password: password);
    } on FirebaseAuthException catch (e) {
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
    } catch (e) {
      debugPrint('Error during sign out: $e');
      throw Exception('Error signing out.');
    }
  }

  // --- USER STREAM ---
  Stream<User?> get userChanges => _auth.authStateChanges();
}
