import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:geocoding/geocoding.dart';
import '../../services/donation_service.dart';
import 'package:flutter/services.dart';

class DonationPostScreen extends StatefulWidget {
  const DonationPostScreen({super.key});

  @override
  State<DonationPostScreen> createState() => _DonationPostScreenState();
}

class _DonationPostScreenState extends State<DonationPostScreen> {
  final _formKey = GlobalKey<FormState>();
  final DonationService _donationService = DonationService();

  String _itemType = 'Prepared Food';
  String _quantity = '';
  String _notes = '';
  DateTime? _selectedDate;
  TimeOfDay? _selectedTime;

  GeoPoint? _pickupLocation;
  String _pickupAddress = '';
  bool _isLocating = false;
  bool _isPosting = false;

  final List<String> _itemTypes = [
    'Prepared Food',
    'Non-Perishables',
    'Produce',
    'Money/Gift Card',
    'Other Item',
  ];

  final Color _primaryGreen = const Color(0xFF228B22);
  final Color _accentGold = const Color(0xFFDAA520);

  @override
  void initState() {
    super.initState();
    _getLocation();
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

  Future<void> _selectDateTime(BuildContext context) async {
    final DateTime? pickedDate = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime(2028),
    );

    if (pickedDate != null) {
      final TimeOfDay? pickedTime = await showTimePicker(
        context: context,
        initialTime: TimeOfDay.now(),
      );

      if (pickedTime != null) {
        setState(() {
          _selectedDate = pickedDate;
          _selectedTime = pickedTime;
        });
      }
    }
  }

