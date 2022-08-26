// This script will create a job queue
import dbClient from './utils/db';
import redisClient from './utils/redis';

const Queue = require('bull');
const { ObjectId } = require('mongodb');
const thumb = require('image-thumbnail');
const fs = require('fs');

const fileQueue = new Queue('fileQueue');
const userQueue = new Queue('userQueue');

fileQueue.process(async (job, done) => {
  if (!job.data.fileId) {
    done(new Error('Missing fileId'));
  } else if (!job.data.userId) {
    done(new Error('Missing userId'));
  } else {
    const file = await dbClient.database.collection('files').findOne({ _id: ObjectId(job.data.fileId), userId: ObjectId(job.data.userId) });
    if (!file) {
      done(new Error('File not found'));
    } else {
      console.log('Nothing');
    }
};

userQueue.process(async (job, done) => {
  if (!job.data.userId) {
    done(new Error('Missing userId'));
  } else {
    const user = await dbClient.database.collection('users').findOne({ _id: ObjectId(job.data.userId) });
    if (user) {
      console.log(`Welcome ${user.email}!`);
    } else {
      done(new Error('User not found'));
    }
  }
  done();
});
