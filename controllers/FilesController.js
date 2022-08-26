// This script will create an end point
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const { ObjectId } = require('mongodb');
const fs = require('fs');
const queue = require('bull');

exports.postUpload = async (request, response) => {
  const { headers } = request;
  const token = headers['x-token'];
  const key = `auth_${token}`;
  const userId = await redisClient.get(key);
  const user = await dbClient.database.collection('users').findOne({ _id: ObjectId(userId) });

  const { name } = request.body;
  const { type } = request.body;
  const typeOtype = ['folder', 'file', 'image'];
  const { data } = request.body;
  const parentId = request.body.parentId || 0;
  const isPublic = request.body.isPublic || false;

  if (!user) {
    response.status(401).send({ error: 'Unauthorized' });
  } else if (!name) {
    response.status(400).send({ error: 'Missing name' });
  } else if (!type || !(typeOtype).includes(type)) {
    response.status(400).send({ error: 'Missing type' });
  } else if ((!data) && (type !== 'folder')) {
    response.status(400).send({ error: 'Missing data' });
  } else if (parentId) {
    const files = await dbClient.database.collection('files').findOne({ _id: ObjectId(parentId) });
    if (!files) {
      response.status(400).send({ error: 'Parent not found' });
    } else if (files.type !== 'folder') {
      response.status(400).send({ error: 'Parent is not a folder' });
    } else {
      const folder = process.env.FOLDER_PATH || '/tmp/files_manager';
      const decodedData = Buffer.from(data, 'base64').toString('binary');
      const uuid = uuidv4();
      if (!fs.existsSync(folder)) {
        fs.mkdir(folder, (err) => {
          if (err) {
            console.log(err);
          }
        });
      }
      const path = `${folder}/${uuid}`;
      fs.writeFile(path, decodedData, { flag: 'w+' }, (err) => {
        if (err) {
          console.log(err);
        }
      });

      const file = await dbClient.database.collection('files').insertOne({
        userId: user._id,
        name,
        type,
        isPublic,
        parentId: files._id,
        localPath: path,
      });
      const dict = file.ops;
      response.status(201).send({
        id: dict['0']._id,
        userId: dict['0'].userId,
        name: dict['0'].name,
        type: dict['0'].type,
        isPublic: dict['0'].isPublic,
        parentId: dict['0'].parentId,
      });
    }
  } else if (!parentId) {
    if (type !== 'folder') {
      const folder = process.env.FOLDER_PATH || '/tmp/files_manager';
      const decodedData = Buffer.from(data, 'base64').toString('binary');
      const uuid = uuidv4();
      if (!fs.existsSync(folder)) {
        fs.mkdir(folder, (err) => {
          if (err) {
            console.log(err);
          }
        });
      }
      const path = `${folder}/${uuid}`;
      fs.writeFile(path, decodedData, { flag: 'w+' }, (err) => {
        if (err) {
          console.log(err);
        }
      });
      const file = await dbClient.database.collection('files').insertOne({
        userId: user._id,
        name,
        type,
        isPublic,
        parentId,
        localPath: path,
      });

      const dict = file.ops;
      response.status(201).send({
        id: dict['0']._id,
        userId: dict['0'].userId,
        name: dict['0'].name,
        type: dict['0'].type,
        isPublic: dict['0'].isPublic,
        parentId: dict['0'].parentId,
      });
    } else {
      const file = await dbClient.database.collection('files').insertOne({
        userId: user._id,
        name,
        type,
        isPublic,
        parentId,
      });

      const dict = file.ops;
      response.status(201).send({
        id: dict['0']._id,
        userId: dict['0'].userId,
        name: dict['0'].name,
        type: dict['0'].type,
        isPublic: dict['0'].isPublic,
        parentId: dict['0'].parentId,
      });
    }
  }
};

exports.getShow = async (request, response) => {
  const fileId = request.params.id;
  const { headers } = request;
  const token = headers['x-token'];
  const key = `auth_${token}`;
  const userId = await redisClient.get(key);
  const user = await dbClient.database.collection('users').findOne({ _id: ObjectId(userId) });
  if (!user) {
    response.status(401).send({ error: 'Unauthorized' });
  } else {
    const file = await dbClient.database.collection('files').findOne({ _id: ObjectId(fileId), userId: ObjectId(user._id) });
    if (file) {
      response.send({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      });
    } else {
      response.status(404).send({ error: 'Not found' });
    }
  }
};

