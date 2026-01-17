const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../database');

const FILES = {
  users: path.join(DB_PATH, 'users.json'),
  ongs: path.join(DB_PATH, 'ongs.json'),
  jovens: path.join(DB_PATH, 'jovens.json'),
  services: path.join(DB_PATH, 'services.json'),
  bookings: path.join(DB_PATH, 'bookings.json'),
  reviews: path.join(DB_PATH, 'reviews.json')
};

// Initialize database
const initDatabase = () => {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(DB_PATH, { recursive: true });
  }

  Object.values(FILES).forEach(file => {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify([]));
    }
  });
};

// Helper functions
const readDB = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
};

const writeDB = (file, data) => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

module.exports = {
  FILES,
  DB_PATH,
  initDatabase,
  readDB,
  writeDB
};
