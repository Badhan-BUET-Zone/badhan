const { authedGet, guestGet } = require('../http');
const { searchSchema } = require('../schemas/search');

/**
 * Search for donors with filters (authenticated)
 */
async function searchDonors({
  bloodGroup,
  hall,
  batch,
  name = '',
  address = '',
  isAvailable,
  isNotAvailable,
  availableToAll,
  signInResponse,
  expectedTotalItems,
  expectedDonorIds,
}) {
  const url = `/search/v3?bloodGroup=${bloodGroup}&hall=${hall}&batch=${batch}&name=${name}&address=${address}&isAvailable=${isAvailable}&isNotAvailable=${isNotAvailable}&availableToAll=${availableToAll}`;
  const response = await authedGet(url, signInResponse, searchSchema({ totalItems: expectedTotalItems }));
  const foundIds = response.data.filteredDonors.map(d => d._id);
  expect(foundIds.sort()).toEqual(expectedDonorIds.sort());
  return response;
}

/**
 * Search for donors (guest endpoint)
 */
async function guestSearchDonors(paramsString, totalItems = null) {
  return guestGet(`/guest/search/v3?${paramsString}`, searchSchema({ totalItems }));
}

module.exports = {
  searchDonors,
  guestSearchDonors,
};