exports.getIndex = async (request, response) => {
  const { headers } = request;
  const token = headers['x-token'];
  const key = `auth_${token}`;
  const userId = await redisClient.get(key);

  const parentId = request.query.parentId || 0;
  const page = request.query.page || 0;
  const user = await dbClient.database.collection('users').findOne({ _id: ObjectId(userId) });
  if (!user) {
    response.status(401).send({ error: 'Unauthorized' });
  } else if (!parentId) {
    const files = await dbClient.database.collection('files').find({ userId: ObjectId(user._id) }).skip(20 * page).limit(20)
      .toArray();
    const newList = [];
    for (const file of files) {
      const dict = {};
      dict.id = file._id;
      dict.userId = file.userId;
      dict.name = file.name;
      dict.type = file.type;
      dict.isPublic = file.isPublic;
      dict.parentId = file.parentId;
      newList.push(dict);
    }
    response.send(newList);
  } else {
    try {
      const files = await dbClient.database.collection('files').find({ userId: ObjectId(user._id), parentId: ObjectId(parentId) }).skip(20 * page).limit(20)
        .toArray();
      const newList = [];
      for (const file of files) {
        const dict = {};
        dict.id = file._id;
        dict.userId = file.userId;
        dict.name = file.name;
        dict.type = file.type;
        dict.isPublic = file.isPublic;
        dict.parentId = file.parentId;
        newList.push(dict);
      }
      response.send(newList);
    } catch (err) {
      response.send([]);
    }
  }
};

exports.putPublish = async (request, response) => {
  const fileId = request.params.id;
  const { headers } = request;
  const token = headers['x-token'];
  const key = `auth_${token}`;
  const userId = await redisClient.get(key);
  const user = await dbClient.database.collection('users').findOne({ _id: ObjectId(userId) });
  if (!user) {
    response.status(401).send({ error: 'Unauthorized' });
  } else {
    const file = await dbClient.database.collection('files').findOne({ _id: ObjectId(fileId), userId: ObjectId(user._id) });
    if (file) {
      await dbClient.database.collection('files').updateOne({ _id: ObjectId(fileId) }, { $set: { isPublic: true } });
      const file = await dbClient.database.collection('files').findOne({ _id: ObjectId(fileId), userId: ObjectId(user._id) });
      response.status(200).send({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      });
    } else {
      response.status(404).send({ error: 'Not found' });
    }
  }
};

exports.putUnpublish = async (request, response) => {
  const fileId = request.params.id;
  const { headers } = request;
  const token = headers['x-token'];
  const key = `auth_${token}`;
  const userId = await redisClient.get(key);
  const user = await dbClient.database.collection('users').findOne({ _id: ObjectId(userId) });
  if (!user) {
    response.status(401).send({ error: 'Unauthorized' });
  } else {
    const file = await dbClient.database.collection('files').findOne({ _id: ObjectId(fileId), userId: ObjectId(user._id) });
    if (file) {
      await dbClient.database.collection('files').updateOne({ _id: ObjectId(fileId) }, { $set: { isPublic: false } });
      const file = await dbClient.database.collection('files').findOne({ _id: ObjectId(fileId), userId: ObjectId(user._id) });
      response.status(200).send({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      });
    } else {
      response.status(404).send({ error: 'Not found' });
    }
  }
};

exports.getFile = async (request, response) => {
  const fileId = request.params.id;
  const { headers } = request;
  const token = headers['x-token'];
  const key = `auth_${token}`;
  const userId = await redisClient.get(key);
  const user = await dbClient.database.collection('users').findOne({ _id: ObjectId(userId) });
  const file = await dbClient.database.collection('files').findOne({ _id: ObjectId(fileId) });
  if (!file) {
    response.status(404).send({ error: 'Not found' });
  } else if (file.type === 'folder') {
    response.status(400).send({ error: 'A folder doesn\'t have content' });
  } else if (!fs.existsSync(file.localPath)) {
    response.status(404).send({ error: 'Not found' });
  } else if (file.isPublic === false) {
    if (!token) {
      response.status(404).send({ error: 'Not found' });
    } else if (file.userId !== user._id) {
      response.status(404).send({ error: 'Not found' });
    } else {
      const files = await dbClient.database.collection('files').findOne({ _id: ObjectId(fileId), userId: ObjectId(user._id) });
      fs.readFile(files.localPath, (err, content) => {
        if (err) {
          console.log(err);
        }
        response.send(content);
      });
    }
  } else if (file.isPublic === true) {
    if (!token) {
      fs.readFile(file.localPath, (err, content) => {
        if (err) {
          console.log(err);
        }
        response.send(content);
      });
    } else if (file.userId !== user._id) {
      response.status(404).send({ error: 'Not found' });
    } else {
      const files = await dbClient.database.collection('files').findOne({ _id: ObjectId(fileId), userId: ObjectId(user._id) });
      fs.readFile(files.localPath, (err, content) => {
        if (err) {
          console.log(err);
        }
        response.send(content);
      });
    }
  }
};
