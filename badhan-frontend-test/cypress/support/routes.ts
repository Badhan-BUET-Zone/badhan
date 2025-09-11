export const interceptRoutes = {
  createDonor: () => cy.intercept('POST', '**/donors').as('createDonor'),
  searchV3: () => cy.intercept('GET', '**/search/v3*').as('searchV3'),
  activeDonors: () => cy.intercept('GET', '**/activeDonors*').as('activeDonors'),
  donationReport: () => cy.intercept('GET', '**/donations/report*').as('getBloodReport'),
  plateletReport: () => cy.intercept('GET', '**/platelet-donations/report*').as('getPlateletReport'),
  postDonation: () => cy.intercept('POST', '**/donations').as('postDonation'),
  deleteDonation: () => cy.intercept('DELETE', '**/donations*').as('deleteDonation'),
  stats: () => cy.intercept('GET', '**/log/statistics').as('getStats'),
  allMembers: () => cy.intercept('GET', '**/donors/designation/all').as('getAllMembers'),
  designations: () => cy.intercept('GET', '**/donors/designation').as('getDesignations'),
  logs: () => cy.intercept('GET', '**/log').as('getLogs'),
  publicContactsCreate: () => cy.intercept('POST', '**/publicContacts').as('createPublicContact'),
  publicContactsGet: () => cy.intercept('GET', '**/publicContacts').as('getPublicContacts'),
  newDonors: () => cy.intercept('GET', '**/donors/new*').as('getNewDonors'),
};

export const waitFor = {
  createDonorOk: () => cy.wait('@createDonor').its('response.statusCode').should('eq', 201),
  searchV3Ok: () => cy.wait('@searchV3').its('response.statusCode').should('eq', 200),
  activeDonorsOk: () => cy.wait('@activeDonors').its('response.statusCode').should('eq', 200),
  donationReportOk: () => cy.wait('@getBloodReport').its('response.statusCode').should('eq', 200),
  plateletReportOk: () => cy.wait('@getPlateletReport').its('response.statusCode').should('eq', 200),
  postDonationOk: () => cy.wait('@postDonation').its('response.statusCode').should('eq', 201),
  deleteDonationOk: () => cy.wait('@deleteDonation').its('response.statusCode').should('eq', 200),
  statsOk: () => cy.wait('@getStats').its('response.statusCode').should('eq', 200),
  allMembersOk: () => cy.wait('@getAllMembers').its('response.statusCode').should('eq', 200),
  designationsOk: () => cy.wait('@getDesignations').its('response.statusCode').should('eq', 200),
  logsOk: () => cy.wait('@getLogs').its('response.statusCode').should('eq', 200),
  publicContactsCreateOk: () => cy.wait('@createPublicContact').its('response.statusCode').should('eq', 201),
  publicContactsGetOk: () => cy.wait('@getPublicContacts').its('response.statusCode').should('eq', 200),
  newDonorsOk: () => cy.wait('@getNewDonors').its('response.statusCode').should('eq', 200),
};


