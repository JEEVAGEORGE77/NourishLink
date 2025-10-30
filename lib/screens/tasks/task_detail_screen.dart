import 'package:flutter/material.dart';
import '../../models/donation_model.dart';
import '../../services/donation_service.dart';

class TaskDetailScreen extends StatelessWidget {
  final DonationModel task;
  TaskDetailScreen({super.key, required this.task});

  final Color _primaryGreen = const Color(0xFF228B22);
  final Color _accentGold = const Color(0xFFDAA520);
  final DonationService _donationService = DonationService();

  String _formatStatus(DonationStatus status) {
    String name = status.toString().split('.').last;
    return name
        .replaceAllMapped(RegExp(r'([A-Z])'), (match) => ' ${match.group(0)}')
        .trim();
  }

  DonationStatus _getNextStatus(DonationStatus currentStatus) {
    switch (currentStatus) {
      case DonationStatus.assignedForCollection:
        return DonationStatus.enRouteForCollection;
      case DonationStatus.enRouteForCollection:
        return DonationStatus.collected;
      case DonationStatus.assignedForDistribution:
        return DonationStatus.enRouteForDistribution;
      case DonationStatus.enRouteForDistribution:
        return DonationStatus.delivered;
      default:
        return currentStatus;
    }
  }

  Future<void> _handleActionButton(BuildContext context) async {
    final nextStatus = _getNextStatus(task.status);
    final String statusName = _formatStatus(nextStatus);

    try {
      await _donationService.updateDonationStatus(
        donationId: task.donationId,
        newStatus: nextStatus,
      );

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Task status successfully updated to $statusName!'),
          backgroundColor: _primaryGreen,
        ),
      );
      Navigator.of(context).pop();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to update status: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _reportIssue(BuildContext context) async {
    // Show a confirmation dialog before reporting an issue
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirm Issue Report'),
        content: const Text(
          'This will mark the task as having an issue, and the Admin will be notified. Continue?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Report'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await _donationService.updateDonationStatus(
          donationId: task.donationId,
          newStatus: DonationStatus.issueReported,
        );

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Issue reported successfully. Admin notified.'),
            backgroundColor: Colors.red,
          ),
        );
        Navigator.of(context).pop();
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to report issue: ${e.toString()}'),
            backgroundColor: Colors.red.shade700,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    String currentAction =
        task.status == DonationStatus.assignedForCollection ||
            task.status == DonationStatus.enRouteForCollection
        ? 'Collection'
        : 'Distribution';

    String buttonLabel;
    IconData buttonIcon;

    if (task.status == DonationStatus.assignedForCollection) {
      buttonLabel = 'I Am En Route for Collection';
      buttonIcon = Icons.route;
    } else if (task.status == DonationStatus.enRouteForCollection) {
      buttonLabel = 'Collected Item';
      buttonIcon = Icons.check_circle;
    } else if (task.status == DonationStatus.assignedForDistribution) {
      buttonLabel = 'I Am En Route for Distribution';
      buttonIcon = Icons.route;
    } else if (task.status == DonationStatus.enRouteForDistribution) {
      buttonLabel = 'Delivered Item';
      buttonIcon = Icons.check_circle;
    } else {
      buttonLabel = 'Task Completed';
      buttonIcon = Icons.done_all;
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('$currentAction Details'),
        backgroundColor: _primaryGreen,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Card(
              color: task.status == DonationStatus.assignedForDistribution
                  ? Colors.lightBlue.shade50
                  : _accentGold.withOpacity(0.1),
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              child: Padding(
                padding: const EdgeInsets.all(15.0),
                child: Row(
                  children: [
                    Icon(Icons.access_time_filled, color: _primaryGreen),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Current Task: ${_formatStatus(task.status)}',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: _primaryGreen,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Donation Details',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: _primaryGreen,
              ),
            ),
            const Divider(),
            _buildDetailRow(Icons.restaurant, 'Item Type', task.itemType),
            _buildDetailRow(
              Icons.production_quantity_limits,
              'Quantity',
              task.quantity,
            ),
            _buildDetailRow(Icons.person, 'Donor/Source', task.donorName),
            _buildDetailRow(
              Icons.info_outline,
              'Notes',
              task.notes ?? 'None provided',
            ),
            const SizedBox(height: 20),
            Text(
              '$currentAction Location',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: _primaryGreen,
              ),
            ),
            const Divider(),
            _buildDetailRow(Icons.location_on, 'Address', task.pickupAddress),
            _buildDetailRow(
              Icons.schedule,
              'Available At',
              task.availabilityTime.toDate().toString().split('.')[0],
            ),
            const SizedBox(height: 30),
            if (task.status != DonationStatus.delivered &&
                task.status != DonationStatus.issueReported)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => _handleActionButton(context),
                  icon: Icon(buttonIcon, size: 24),
                  label: Text(
                    buttonLabel,
                    style: const TextStyle(fontSize: 18),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _primaryGreen,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 18),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
            const SizedBox(height: 10),
            if (task.status != DonationStatus.delivered &&
                task.status != DonationStatus.issueReported)
              TextButton.icon(
                onPressed: () => _reportIssue(context),
                icon: const Icon(Icons.report_problem, color: Colors.red),
                label: const Text(
                  'Report Issue',
                  style: TextStyle(color: Colors.red),
                ),
              ),
            if (task.status == DonationStatus.issueReported)
              const Center(
                child: Text(
                  'Issue reported. Awaiting Admin review.',
                  style: TextStyle(
                    color: Colors.red,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String title, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: _accentGold, size: 20),
          const SizedBox(width: 10),
          SizedBox(
            width: 120,
            child: Text(
              '$title:',
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}
