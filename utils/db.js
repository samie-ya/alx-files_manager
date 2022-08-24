// This script will create a mondo db connection
const { MongoClient } = require('mongodb');

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';
    const url = `mongodb://${host}:${port}/${database}`;
    this.client = new MongoClient(url, { useUnifiedTopology: true });
    this.client.connect((err, db) => {
      if (err) {
        console.log(err);
      } else {
        this.database = db.db(database);
      }
    });
  }

  isAlive() {
    if (this.client) {
      return true;
    }
    return false;
  }

  async nbUsers() {
    const users = await this.database.collection('users').find({}).toArray();
    return users.length;
  }

  async nbFiles() {
    const files = await this.database.collection('files').find({}).toArray();
    return files.length;
  }
}

const dbClient = new DBClient();

module.exports = dbClient;
