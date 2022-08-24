// This script will create endpoint to add users to database
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const crypto = require('crypto');
const { ObjectId } = require('mongodb');

const sha = crypto.createHash('sha1');

exports.postNew = async (request, response) => {
  const { email } = request.body;
  const { password } = request.body;
  if (!email) {
    response.status(400).send({ error: 'Missing email' });
  }
  if (!password) {
    response.status(400).send({ error: 'Missing password' });
  }
  const emailFound = await dbClient.database.collection('users').find({ email }).toArray();
  if (emailFound.length > 0) {
    response.status(400).send({ error: 'Already exist' });
  } else {
    sha.update(password);
    const hashed = sha.digest('hex');
    const user = await dbClient.database.collection('users').insertOne({ email, password: hashed });
    const id = user.insertedId;
    response.status(201).send({ id, email });
  }
};

exports.getMe = async (request, response) => {
  const { headers } = request;
  const token = headers['x-token'];
  const key = `auth_${token}`;
  const userId = await redisClient.get(key);
  const user = await dbClient.database.collection('users').findOne({ _id: ObjectId(JSON.parse(userId)) });
  if (user) {
    response.json({ id: user._id, email: user.email });
  } else {
    response.status(401).json({ error: 'Unauthorized' });
  }
};
