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
}
