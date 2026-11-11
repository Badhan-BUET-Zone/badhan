// The few index → name mappings the agent's own UI needs, to say who is signed in. The model gets
// the full vocabulary from the server's API reference, not from here.

export const DESIGNATIONS = ['Donor', 'Volunteer', 'Hall Admin', 'Super Admin']

export const HALLS = [
  'Ahsan Ullah', 'Sabekun Nahar Sony', 'Kazi Nazrul Islam', 'Dr. M. A. Rashid', 'Sher-E-Bangla',
  'Suhrawardy', 'Titumir', 'Attached', '(Unknown)'
]

export const designationName = (index: unknown) =>
  typeof index === 'number' && DESIGNATIONS[index] ? DESIGNATIONS[index] : 'Unknown role'

export const hallName = (index: unknown) =>
  typeof index === 'number' && HALLS[index] ? HALLS[index] : 'Unknown hall'
