/* {
  "phone": "8801521438557",
  "bloodGroup": 2,
  "hall": 5,
  "name": "Mir Mahathir",
  "studentId": 1605011,
  "address": "Azimpur",
  "roomNumber": "3009",
  "availableToAll": true
} */
import 'donation_model.dart';

class DonorBasicInfo {
  DonorBasicInfo({
    required this.phone,
    required this.bloodGroup,
    required this.hall,
    required this.name,
    required this.studentId,
    required this.address,
    required this.roomNumber,
    required this.availableToAll,
  });

  String phone;
  int bloodGroup;
  int hall;
  String name;
  String studentId;
  String address;
  String roomNumber;
  bool availableToAll;

  factory DonorBasicInfo.fromJson(Map<String, dynamic> json) => DonorBasicInfo(
        phone: json["phone"],
        bloodGroup: json["bloodGroup"],
        hall: json["hall"],
        name: json["name"],
        studentId: json["studentId"],
        address: json["address"],
        roomNumber: json["roomNumber"],
        availableToAll: json["availableToAll"],
      );

  Map<String, dynamic> toJson() => {
        "phone": phone,
        "bloodGroup": bloodGroup,
        "hall": hall,
        "name": name,
        "studentId": studentId,
        "address": address,
        "roomNumber": roomNumber,
        "availableToAll": availableToAll,
      };
}

/*
{
  "phone": "8801572342835",
  "bloodGroup": 2,
  "hall": 6,
  "name": "Hasan masum",
  "studentId": 1805052,
  "address": "Chittagong",
  "roomNumber": "3007",
  "availableToAll": true,
  "comment": "Developer of badhan",
  "extraDonationCount": 1
}
*/

class NewDonor extends DonorBasicInfo {
  NewDonor({
    required phone,
    required bloodGroup,
    required hall,
    required name,
    required studentId,
    required address,
    required roomNumber,
    required availableToAll,
    required this.comment,
    required this.extraDonationCount,
  }) : super(
          phone: phone,
          bloodGroup: bloodGroup,
          hall: hall,
          name: name,
          studentId: studentId,
          address: address,
          roomNumber: roomNumber,
          availableToAll: availableToAll,
        );

  String comment;
  int extraDonationCount;

  factory NewDonor.fromJson(Map<String, dynamic> json) {
    DonorBasicInfo info = DonorBasicInfo.fromJson(json);
    return NewDonor(
      phone: info.phone,
      bloodGroup: info.bloodGroup,
      hall: info.hall,
      name: info.name,
      studentId: info.studentId,
      address: info.address,
      roomNumber: info.roomNumber,
      availableToAll: info.availableToAll,
      comment: json["comment"],
      extraDonationCount: json["extraDonationCount"],
    );
  }

  @override
  Map<String, dynamic> toJson() {
    Map<String, dynamic> map = super.toJson();
    map['comment'] = comment;
    map['extraDonationCount'] = extraDonationCount;
    return map;
  }
}

/*
{
    "_id": "5e677716ca2dc857938d7c73",
    "email": "",
    "comment": "Interested: Yes; Any Physical Problem : ; Weight : 60; Any Additional Info :",
    "commentTime": 1635189458740,
    "lastDonation": 1636934400000,
    "designation": 3,
    
    "studentId": "1805052",
    "name": "Hasan masum",
    "roomNumber": "3007",
    "bloodGroup": 2,
    "phone": 8801572342835,
    "hall": 6,
    "address": "(Unknown)",
    "availableToAll": false
  }
*/
class DonorData extends DonorBasicInfo {
  String id;
  String email;
  String comment;
  int commentTime;
  int lastDonation;
  int designation;

  DonorData(
      {required this.id,
      required this.email,
      required this.comment,
      required this.commentTime,
      required this.lastDonation,
      required this.designation,
      required String phone,
      required int bloodGroup,
      required int hall,
      required String name,
      required String studentId,
      required String address,
      required String roomNumber,
      required bool availableToAll})
      : super(
            phone: phone,
            bloodGroup: bloodGroup,
            hall: hall,
            name: name,
            studentId: studentId,
            address: address,
            roomNumber: roomNumber,
            availableToAll: availableToAll);

