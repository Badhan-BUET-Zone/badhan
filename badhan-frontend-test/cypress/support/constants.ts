export const MESSAGES = {
  signInSuccess: 'Signed in successfully',
  signOutSuccess: 'Logged out successfully',
  donorCreateSuccess: 'Donor added successfully',
  markActiveSuccess: 'Donor marked as bookmarked donor',
  unmarkActiveSuccess: 'Donor unmarked',
  callRecordAdded: 'Added call record',
  callRecordDeleted: 'Successfully deleted call record',
  publicContactsUpdated: 'Public Contacts Updated',
  profileSaveSuccess: 'Saved details successfully',
  commentChangedSuccess: 'Successfully changed comment',
  donationInserted: 'Donation inserted successfully',
  donationDeleted: 'Successfully deleted donation',
  plateletDonationInserted: 'Platelet donation inserted successfully',
  plateletDonationDeleted: 'Successfully deleted platelet donation',
  logoutFromDeviceSuccess: 'Logged out from specified device',
  promoteVolunteerSuccess: 'Target user promoted/demoted successfully',
  changeHallAdminSuccess: 'Successfully changed hall admin',
  changePasswordSuccess: 'Password changed successfully',
  donorDeletedSuccess: 'Deleted donor successfully',
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
  AHSANULLAH: 'Ahsan Ullah',
  CHATRI: 'Sabekun Nahar Sony',
  NAZRUL: 'Kazi Nazrul Islam',
  RASHID: 'Dr. M. A. Rashid',
  SHEREBANGLA: 'Sher-E-Bangla',
  SUHRAWARDY: 'Suhrawardy',
  TITUMIR: 'Titumir',
  ATTACHED: 'Attached',
  UNKNOWN: '(Unknown)',
} as const;

export const HALLS = ['Ahsan Ullah', 'Sabekun Nahar Sony', 'Kazi Nazrul Islam', 'Dr. M. A. Rashid', 'Sher-E-Bangla', 'Suhrawardy', 'Titumir', 'Attached', '(Unknown)'] as const;

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
  updatedComment: 'Test comment updated',
} as const;

export const TEST_PASSWORDS = {
  newPassword: 'newpass1',
} as const;


