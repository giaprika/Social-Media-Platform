module.exports = {
  pick: (obj, keys) => keys.reduce((acc, k) => (k in obj ? ((acc[k] = obj[k]), acc) : acc), {}),
};
