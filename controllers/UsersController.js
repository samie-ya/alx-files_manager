// This script will create endpoint to add users to database
import dbClient from '../utils/db';

const crypto = require('crypto');

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
