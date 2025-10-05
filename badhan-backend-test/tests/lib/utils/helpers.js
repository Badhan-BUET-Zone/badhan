const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Monotonic unique phone generator for tests (13-digit numbers starting with 88019)
const uniquePhone = () => {
  if (!global.__badhanUniquePhone) {
    global.__badhanUniquePhone = 8801900000000;
  }
  global.__badhanUniquePhone += 1;
  return global.__badhanUniquePhone;
};

module.exports = {
  sleep,
  uniquePhone,
};


