import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:geolocator/geolocator.dart';

enum DonationStatus {
  pendingAssignment,
  assignedForCollection,
  enRouteForCollection,
  collected,
  assignedForDistribution,
  enRouteForDistribution,
  delivered,
  issueReported,
}

class DonationModel {
  final String donationId;
  final String donorId;
  final String donorName;

  final String itemType;
  final String quantity;
  final String? notes;

  DonationStatus status;

  String? collectionVolunteerId;
  String? distributionVolunteerId;

  final GeoPoint pickupLocation;
  final String pickupAddress;
  final Timestamp availabilityTime;

  final Timestamp postedAt;
  Timestamp? collectedAt;
  Timestamp? deliveredAt;

  DonationModel({
    required this.donationId,
    required this.donorId,
    required this.donorName,
    required this.itemType,
    required this.quantity,
    required this.status,
    required this.pickupLocation,
    required this.pickupAddress,
    required this.availabilityTime,
    required this.postedAt,
    this.notes,
    this.collectionVolunteerId,
    this.distributionVolunteerId,
    this.collectedAt,
    this.deliveredAt,
  });

  factory DonationModel.fromMap(Map<String, dynamic> data) {
    return DonationModel(
      donationId: data['donationId'] as String,
      donorId: data['donorId'] as String,
      donorName: data['donorName'] as String,
      itemType: data['itemType'] as String,
      quantity: data['quantity'] as String,
      notes: data['notes'] as String?,
      status: DonationStatus.values.firstWhere(
        (e) => e.toString() == 'DonationStatus.${data['status']}',
        orElse: () => DonationStatus.pendingAssignment,
      ),
      pickupLocation: data['pickupLocation'] as GeoPoint,
      pickupAddress: data['pickupAddress'] as String,
      availabilityTime: data['availabilityTime'] as Timestamp,
      postedAt: data['postedAt'] as Timestamp,
      collectionVolunteerId: data['collectionVolunteerId'] as String?,
      distributionVolunteerId: data['distributionVolunteerId'] as String?,
      collectedAt: data['collectedAt'] as Timestamp?,
      deliveredAt: data['deliveredAt'] as Timestamp?,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'donationId': donationId,
      'donorId': donorId,
      'donorName': donorName,
      'itemType': itemType,
      'quantity': quantity,
      'notes': notes,
      'status': status.toString().split('.').last,
      'pickupLocation': pickupLocation,
      'pickupAddress': pickupAddress,
      'availabilityTime': availabilityTime,
      'postedAt': postedAt,
      'collectionVolunteerId': collectionVolunteerId,
      'distributionVolunteerId': distributionVolunteerId,
      'collectedAt': collectedAt,
      'deliveredAt': deliveredAt,
    };
  }
}
