// Thin compatibility layer - re-exports operations from lib/operations
// This file maintains backward compatibility for existing test imports
// New tests should import directly from 'tests/lib/operations'

module.exports = require('./lib/operations');
