// This script will create endpoint
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

exports.getStatus = (req, res) => {
  const redis = redisClient.isAlive();
  const db = dbClient.isAlive();
  res.send({ redis, db });
};

exports.getStats = async (req, res) => {
  const users = await dbClient.nbUsers();
  const files = await dbClient.nbFiles();
  res.send({ users, files });
};
