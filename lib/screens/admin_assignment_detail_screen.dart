import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../../models/donation_model.dart';
import '../../../models/user_model.dart';
import '../../../services/auth_service.dart';
import '../../../services/donation_service.dart';

class AdminAssignmentDetailScreen extends StatefulWidget {
  final DonationModel donation;
  const AdminAssignmentDetailScreen({super.key, required this.donation});

  @override
  State<AdminAssignmentDetailScreen> createState() =>
      _AdminAssignmentDetailScreenState();
}

class _AdminAssignmentDetailScreenState
    extends State<AdminAssignmentDetailScreen> {
  final AuthService _authService = AuthService();
  final DonationService _donationService = DonationService();

  String? _selectedVolunteerId;
  String? _selectedVolunteerName;
  bool _isLoading = false;

  final Color _primaryGreen = const Color(0xFF228B22);
  final Color _accentGold = const Color(0xFFDAA520);

  late GoogleMapController mapController;
  late final LatLng _pickupLatLng;
  late final Set<Marker> _markers;

  @override
  void initState() {
    super.initState();
    final pickupGeo = widget.donation.pickupLocation;
    _pickupLatLng = LatLng(pickupGeo.latitude, pickupGeo.longitude);

    _markers = {
      Marker(
        markerId: const MarkerId("pickupLocation"),
        position: _pickupLatLng,
        infoWindow: InfoWindow(
          title: widget.donation.donorName,
          snippet: "Pickup Location",
        ),
      ),
    };
  }

  @override
  void dispose() {
    mapController.dispose();
    super.dispose();
  }

  void _onMapCreated(GoogleMapController controller) {
    mapController = controller;
  }

  void _showSnackbar(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.red.shade700 : _primaryGreen,
        duration: const Duration(seconds: 4),
      ),
    );
  }

  Future<void> _assignCollectionTask() async {
    if (_selectedVolunteerId == null) {
      _showSnackbar(
        'Please select a volunteer before assigning the task.',
        isError: true,
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      await _donationService.updateDonationStatus(
        donationId: widget.donation.donationId,
        newStatus: DonationStatus.assignedForCollection,
        volunteerId: _selectedVolunteerId,
        isCollectionAssignment: true,
      );

      _showSnackbar(
        'Collection task successfully assigned to $_selectedVolunteerName!',
      );
      Navigator.of(context).pop();
    } catch (e) {
      _showSnackbar(
        'Assignment failed: ${e.toString().replaceFirst('Exception: ', '')}',
        isError: true,
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Widget _buildDetailRow(String title, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 140,
            child: Text(
              '$title:',
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
            ),
          ),
          Expanded(child: Text(value, style: const TextStyle(fontSize: 16))),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Assign Collection Task'),
        backgroundColor: _primaryGreen,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Location Map',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: _primaryGreen,
              ),
            ),
            const Divider(height: 20),

            Container(
              height: 250,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(15),
                border: Border.all(color: _primaryGreen.withOpacity(0.5)),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(15),
                child: GoogleMap(
                  onMapCreated: _onMapCreated,
                  initialCameraPosition: CameraPosition(
                    target: _pickupLatLng,
                    zoom: 15.0,
                  ),
                  markers: _markers,
                  myLocationEnabled: false,
                  zoomControlsEnabled: true,
                ),
              ),
            ),

            const SizedBox(height: 30),

            Text(
              'Donation Details',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: _primaryGreen,
              ),
            ),
            const Divider(height: 20),

            _buildDetailRow('Donor Name', widget.donation.donorName),
            _buildDetailRow(
              'Item & Quantity',
              '${widget.donation.itemType} (${widget.donation.quantity})',
            ),
            _buildDetailRow(
              'Posted At',
              DateFormat(
                'MMM d, h:mm a',
              ).format(widget.donation.postedAt.toDate()),
            ),
            _buildDetailRow('Pickup Address', widget.donation.pickupAddress),
            _buildDetailRow(
              'Available From',
              DateFormat(
                'MMM d, h:mm a',
              ).format(widget.donation.availabilityTime.toDate()),
            ),
            _buildDetailRow('Notes', widget.donation.notes ?? 'N/A'),

            const SizedBox(height: 30),

            Text(
              'Select Volunteer',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: _primaryGreen,
              ),
            ),
            const Divider(height: 20),

            StreamBuilder<List<UserModel>>(
              stream: _authService.streamVolunteers(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return Center(
                    child: Text('Error loading volunteers: ${snapshot.error}'),
                  );
                }
                final volunteers = snapshot.data ?? [];

                if (volunteers.isEmpty) {
                  return const Text(
                    'No active volunteers available for assignment.',
                  );
                }

                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12.0),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: _primaryGreen, width: 1.5),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      isExpanded: true,
                      hint: const Text('Choose a Volunteer'),
                      value: _selectedVolunteerId,
                      items: volunteers.map((UserModel user) {
                        return DropdownMenuItem<String>(
                          value: user.uid,
                          child: Text(user.name),
                        );
                      }).toList(),
                      onChanged: (String? newId) {
                        setState(() {
                          _selectedVolunteerId = newId;
                          _selectedVolunteerName = volunteers
                              .firstWhere((user) => user.uid == newId)
                              .name;
                        });
                      },
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 40),

            _isLoading
                ? Center(child: CircularProgressIndicator(color: _primaryGreen))
                : SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _assignCollectionTask,
                      icon: const Icon(Icons.assignment_turned_in, size: 24),
                      label: const Text(
                        'Assign Collection Task',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _accentGold,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 15),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 5,
                      ),
                    ),
                  ),
          ],
        ),
      ),
    );
  }
}
