/*
{
  "_id": "6192948d406a6bebc8d10da7",
  "phone": 8801572342835,
  "donorId": "5e677716ca2dc857938d7c73",
  "date": 1636934400000
}
*/
class Donation {
  Donation({
    required this.id,
    required this.phone,
    required this.donorId,
    required this.date,
  });

  String id;
  int phone;
  String donorId;
  int date;

  factory Donation.fromJson(Map<String, dynamic> json) => Donation(
        id: json["_id"],
        phone: json["phone"],
        donorId: json["donorId"],
        date: json["date"],
      );

  Map<String, dynamic> toJson() => {
        "_id": id,
        "phone": phone,
        "donorId": donorId,
        "date": date,
      };
}
