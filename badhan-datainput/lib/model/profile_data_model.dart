class ProfileData {
  ProfileData({
    required this.id,
    required this.studentId,
    required this.name,
    required this.roomNumber,
    required this.bloodGroup,
    required this.phone,
    required this.lastDonation,
    required this.comment,
    required this.hall,
    required this.designation,
    required this.address,
    required this.commentTime,
    required this.availableToAll,
    required this.email,
  });

  String id;
  String studentId;
  String name;
  String roomNumber;
  int bloodGroup;
  int phone;
  int lastDonation;
  String comment;
  int hall;
  int designation;
  String address;
  int commentTime;
  bool availableToAll;
  String email;

  factory ProfileData.fromJson(Map<String, dynamic> json) => ProfileData(
        id: json["_id"],
        studentId: json["studentId"],
        name: json["name"],
        roomNumber: json["roomNumber"],
        bloodGroup: json["bloodGroup"],
        phone: json["phone"],
        lastDonation: json["lastDonation"]??0,
        comment: json["comment"]??"",
        hall: json["hall"]??"",
        designation: json["designation"],
        address: json["address"]??"",
        commentTime: json["commentTime"]??0,
        availableToAll: json["availableToAll"]??true,
        email: json["email"]??"",
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
      };
}
