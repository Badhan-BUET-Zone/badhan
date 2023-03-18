const departments = [
    'NULL', 'Arch (01)', 'Ch.E (02)', 'NULL',
    'CE (04)', 'CSE (05)', 'EEE (06)', 'NULL',
    'IPE (08)', 'NULL', 'ME (10)', 'MME (11)',
    'NAME (12)', 'NULL', 'NULL', 'URP (15)',
    'WRE (16)', 'NULL', 'BME (18)']

const halls = ['Ahsanullah', 'Chatri', 'Nazrul', 'Rashid', 'Sher-e-Bangla', 'Suhrawardy', 'Titumir', 'Attached', '(Unknown)']
const designations = ['Donor', 'Volunteer', 'Hall Admin', 'Super Admin']
const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']

const MASTER_ADMIN_ID = '5e901d56effc5900177ced73'

const fakeDonorProfile = {
    name: "Random Donor Name",
    phone: "01311113278",
    studentId: "1605489",
    bloodGroup: "AB+",
    roomNumber: "Random Room Number",
    address: "Random Address",
    comment: "Random Comment",
    donationCount: "1",
}

class RouteInfo {
    constructor(method, url, notification){
        this.method = method
        this.url = url
        this.notification = notification
    }
}

const ROUTE_INFO_UNSPECIFIED = 'NOT SPECIFIED'
const routeInfos = {
    GETSearch: new RouteInfo('GET','/search/v3*', 'Donors queried successfully'),
    PATCHDonorsDesignation: new RouteInfo('PATCH', '/donors/designation?donorId*', "Target user promoted/demoted successfully"),
    POSTDonors: new RouteInfo('POST','/donors','Donor added successfully'),
    DELETEDonors: new RouteInfo('DELETE','/donors?donorId=*', 'Deleted donor successfully'),
    DELETESignOut: new RouteInfo('DELETE','/users/signout','Logged out successfully'),
    GETDonors: new RouteInfo('GET','/donors?donorId=*', 'Fetched donor details successfully'),
    GETActiveDonors: new RouteInfo('GET','/activeDonors*', 'Active donor queried successfully'),
}

const seeDuplicateProfileTimeout = 10000

module.exports = {
    designations,
    departments,
    bloodGroups,
    halls,
    MASTER_ADMIN_ID,
    fakeDonorProfile,
    seeDuplicateProfileTimeout,
    routeInfos
}
