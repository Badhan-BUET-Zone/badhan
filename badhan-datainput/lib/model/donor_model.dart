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
  int studentId;
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
  "phone": "8801521438557",
  "bloodGroup": 2,
  "hall": 5,
  "name": "Mir Mahathir",
  "studentId": 1605011,
  "address": "Azimpur",
  "roomNumber": "3009",
  "availableToAll": true,
  "comment": "Developer of badhan",
  "extraDonationCount": 1605011
}
*/

class NewDonor extends DonorBasicInfo {
  NewDonor({
    phone,
    bloodGroup,
    hall,
    name,
    studentId,
    address,
    roomNumber,
    availableToAll,
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
class Donor extends DonorBasicInfo {
  Donor({
    required this.id,
    studentId,
    name,
    roomNumber,
    bloodGroup,
    phone,
    required this.lastDonation,
    required this.comment,
    hall,
    required this.designation,
    address,
    required this.commentTime,
    availableToAll,
    required this.email,
    required this.callRecords,
    required this.donations,
    required this.publicContacts,
  }):super(
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

  factory Donor.fromJson(Map<String, dynamic> json) => Donor(
        id: json["_id"],
        studentId: json["studentId"],
        name: json["name"],
        roomNumber: json["roomNumber"],
        bloodGroup: json["bloodGroup"],
        phone: json["phone"],
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

