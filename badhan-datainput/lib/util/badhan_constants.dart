import 'custom_exceptions.dart';

class BadhanConst {
  static const departments = [
    'NULL',
    'Arch (01)',
    'Ch.E (02)',
    'NULL',
    'CE (04)',
    'CSE (05)',
    'EEE (06)',
    'NULL',
    'IPE (08)',
    'NULL',
    'ME (10)',
    'MME (11)',
    'NAME (12)',
    'NULL',
    'NULL',
    'URP (15)',
    'WRE (16)',
    'NULL',
    'BME (18)'
  ];

  static const halls = [
    'Ahsanullah',
    'Sabekun Nahar Sony',
    'Nazrul',
    'Rashid',
    'Sher-e-Bangla',
    'Suhrawardy',
    'Titumir',
    'Attached',
    '(Unknown)'
  ];
  static const designations = [
    'Donor',
    'Volunteer',
    'Hall Admin',
    'Super Admin'
  ];
  static const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

  static const visibilites = ["Private", "Public"];

  static String designation(int id) {
    return designations[id];
  }

  static String bloodGroup(int id) {
    return bloodGroups[id];
  }

  static String hall(int id) {
    return halls[id];
  }

  static int hallId(String name) {
    for (int i = 0; i < halls.length; i++) {
      if (halls[i].toLowerCase() == name.toLowerCase()) return i;
    }
    return -1;
  }

  static int bloodGroupId(String bg) {
    for (int i = 0; i < bloodGroups.length; i++) {
      if (bloodGroups[i].toLowerCase() == bg.toLowerCase()) return i;
    }
    return -1;
  }

  static String headerMap(String old) {
    switch (old.toLowerCase()) {
      case "phone":
        return "phone";
      case "blood group":
        return "bloodGroup";
      case "hall":
        return "hall";
      case "name":
        return "name";
      case "student id":
        return "studentId";
      case "address":
        return "address";
      case "room number":
        return "roomNumber";
      case "comment":
        return "comment";
      case "total donations":
        return "extraDonationCount";
      case "available to all":
        return "availableToAll";
      case "last donation":
      case "lastdonation":
      case "last_donation":
        return "lastDonation";
      default:
        return throw MyExpection("unexpected column!");
    }
  }

  static dynamic dataMap(String header, dynamic data) {
    //Log.d(tag, "_dataMap(): $header : $data");
    switch (header) {
      case "phone":
        try {
          String number = (data.toInt()).toString();

          if (number.length != 13) {
            throw MyExpection(
                "Phone number length must be 13. See instruction for more details");
          }

          return number;
        } on NoSuchMethodError catch (_) {
          throw MyExpection("Phone number must be a number");
        } on MyExpection catch (_) {
          rethrow;
        }
      case "bloodGroup":
        try {
          int bloodGroup = BadhanConst.bloodGroupId(data as String);
          //Log.d(tag, "blood group: $data: $bloodGroup");
          if (bloodGroup == -1) {
            throw Exception();
          }
          return bloodGroup;
        } catch (e) {
          throw MyExpection(
              "Invalid blood group. See instruction for more details.");
        }
      case "hall":
        try {
          int hall = BadhanConst.hallId(data);
          if (hall == -1) {
            throw Exception();
          }
          return hall;
        } catch (e) {
          throw MyExpection(
              "Invalid hall name. See instruction for more details");
        }
      case "studentId":
        try {
          return data.toInt().toString();
        } catch (_) {
          throw MyExpection("Student id must be a number");
        }
      case "extraDonationCount":
        try {
          int cnt = int.parse(data.toString());

          // https://github.com/Badhan-BUET-Zone/badhan-datainput/issues/27
          // negative donation count handle
          if (cnt < 0) {
            //Log.d(tag, "total cnt $cnt");
            throw MyExpection("Total donation can't be negative");
          }

          return cnt;
        } on MyExpection catch (_) {
          rethrow;
        } catch (_) {
          throw MyExpection("Total doonation must be an integer number");
        }
      case "comment":
        String comment = data;
        return comment.trim() == "" ? "no comments" : comment.trim();
      case "availableToAll":
        //Log.d(tag, "availableToAll: $data");
        try {
          return data as bool;
        } catch (_) {
          throw MyExpection("Available to all must be either true or false");
        }

      default:
        return data;
    }
  }
}
