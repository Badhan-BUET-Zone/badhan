const departments = [
    'NULL','Arch (01)','Ch.E (02)','NULL',
    'CE (04)','CSE (05)','EEE (06)','NULL',
    'IPE (08)','NULL','ME (10)','MME (11)',
    'NAME (12)','NULL','NULL','URP (15)',
    'WRE (16)','NULL','BME (18)'];
//covid support
//export const halls=['Ahsanullah', 'Chatri', 'Nazrul', 'Rashid', 'Sher-e-Bangla', 'Suhrawardy', 'Titumir','Attached'];

const halls=['Ahsanullah', 'Chatri', 'Nazrul', 'Rashid', 'Sher-e-Bangla', 'Suhrawardy', 'Titumir','Attached','(Unknown)'];
const designations=['Donor', 'Volunteer', 'Hall Admin', 'Super Admin'];
const bloodGroups=['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];


module.exports = {
    designations,
    departments,
    bloodGroups,
    halls
}
