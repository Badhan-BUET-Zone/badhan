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
    email: "mirmahathir2@gmail.com"
}

class RouteInfo {
    constructor(method, url, notification){
        this.method = method
        this.url = url
        this.notification = notification
    }
}

const routeInfos = {
    // GET requests
    GETSearch: new RouteInfo('GET','/search/v3*', 'Donors queried successfully'),
    GETDonors: new RouteInfo('GET','/donors?donorId=*', 'Fetched donor details successfully'),
    GETActiveDonors: new RouteInfo('GET','/activeDonors*', 'Active donor queried successfully'),
    GETUsersSignIn: new RouteInfo('GET','/users/signin','Signed in successfully'),
    GETUsersMe: new RouteInfo('GET','/users/me','Fetched donor details successfully'),

    // POST requests
    POSTDonors: new RouteInfo('POST','/donors','Donor added successfully'),
    POSTActiveDonors: new RouteInfo('POST','/activeDonors',"Donor marked as active donor"),
    POSTCallRecords: new RouteInfo('POST','/callrecords',"Added call record"),
    POSTDonations: new RouteInfo('POST','/donations',"Donation inserted successfully"),
    POSTPublicContacts: new RouteInfo('POST','/publicContacts',"Public Contacts Updated"),

    // PATCH requests
    PATCHDonorsDesignation: new RouteInfo('PATCH', '/donors/designation?donorId*', "Target user promoted/demoted successfully"),
    PATCHDonors: new RouteInfo('PATCH','/donors','Saved details successfully'),
    PATCHDonorsComment: new RouteInfo('PATCH','/donors/comment',"Successfully changed comment"),
    PATCHAdmins: new RouteInfo('PATCH','/admins',"Successfully changed hall admin"),
    PATCHUsersPassword: new RouteInfo('PATCH','/users/password','Password changed successfully'),

    // DELETE requests
    DELETEDonors: new RouteInfo('DELETE','/donors?donorId=*', 'Deleted donor successfully'),
    DELETESignOut: new RouteInfo('DELETE','/users/signout','Logged out successfully'),
    DELETELogins: new RouteInfo('DELETE', '/logins/*', 'Logged out from specified device'),
    DELETEUsersSignOutAll: new RouteInfo('DELETE','/signout/all','Logged out from all devices successfully'),
    DELETEActiveDonors: new RouteInfo('DELETE', '/activeDonors',"Donor unmarked"),
    DELETECallRecords: new RouteInfo('DELETE','/callrecords','Successfully deleted call record'),
    DELETEDonations: new RouteInfo('DELETE','/donations',"Successfully deleted donation"),
    DELETEPublicContacts: new RouteInfo('DELETE','/publicContacts',"Public Contacts Updated"),
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
