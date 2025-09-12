export const MESSAGES = {
  signInSuccess: 'Signed in successfully',
  signOutSuccess: 'Logged out successfully',
  donorCreateSuccess: 'Donor added successfully',
  markActiveSuccess: 'Donor marked as active donor',
  unmarkActiveSuccess: 'Donor unmarked',
  callRecordAdded: 'Added call record',
  callRecordDeleted: 'Successfully deleted call record',
  publicContactsUpdated: 'Public Contacts Updated',
  profileSaveSuccess: 'Saved details successfully',
  donationInserted: 'Donation inserted successfully',
  donationDeleted: 'Successfully deleted donation',
  plateletDonationInserted: 'Platelet donation inserted successfully',
  plateletDonationDeleted: 'Successfully deleted platelet donation',
  promoteVolunteerSuccess: 'Target user promoted/demoted successfully',
  changeHallAdminSuccess: 'Successfully changed hall admin',
} as const;

export const ALIASES = {
  profileName: 'profileName',
} as const;

export const BLOOD_GROUP = {
  A_POS: 'A+',
  A_NEG: 'A-',
  B_POS: 'B+',
  B_NEG: 'B-',
  O_POS: 'O+',
  O_NEG: 'O-',
  AB_POS: 'AB+',
  AB_NEG: 'AB-',
} as const;

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const;

export const HALL = {
  AHSANUALLAH: 'Ahsanullah',
  CHATRI: 'Chatri',
  NAZRUL: 'Nazrul',
  RASHID: 'Rashid',
  SHEREBANGLA: 'Sher-e-Bangla',
  SUHRAWARDY: 'Suhrawardy',
  TITUMIR: 'Titumir',
  ATTACHED: 'Attached',
  UNKNOWN: '(Unknown)',
} as const;

export const HALLS = ['Ahsanullah', 'Chatri', 'Nazrul', 'Rashid', 'Sher-e-Bangla', 'Suhrawardy', 'Titumir', 'Attached', '(Unknown)'] as const;

export const RADIO_VALUES = {
  PUBLIC_DATA: 'AvailableToAll',
  SPECIFY_HALL: 'SpecifyHall',
} as const;

export const TEST_DATA = {
  updatedName: 'Test User Updated',
  updatedPhone: '01512345678',
  updatedStudentId: '1705048',
  updatedEmail: 'test.updated@example.com',
  updatedRoom: 'C-123',
  updatedAddress: 'Test Address Updated',
} as const;


