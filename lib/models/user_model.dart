import 'package:cloud_firestore/cloud_firestore.dart';

class UserModel {
  // Fields stored in Firebase Authentication and Firestore
  final String uid;
  final String email;
  final String name;
  final String role; // 'Donor', 'Volunteer', or 'Admin'
  final String
  status; // e.g., 'active', 'pending_verification' (for volunteers)
  final Timestamp createdAt;

  // Donor-specific fields (optional)
  final String? organizationId;
  final String? primaryLocation;

  // Volunteer-specific fields (optional)
  final int? tasksCompleted;
  final double? rating;

  UserModel({
    required this.uid,
    required this.email,
    required this.name,
    required this.role,
    required this.status,
    required this.createdAt,
    this.organizationId,
    this.primaryLocation,
    this.tasksCompleted,
    this.rating,
  });

  // Factory constructor to create a UserModel from a Firestore document
  factory UserModel.fromMap(Map<String, dynamic> data) {
    return UserModel(
      uid: data['uid'] as String,
      email: data['email'] as String,
      name: data['name'] as String,
      role: data['role'] as String,
      status: data['status'] as String? ?? 'active',
      createdAt: data['createdAt'] as Timestamp? ?? Timestamp.now(),
      organizationId: data['organizationId'] as String?,
      primaryLocation: data['primaryLocation'] as String?,
      tasksCompleted: data['tasksCompleted'] as int?,
      rating: data['rating'] is int
          ? (data['rating'] as int).toDouble()
          : data['rating'] as double?,
    );
  }

  // Method to convert the UserModel to a map for writing to Firestore
  Map<String, dynamic> toMap() {
    return {
      'uid': uid,
      'email': email,
      'name': name,
      'role': role,
      'status': status,
      'createdAt': createdAt,
      'organizationId': organizationId,
      'primaryLocation': primaryLocation,
      'tasksCompleted': tasksCompleted,
      'rating': rating,
    };
  }
}
