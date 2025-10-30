import 'package:flutter/material.dart';
import '../../../services/auth_service.dart';
import '../tasks/task_list_view.dart';

class VolunteerDashboard extends StatelessWidget {
  final String userName;
  const VolunteerDashboard({super.key, required this.userName});

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
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Volunteer Dashboard'),
        backgroundColor: _primaryGreen,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              final confirmed = await _confirmLogout(context);
              if (confirmed == true) {
                await AuthService().signOut();
              }
            },
          ),
        ],
      ),
      body: SafeArea(child: TaskListView(userName: userName)),
    );
  }
}
