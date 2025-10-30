import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:nourish_link/screens/dashboards/admin_dashboard.dart';
import 'package:nourish_link/screens/dashboards/donor_dashboard.dart';
import 'package:nourish_link/screens/dashboards/volunteer_dashboard.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';

class RoleBasedHome extends StatelessWidget {
  const RoleBasedHome({super.key});

  final Color _primaryGreen = const Color(0xFF228B22);

  Widget _buildErrorScreen(String message) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(30.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.warning_amber, color: Colors.orange, size: 60),
              const SizedBox(height: 20),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 18, color: Colors.black54),
              ),
              const SizedBox(height: 40),
              ElevatedButton.icon(
                onPressed: () async {
                  await AuthService().signOut();
                },
                icon: const Icon(Icons.exit_to_app, size: 20),
                label: const Text('Return to Login'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _primaryGreen,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 30,
                    vertical: 15,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;

    if (user == null) {
      return _buildErrorScreen('Authentication required. Please log in.');
    }

    return StreamBuilder<DocumentSnapshot>(
      stream: FirebaseFirestore.instance
          .collection('users')
          .doc(user.uid)
          .snapshots(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return Scaffold(
            body: Center(
              child: CircularProgressIndicator(color: _primaryGreen),
            ),
          );
        }

        if (snapshot.hasError) {
          return _buildErrorScreen(
            'Error loading user data: ${snapshot.error}',
          );
        }

        if (!snapshot.hasData || !snapshot.data!.exists) {
          return _buildErrorScreen(
            'Your account data is missing. Please contact support or re-register.',
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
            return _buildErrorScreen(
              'Unknown user role: "$role". Access denied.',
            );
        }
      },
    );
  }
}
