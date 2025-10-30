import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';

class FirebaseService {
  static Future<void> initializeFirebase() async {
    try {
      WidgetsFlutterBinding.ensureInitialized();
      await Firebase.initializeApp();
      print("Firebase initialized successfully!");
    } catch (e) {
      print("Error initializing Firebase: $e");
    }
  }
}
