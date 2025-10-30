import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/user_model.dart';

// use the real dashboards
import 'screens/dashboards/donor_dashboard.dart';
import 'screens/dashboards/volunteer_dashboard.dart';
import 'screens/dashboards/admin_dashboard.dart';

class RoleBasedHome extends StatelessWidget {
  const RoleBasedHome({super.key});

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      return const Center(child: Text('User not authenticated.'));
    }

    return StreamBuilder<DocumentSnapshot>(
      stream: FirebaseFirestore.instance
          .collection('users')
          .doc(user.uid)
          .snapshots(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(
              child: CircularProgressIndicator(color: Color(0xFF228B22)),
            ),
          );
        }

        if (snapshot.hasError) {
          return Scaffold(
            body: Center(
              child: Text('Error loading user data: ${snapshot.error}'),
            ),
          );
        }

        if (!snapshot.hasData || !snapshot.data!.exists) {
          return const Scaffold(
            body: Center(
              child: Text('User data not found. Please log out and back in.'),
            ),
          );
        }

        final userData = UserModel.fromMap(
          snapshot.data!.data() as Map<String, dynamic>,
        );
        final role = userData.role;
        final name = userData.name;

        switch (role) {
          case 'Donor':
            return DonorDashboard(userName: name);
          case 'Volunteer':
            return VolunteerDashboard(userName: name);
          case 'Admin':
            return AdminDashboard(userName: name);
          default:
            return const Scaffold(
              body: Center(child: Text('Unknown user role. Access denied.')),
            );
        }
      },
    );
  }
}
