export const nullDepartment = 'NULL'
export const departments: string[] = [
  nullDepartment, 'Arch', 'Ch.E', nullDepartment,
  'CE', 'CSE', 'EEE', nullDepartment,
  'IPE', nullDepartment, 'ME', 'MME',
  'NAME', nullDepartment, nullDepartment, 'URP',
  'WRE', 'NCE', 'BME']

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


