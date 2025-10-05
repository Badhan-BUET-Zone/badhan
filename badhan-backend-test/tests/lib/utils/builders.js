const { uniquePhone } = require('./helpers');

function buildDonor(overrides = {}) {
  const base = {
    name: 'Test Donor',
    phone: String(uniquePhone()),
    hall: 1,
    bloodGroup: 'A+',
    batch: 18,
    address: 'BUET',
  };
  return { ...base, ...overrides };
}

function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function buildDonation(overrides = {}) {
  const baseDate = formatDate(new Date());
  const base = {
    date: baseDate,
  };
  return { ...base, ...overrides };
}

module.exports = {
  buildDonor,
  buildDonation,
  formatDate,
};


