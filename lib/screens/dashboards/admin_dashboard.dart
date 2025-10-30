import 'package:flutter/material.dart';
import '../../../services/auth_service.dart';

class AdminDashboard extends StatelessWidget {
  final String userName;
  const AdminDashboard({super.key, required this.userName});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin Dashboard'),
        backgroundColor: const Color(0xFF228B22),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => AuthService().signOut(),
          ),
        ],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Welcome, $userName (Admin)!',
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 20),
            const Text(
              'Your core task is to manage assignments and system oversight.',
            ),
            ElevatedButton.icon(
              onPressed: () {
                // TODO: Navigate to Assignment Management Screen
              },
              icon: const Icon(Icons.assignment_ind, size: 30),
              label: const Text(
                'Manage Assignments',
                style: TextStyle(fontSize: 18),
              ),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(
                  horizontal: 30,
                  vertical: 15,
                ),
                backgroundColor: const Color(0xFFDAA520),
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
