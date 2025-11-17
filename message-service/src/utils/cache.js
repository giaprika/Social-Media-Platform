const { createClient } = require('redis');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const client = createClient({ url: redisUrl });

client.on('error', (err) => {
  console.error('Redis Client Error', err);
});

client.connect().catch((err) => {
  console.error('Redis connect failed:', err && err.message);
});

const get = async (key) => {
  try {
    const v = await client.get(key);
    return v ? JSON.parse(v) : null;
  } catch (err) {
    console.error('Cache get error', err && err.message);
    return null;
  }
};

const set = async (key, value, ttl = parseInt(process.env.CACHE_DEFAULT_TTL || '60', 10)) => {
  try {
    await client.setEx(key, ttl, JSON.stringify(value));
  } catch (err) {
    console.error('Cache set error', err && err.message);
  }
};

const del = async (patternOrKey) => {
  try {
    if (!patternOrKey.includes('*')) {
      await client.del(patternOrKey);
      return;
    }
    const keys = [];
    for await (const k of client.scanIterator({ MATCH: patternOrKey })) keys.push(k);
    if (keys.length) await client.del(keys);
  } catch (err) {
    console.error('Cache del error', err && err.message);
  }
};

module.exports = { client, get, set, del };
