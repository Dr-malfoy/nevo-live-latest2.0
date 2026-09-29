const { MongoMemoryServer } = require('mongodb-memory-server');
const fs = require('fs');
const path = require('path');

async function start() {
  console.log('Starting local MongoDB server...');
  const dbPath = path.join(__dirname, '.mongo');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
  }

  const mongod = await MongoMemoryServer.create({
    instance: {
      port: 27017,
      dbPath: dbPath,
      storageEngine: 'wiredTiger',
    }
  });

  const uri = mongod.getUri();
  console.log(`✅ MongoDB successfully started on ${uri}`);
  console.log(`Database files are stored in ${dbPath}`);
  console.log('Keeping process alive...');
  
  // Keep the process alive indefinitely
  process.stdin.resume();
}

start().catch(console.error);
