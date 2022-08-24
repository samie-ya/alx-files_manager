// This script will create endpoint
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const crypto = require('crypto');
const { ObjectId } = require('mongodb');

const sha = crypto.createHash('sha1');

exports.getConnect = async (request, response) => {
  const Auth = request.headers.authorization.split(' ')[1];
  const decoded = Buffer.from(Auth, 'base64').toString('utf-8');
  const email = decoded.split(':')[0];
  const password = decoded.split(':')[1];
  sha.update(password);
  const hashed = sha.digest('hex');
  const user = await dbClient.database.collection('users').findOne({ email, password: hashed });
  if (user) {
    const token = uuidv4();
    const key = `auth_${token}`;
    await redisClient.set(key, JSON.stringify(user._id), 1000 * 60 * 60 * 24);
    response.status(200).json({ token });
  } else {
    response.status(401).json({ error: 'Unauthorized' });
  }
};

exports.getDisconnect = async (request, response) => {
  const { headers } = request;
  const token = headers['x-token'];
  const key = `auth_${token}`;
  const userId = await redisClient.get(key);
  const user = await dbClient.database.collection('users').findOne({ _id: ObjectId(JSON.parse(userId)) });
  if (user) {
    await redisClient.del(key);
    response.status(204).json();
  } else {
    response.status(401).json({ error: 'Unauthorized' });
  }
};