  Future<void> _getLocation() async {
    setState(() {
      _isLocating = true;
      _pickupLocation = null;
      _pickupAddress = 'Fetching location...';
    });

    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied ||
            permission == LocationPermission.deniedForever) {
          throw Exception("Location permissions denied.");
        }
      }

      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      List<Placemark> placemarks = await placemarkFromCoordinates(
        position.latitude,
        position.longitude,
      );

      String displayAddress = 'Location not found.';
      if (placemarks.isNotEmpty) {
        final place = placemarks.first;
        displayAddress = [
          place.street,
          place.locality,
          place.country,
        ].where((e) => e != null && e.isNotEmpty).join(', ');
      }

      setState(() {
        _pickupLocation = GeoPoint(position.latitude, position.longitude);
        _pickupAddress = displayAddress;
      });
      _showSnackbar('Location captured successfully!');
    } catch (e) {
      _showSnackbar(
        'Could not get location. Enter address manually. Error: $e',
        isError: true,
      );
      setState(() {
        _pickupAddress = '';
      });
    } finally {
      setState(() {
        _isLocating = false;
      });
    }
  }

  Future<void> _postDonation() async {
    final isValid = _formKey.currentState!.validate();
    FocusScope.of(context).unfocus();

    if (isValid && _pickupLocation != null && _pickupAddress.isNotEmpty) {
      _formKey.currentState!.save();
      setState(() {
        _isPosting = true;
      });

      final availabilityDateTime = DateTime(
        _selectedDate!.year,
        _selectedDate!.month,
        _selectedDate!.day,
        _selectedTime!.hour,
        _selectedTime!.minute,
      );
      final availabilityTimestamp = Timestamp.fromDate(availabilityDateTime);

      try {
        await _donationService.postNewDonation(
          itemType: _itemType,
          quantity: _quantity,
          pickupAddress: _pickupAddress,
          pickupLocation: _pickupLocation!,
          availabilityTime: availabilityTimestamp,
          notes: _notes.isNotEmpty ? _notes : null,
        );

        _showSnackbar('Donation Posted! Awaiting Volunteer Assignment.');
        Navigator.of(context).pop();
      } catch (e) {
        _showSnackbar(
          'Failed to post donation. ${e.toString().replaceFirst('Exception: ', '')}',
          isError: true,
        );
      } finally {
        setState(() {
          _isPosting = false;
        });
      }
    } else if (_pickupLocation == null || _pickupAddress.isEmpty) {
      _showSnackbar(
        'Please capture a valid pickup location and address.',
        isError: true,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    String formattedDateTime = _selectedDate == null || _selectedTime == null
        ? 'Select Date & Time'
        : '${_selectedDate!.month}/${_selectedDate!.day}/${_selectedDate!.year} at ${_selectedTime!.format(context)}';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Post New Donation'),
        backgroundColor: _primaryGreen,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Donation Details',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: _primaryGreen,
                ),
              ),
              const Divider(),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                decoration: InputDecoration(
                  labelText: 'Item Type',
                  prefixIcon: Icon(Icons.restaurant_menu, color: _accentGold),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                value: _itemType,
                items: _itemTypes.map((String value) {
                  return DropdownMenuItem<String>(
                    value: value,
                    child: Text(value),
                  );
                }).toList(),
                onChanged: (String? newValue) {
                  setState(() {
                    _itemType = newValue!;
                  });
                },
              ),
              const SizedBox(height: 15),
              TextFormField(
                decoration: InputDecoration(
                  labelText: 'Quantity (e.g., 50 lbs, 3 boxes)',
                  prefixIcon: Icon(Icons.inventory_2, color: _accentGold),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                keyboardType: TextInputType.text,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Please enter the quantity of the donation.';
                  }
                  return null;
                },
                onSaved: (value) {
                  _quantity = value!;
                },
              ),
              const SizedBox(height: 15),
              TextFormField(
                decoration: InputDecoration(
                  labelText: 'Special Notes / Instructions (Optional)',
                  prefixIcon: Icon(Icons.notes, color: _accentGold),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                maxLines: 3,
                keyboardType: TextInputType.multiline,
                onSaved: (value) {
                  _notes = value ?? '';
                },
              ),
              const SizedBox(height: 30),
              Text(
                'Pickup Details',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: _primaryGreen,
                ),
              ),
              const Divider(),
              const SizedBox(height: 10),
              OutlinedButton.icon(
                onPressed: () => _selectDateTime(context),
                icon: Icon(Icons.schedule, color: _accentGold),
                label: Text(
                  formattedDateTime,
                  style: TextStyle(color: _primaryGreen),
                ),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 50),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  side: BorderSide(color: _primaryGreen),
                ),
              ),
              if (_selectedDate == null || _selectedTime == null)
                Padding(
                  padding: const EdgeInsets.only(top: 8.0),
                  child: Text(
                    'Please select a date and time.',
                    style: TextStyle(color: Colors.red[700], fontSize: 12),
                  ),
                ),
              const SizedBox(height: 15),
              ElevatedButton.icon(
                onPressed: _isLocating ? null : _getLocation,
                icon: _isLocating
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            Colors.white,
                          ),
                        ),
                      )
                    : Icon(Icons.gps_fixed, color: _primaryGreen),
                label: Text(
                  _isLocating
                      ? 'Capturing Location...'
                      : 'Capture Current Location (GPS)',
                  style: TextStyle(color: _primaryGreen),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _accentGold.withOpacity(0.1),
                  foregroundColor: _primaryGreen,
                  minimumSize: const Size(double.infinity, 50),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  elevation: 0,
                  side: BorderSide(color: _primaryGreen.withOpacity(0.5)),
                ),
              ),
              const SizedBox(height: 10),
              Text(
                'Pickup Coordinates:',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Colors.grey[700],
                ),
              ),
              Text(
                _pickupLocation == null ? 'Location not set.' : _pickupAddress,
                style: TextStyle(
                  color: _pickupLocation != null ? _primaryGreen : Colors.red,
                ),
              ),
              const SizedBox(height: 40),
              _isPosting
                  ? Center(
                      child: CircularProgressIndicator(color: _primaryGreen),
                    )
                  : ElevatedButton.icon(
                      onPressed:
                          (_selectedDate != null &&
                              _selectedTime != null &&
                              _pickupLocation != null)
                          ? _postDonation
                          : null,
                      icon: const Icon(Icons.send, size: 24),
                      label: const Text(
                        'Post Donation',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _primaryGreen,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 15),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 5,
                      ),
                    ),
            ],
          ),
        ),
      ),
    );
  }
}
