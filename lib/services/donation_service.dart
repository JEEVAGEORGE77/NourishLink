import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/donation_model.dart';
import '../models/user_model.dart'; // NEW IMPORT
import '../services/auth_service.dart'; // NEW IMPORT

class DonationService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final String _donationsCollection = 'donations';

  final AuthService _authService = AuthService(); // NEW INSTANCE

  String get newDonationId =>
      _firestore.collection(_donationsCollection).doc().id;

  Stream<List<DonationModel>> streamPendingAssignments() {
    return _firestore
        .collection(_donationsCollection)
        .where(
          'status',
          isEqualTo: DonationStatus.pendingAssignment
              .toString()
              .split('.')
              .last,
        )
        .orderBy('postedAt', descending: true)
        .snapshots()
        .map(
          (snapshot) => snapshot.docs
              .map((doc) => DonationModel.fromMap(doc.data()))
              .toList(),
        );
  }

  Stream<List<DonationModel>> streamActiveVolunteerTasks(String volunteerId) {
    return _firestore
        .collection(_donationsCollection)
        .where(
          'status',
          isNotEqualTo: DonationStatus.delivered.toString().split('.').last,
        )
        .where(
          'status',
          isNotEqualTo: DonationStatus.issueReported.toString().split('.').last,
        )
        .where('collectionVolunteerId', isEqualTo: volunteerId)
        .orderBy('postedAt', descending: true)
        .snapshots()
        .map(
          (snapshot) => snapshot.docs
              .map((doc) => DonationModel.fromMap(doc.data()))
              .toList(),
        );
  }

  Future<void> postNewDonation({
    required String itemType,
    required String quantity,
    required String pickupAddress,
    required GeoPoint pickupLocation,
    required Timestamp availabilityTime,
    String? notes,
  }) async {
    final docId = newDonationId;
    final userId = _authService.currentUserId;

    // FETCH: Get the current user's details from the 'users' collection
    final userDoc = await _firestore.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw Exception("Donor user data not found.");
    }

    final donorData = UserModel.fromMap(userDoc.data()!);
    final donorName = donorData.name; // Use the actual name

    final donation = DonationModel(
      donationId: docId,
      donorId: userId,
      donorName: donorName, // Use fetched name
      itemType: itemType,
      quantity: quantity,
      notes: notes,
      status: DonationStatus.pendingAssignment,
      pickupLocation: pickupLocation,
      pickupAddress: pickupAddress,
      availabilityTime: availabilityTime,
      postedAt: Timestamp.now(),
    );

    await _firestore
        .collection(_donationsCollection)
        .doc(docId)
        .set(donation.toMap());
  }

  Future<void> updateDonationStatus({
    required String donationId,
    required DonationStatus newStatus,
    String? volunteerId,
    bool isCollectionAssignment = false,
  }) async {
    Map<String, dynamic> updateData = {
      'status': newStatus.toString().split('.').last,
    };

    if (newStatus == DonationStatus.assignedForCollection &&
        volunteerId != null) {
      updateData['collectionVolunteerId'] = volunteerId;
      updateData['distributionVolunteerId'] = null;
    } else if (newStatus == DonationStatus.collected) {
      updateData['collectedAt'] = Timestamp.now();
      updateData['collectionVolunteerId'] = null;
    } else if (newStatus == DonationStatus.delivered) {
      updateData['deliveredAt'] = Timestamp.now();
      updateData['collectionVolunteerId'] = null;
      updateData['distributionVolunteerId'] = null;
    }

    await _firestore
        .collection(_donationsCollection)
        .doc(donationId)
        .update(updateData);
  }
}
