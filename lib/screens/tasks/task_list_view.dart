import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../models/donation_model.dart';
import 'task_detail_screen.dart';
import '../../services/donation_service.dart';
import '../../services/auth_service.dart';

class TaskListView extends StatelessWidget {
  final String userName;
  TaskListView({super.key, required this.userName});

  final Color _primaryGreen = const Color(0xFF228B22);
  final Color _accentGold = const Color(0xFFDAA520);
  final DonationService _donationService = DonationService();

  @override
  Widget build(BuildContext context) {
    final String volunteerId = AuthService().currentUserId;

    return Padding(
      padding: const EdgeInsets.only(top: 10.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: Text(
              'Your Active Tasks',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w900,
                color: _primaryGreen,
              ),
            ),
          ),
          const Divider(height: 20),
          Expanded(
            child: StreamBuilder<List<DonationModel>>(
              stream: _donationService.streamActiveVolunteerTasks(volunteerId),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return Center(
                    child: CircularProgressIndicator(color: _accentGold),
                  );
                }
                if (snapshot.hasError) {
                  return Center(
                    child: Text('Error loading tasks: ${snapshot.error}'),
                  );
                }

                final tasks = snapshot.data ?? [];

                if (tasks.isEmpty) {
                  return const Center(
                    child: Text(
                      'No active tasks currently assigned. Time for a break!',
                      textAlign: TextAlign.center,
                    ),
                  );
                }

                return ListView.builder(
                  itemCount: tasks.length,
                  itemBuilder: (context, index) {
                    final task = tasks[index];

                    String action;
                    IconData icon;
                    Color color;

                    final isCollectionTask =
                        task.collectionVolunteerId == volunteerId;

                    if (isCollectionTask) {
                      action = 'COLLECTION PENDING';
                      icon = Icons.shopping_bag;
                      color = _accentGold;
                    } else {
                      action = 'DISTRIBUTION PENDING';
                      icon = Icons.delivery_dining;
                      color = _primaryGreen;
                    }

                    return Card(
                      margin: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      elevation: 5,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(15),
                      ),
                      child: ListTile(
                        contentPadding: const EdgeInsets.all(12),
                        leading: CircleAvatar(
                          backgroundColor: color.withOpacity(0.1),
                          child: Icon(icon, color: color),
                        ),
                        title: Text(
                          '${task.itemType} (${task.quantity})',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        subtitle: Text(
                          'Status: $action\nFrom: ${task.donorName}',
                        ),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (context) =>
                                  TaskDetailScreen(task: task),
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
