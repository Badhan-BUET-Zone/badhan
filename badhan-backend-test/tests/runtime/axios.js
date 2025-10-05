const axios = require('axios');
const fs = require('fs');

// Resolve base URL with env overrides and Docker detection
function resolveBaseURL() {
  const envBase = process.env.API_BASE_URL && process.env.API_BASE_URL.trim();
  if (envBase) return envBase;

  // Docker environment check
  if (fs.existsSync('/.dockerenv')) {
    return 'http://host.docker.internal:3000';
  }

  return 'http://localhost:3000';
}

// Source of truth for original base
let originalBaseURL = resolveBaseURL();

const badhanAxios = axios.create({ baseURL: originalBaseURL });
const firebaseAxios = axios.create({ baseURL: 'https://badhan-buet-default-rtdb.firebaseio.com' });

// Track guest state without leaking across specs
function enableGuestAPI() {
  // Avoid double-appending
  if (!badhanAxios.defaults.baseURL.endsWith('/guest') && !badhanAxios.defaults.baseURL.includes('/guest/')) {
    badhanAxios.defaults.baseURL = `${badhanAxios.defaults.baseURL}/guest`;
  }
}

function resetBaseURL() {
  // Reset to a fresh resolve to respect env changes made between specs (if any)
  originalBaseURL = resolveBaseURL();
  badhanAxios.defaults.baseURL = originalBaseURL;
}

function isGuestEnabled() {
  return badhanAxios.defaults.baseURL.includes('/guest');
}

// Keep lightweight interceptors similar to the original file
badhanAxios.interceptors.request.use((config) => config, (error) => Promise.reject(error));
badhanAxios.interceptors.response.use((response) => response, (error) => Promise.reject(error));

firebaseAxios.interceptors.request.use((config) => config, (error) => Promise.reject(error));
firebaseAxios.interceptors.response.use((response) => response, (error) => Promise.reject(error));

module.exports = {
  badhanAxios,
  firebaseAxios,
  enableGuestAPI,
  resetBaseURL,
  isGuestEnabled,
};


