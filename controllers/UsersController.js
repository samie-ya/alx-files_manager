// This script will create endpoint to add users to database
import sha1 from 'sha1';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const { ObjectId } = require('mongodb');
const Queue = require('bull');

const userQueue = new Queue('userQueue');

exports.postNew = async (request, response) => {
  const { email } = request.body;
  const { password } = request.body;

  if (!email) {
    response.status(400).json({ error: 'Missing email' });
  } else if (!password) {
    response.status(400).json({ error: 'Missing password' });
  } else {
    const emailFound = await dbClient.database.collection('users').find({ email }).toArray();
    if (emailFound.length > 0) {
      response.status(400).json({ error: 'Already exist' });
    } else {
      const hashed = sha1(password);
      const user = await dbClient.database.collection('users').insertOne({ email, password: hashed });
      const id = user.insertedId;
      userQueue.add({ userId: id });
      response.status(201).json({ id, email });
    }
  }
};

exports.getMe = async (request, response) => {
  const { headers } = request;
  const token = headers['x-token'];
  const key = `auth_${token}`;
  const userId = await redisClient.get(key);
  const user = await dbClient.database.collection('users').findOne({ _id: ObjectId(userId) });
  if (user) {
    response.send({ id: user._id, email: user.email });
  } else {
    response.status(401).send({ error: 'Unauthorized' });
  }
};
