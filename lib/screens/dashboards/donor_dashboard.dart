import 'package:flutter/material.dart';
import '../../../services/auth_service.dart';

class DonorDashboard extends StatelessWidget {
  final String userName;
  const DonorDashboard({super.key, required this.userName});

  final Color _primaryGreen = const Color(0xFF228B22);
  final Color _accentGold = const Color(0xFFDAA520);

  Future<bool?> _confirmLogout(BuildContext context) {
    return showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirm Logout'),
        content: const Text(
          'Are you sure you want to log out of Nourish Link?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Logout'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Donor Dashboard'),
        backgroundColor: _primaryGreen,
        foregroundColor: Colors.white,
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(30.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                'Welcome, $userName!',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: _primaryGreen,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                'Ready to Connect. Collect. Care?',
                style: TextStyle(fontSize: 18, color: Colors.grey.shade700),
              ),
              const SizedBox(height: 50),

              ElevatedButton.icon(
                onPressed: () {
                  // TODO: Implement Navigation to the Donation Posting Screen
                },
                icon: const Icon(Icons.add_circle, size: 30),
                label: const Text(
                  'Post New Donation',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 40,
                    vertical: 20,
                  ),
                  backgroundColor: _accentGold,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(15),
                  ),
                  elevation: 5,
                ),
              ),
              const SizedBox(height: 30),

              TextButton.icon(
                onPressed: () {
                  // TODO: Implement Navigation to the List of Active Donations
                },
                icon: Icon(Icons.format_list_bulleted, color: _primaryGreen),
                label: Text(
                  'View My Active Donations',
                  style: TextStyle(fontSize: 16, color: _primaryGreen),
                ),
              ),
              const SizedBox(height: 50),

              ElevatedButton.icon(
                onPressed: () async {
                  final confirmed = await _confirmLogout(context);
                  if (confirmed == true) {
                    await AuthService().signOut();
                  }
                },
                icon: const Icon(Icons.logout, size: 20),
                label: const Text('Logout', style: TextStyle(fontSize: 16)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red.shade700,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 12,
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
}
