// This script will create endpoint to add users to database
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import sha1 from 'sha1';

const { ObjectId } = require('mongodb');

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
    const hashed = sha(password);
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
    response.send({ id: user._id, email: user.email });
  } else {
    response.status(401).send({ error: 'Unauthorized' });
  }
};
