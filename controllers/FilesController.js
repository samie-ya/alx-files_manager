// This script will create an end point
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const { ObjectId } = require('mongodb');
const fs = require('fs');

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