  factory DonorData.fromJson(Map<String, dynamic> json) => DonorData(
        id: json["_id"],
        email: json["email"],
        comment: json["comment"],
        commentTime: json["commentTime"],
        lastDonation: json["lastDonation"],
        studentId: json["studentId"],
        name: json["name"],
        roomNumber: json["roomNumber"],
        bloodGroup: json["bloodGroup"],
        phone: json["phone"].toString(),
        hall: json["hall"],
        designation: json["designation"],
        address: json["address"],
        availableToAll: json["availableToAll"],
      );

  @override
  Map<String, dynamic> toJson() => {
        "_id": id,
        "email": email,
        "comment": comment,
        "commentTime": commentTime,
        "lastDonation": lastDonation,
        "studentId": studentId,
        "name": name,
        "roomNumber": roomNumber,
        "bloodGroup": bloodGroup,
        "phone": phone,
        "hall": hall,
        "designation": designation,
        "address": address,
        "availableToAll": availableToAll,
      };
}

/*
{
    "_id": "5e677716ca2dc857938d7c73",
    "studentId": "1805052",
    "name": "Hasan masum",
    "roomNumber": "3007",
    "bloodGroup": 2,
    "phone": 8801572342835,
    "lastDonation": 1636934400000,
    "comment": "Interested: Yes; Any Physical Problem : ; Weight : 60; Any Additional Info :",
    "hall": 6,
    "designation": 3,
    "address": "(Unknown)",
    "commentTime": 1635189458740,
    "availableToAll": false,
    "email": "",
    "callRecords": [],
    "donations": [
      {
        "_id": "6192948d406a6bebc8d10da7",
        "phone": 8801572342835,
        "donorId": "5e677716ca2dc857938d7c73",
        "date": 1636934400000
      }
    ],
    "publicContacts": [],
    "markedBy": null
  }
*/
class DonorProfileData extends DonorBasicInfo {
  DonorProfileData({
    required this.id,
    required studentId,
    required name,
    required roomNumber,
    required bloodGroup,
    required phone,
    required this.lastDonation,
    required this.comment,
    required hall,
    required this.designation,
    required address,
    required this.commentTime,
    required availableToAll,
    required this.email,
    required this.callRecords,
    required this.donations,
    required this.publicContacts,
  }) : super(
          phone: phone,
          bloodGroup: bloodGroup,
          hall: hall,
          name: name,
          studentId: studentId,
          address: address,
          roomNumber: roomNumber,
          availableToAll: availableToAll,
        );

  String id;
  int lastDonation;
  String comment;
  int designation;
  int commentTime;
  String email;
  List<dynamic> callRecords;
  List<Donation> donations;
  List<dynamic> publicContacts;

  factory DonorProfileData.fromJson(Map<String, dynamic> json) =>
      DonorProfileData(
        id: json["_id"],
        studentId: json["studentId"],
        name: json["name"],
        roomNumber: json["roomNumber"],
        bloodGroup: json["bloodGroup"],
        phone: json["phone"].toString(),
        lastDonation: json["lastDonation"],
        comment: json["comment"],
        hall: json["hall"],
        designation: json["designation"],
        address: json["address"],
        commentTime: json["commentTime"],
        availableToAll: json["availableToAll"],
        email: json["email"],
        callRecords: List<dynamic>.from(json["callRecords"].map((x) => x)),
        donations: List<Donation>.from(
            json["donations"].map((x) => Donation.fromJson(x))),
        publicContacts:
            List<dynamic>.from(json["publicContacts"].map((x) => x)),
      );

  @override
  Map<String, dynamic> toJson() => {
        "_id": id,
        "studentId": studentId,
        "name": name,
        "roomNumber": roomNumber,
        "bloodGroup": bloodGroup,
        "phone": phone,
        "lastDonation": lastDonation,
        "comment": comment,
        "hall": hall,
        "designation": designation,
        "address": address,
        "commentTime": commentTime,
        "availableToAll": availableToAll,
        "email": email,
        "callRecords": List<dynamic>.from(callRecords.map((x) => x)),
        "donations": List<dynamic>.from(donations.map((x) => x.toJson())),
        "publicContacts": List<dynamic>.from(publicContacts.map((x) => x)),
      };
}
