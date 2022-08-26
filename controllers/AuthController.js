// This script will create endpoint
import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const { ObjectId } = require('mongodb');

exports.getConnect = async (request, response) => {
  const Auth = request.headers.authorization.split(' ')[1];
  const decoded = Buffer.from(Auth, 'base64').toString('binary');
  const email = decoded.split(':')[0];
  const password = decoded.split(':')[1];
  const hashed = sha1(password);
  const user = await dbClient.database.collection('users').findOne({ email, password: hashed });
  if (user) {
    const token = uuidv4();
    const key = `auth_${token}`;
    await redisClient.set(key, user._id.toString(), 1000 * 60 * 60 * 24);
    response.status(200).send({ token });
  } else {
    response.status(401).send({ error: 'Unauthorized' });
  }
};

exports.getDisconnect = async (request, response) => {
  const { headers } = request;
  const token = headers['x-token'];
  const key = `auth_${token}`;
  const userId = await redisClient.get(key);
  const user = await dbClient.database.collection('users').findOne({ _id: ObjectId(userId) });
  if (user) {
    await redisClient.del(key);
    response.status(204).send();
  } else {
    response.status(401).send({ error: 'Unauthorized' });
  }
};
