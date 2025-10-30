import 'package:flutter/material.dart';
import 'package:nourish_link/screens/admin_assignment_detail_screen.dart';
import '../../../services/auth_service.dart';
import '../../../services/donation_service.dart';
import '../../../models/donation_model.dart';
import 'package:intl/intl.dart';

class AdminDashboard extends StatelessWidget {
  final String userName;
  AdminDashboard({super.key, required this.userName});

  final DonationService _donationService = DonationService();
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
        title: const Text('Admin Dashboard'),
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
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Text(
              'Hello, $userName (Admin)',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: _primaryGreen,
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: Text(
              'Pending Assignments',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Colors.grey[700],
              ),
            ),
          ),
          const Divider(height: 20),
          Expanded(
            child: StreamBuilder<List<DonationModel>>(
              stream: _donationService.streamPendingAssignments(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return Center(
                    child: CircularProgressIndicator(color: _accentGold),
                  );
                }
                if (snapshot.hasError) {
                  return Center(
                    child: Text('Error loading requests: ${snapshot.error}'),
                  );
                }
                if (!snapshot.hasData || snapshot.data!.isEmpty) {
                  return const Center(
                    child: Text(
                      'No new donations require assignment. Excellent!',
                      textAlign: TextAlign.center,
                    ),
                  );
                }

                final donations = snapshot.data!;

                return ListView.builder(
                  itemCount: donations.length,
                  itemBuilder: (context, index) {
                    final donation = donations[index];
                    return Card(
                      margin: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      elevation: 4,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                        side: BorderSide(color: _accentGold, width: 1.0),
                      ),
                      child: ListTile(
                        leading: Icon(
                          Icons.assignment_turned_in,
                          color: _primaryGreen,
                        ),
                        title: Text(
                          '${donation.itemType} (${donation.quantity})',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        subtitle: Text(
                          'From: ${donation.donorName}\nPosted: ${DateFormat('MMM d, h:mm a').format(donation.postedAt.toDate())}',
                        ),
                        trailing: Icon(
                          Icons.arrow_forward_ios,
                          color: _primaryGreen,
                        ),
                        onTap: () {
                          // FIX: Navigate to the Admin Assignment Detail Screen (UC04)
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (context) => AdminAssignmentDetailScreen(
                                donation: donation,
                              ),
                            ),
                          );
                        },
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
