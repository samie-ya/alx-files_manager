// This script will create a redis client
import { createClient } from 'redis';

const util = require('util');

class RedisClient {
  constructor() {
    this.client = createClient();
    this.client.on('error', (error) => {
      console.log(`${error}`);
    });
  }

  isAlive() {
    try {
      this.client.on('connect', () => {});
      return true;
    } catch (error) {
      return false;
    }
  }

  async get(key) {
    const getSet = util.promisify(this.client.get).bind(this.client);
    try {
      const reply = await getSet(key);
      return reply;
    } catch (error) {
      console.log(error);
    }
    return null;
  }

  async set(key, value, time) {
    await this.client.set(key, value);
    await this.client.expire(key, time);
  }

  async del(key) {
    await this.client.del(key);
  }
}

const redisClient = new RedisClient();

module.exports = redisClient;
