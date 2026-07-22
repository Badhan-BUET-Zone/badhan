// Smoke test for the hand-maintained constants map. This project is plain JavaScript with
// no compile-time safety net, so a typo'd constant name yields `undefined` and an
// assertion that silently stops asserting what it used to. This test is the whole
// mitigation: every value of every exported map must be a number, and each map must have
// its expected key count.
const { HALLS_INDEX, HTTP_STATUS } = require('./constants');

const expectAllNumbers = (name, map) => {
  Object.entries(map).forEach(([key, value]) => {
    expect(typeof value).toBe('number');
    if (typeof value !== 'number') {
      throw new Error(`${name}.${key} is not a number`);
    }
  });
};

test('HALLS_INDEX has 9 numeric halls', () => {
  expect(Object.keys(HALLS_INDEX)).toHaveLength(9);
  expectAllNumbers('HALLS_INDEX', HALLS_INDEX);
});

test('HTTP_STATUS has 8 numeric status codes', () => {
  expect(Object.keys(HTTP_STATUS)).toHaveLength(8);
  expectAllNumbers('HTTP_STATUS', HTTP_STATUS);
});
