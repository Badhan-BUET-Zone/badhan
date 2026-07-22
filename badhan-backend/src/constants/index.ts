export const departments: string[] = [
  'NULL', 'Arch (01)', 'Ch.E (02)', 'NULL',
  'CE (04)', 'CSE (05)', 'EEE (06)', 'NULL',
  'IPE (08)', 'NULL', 'ME (10)', 'MME (11)',
  'NAME (12)', 'NULL', 'NULL', 'URP (15)',
  'WRE (16)', 'NCE (17)', 'BME (18)']
export const halls: string[] = ['Ahsanullah', 'Chatri', 'Nazrul', 'Rashid', 'Sher-e-Bangla', 'Suhrawardy', 'Titumir', 'Attached', '(Unknown)']
export const HALLS_INDEX: Record<string, number> = {
  AHSANULLAH: 0,
  CHATRI: 1,
  NAZRUL: 2,
  RASHID: 3,
  SHEREBANGLA: 4,
  SUHRAWARDY: 5,
  TITUMIR: 6,
  ATTACHED: 7,
  UNKNOWN: 8
}

export const designations: string[] = ['Donor', 'Volunteer', 'Hall Admin', 'Super Admin']
export const DESIGNATIONS_INDEX: Record<string, number> = {
  DONOR: 0,
  VOLUNTEER: 1,
  HALL_ADMIN: 2,
  SUPER_ADMIN: 3
}

export const bloodGroups: string[] = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']

export const year2000TimeStamp: number = new Date('2000-01-01T00:00:00Z').getTime()
