const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const CONVERTED_DIR = path.join(__dirname, 'converted');
const EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

function deleteOldFiles(directory) {
  fs.readdir(directory, (err, files) => {
    if (err) {
      console.error(`Error reading directory ${directory}: ${err.message}`);
      return;
    }

    files.forEach(file => {
      const filePath = path.join(directory, file);
      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error(`Error getting stats for file ${filePath}: ${err.message}`);
          return;
        }

        const now = Date.now();
        const fileAge = now - stats.ctimeMs;

        if (fileAge > EXPIRATION_TIME) {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error(`Error deleting file ${filePath}: ${err.message}`);
              return;
            }
            console.log(`Deleted file ${filePath}`);
          });
        }
      });
    });
  });
}

deleteOldFiles(UPLOADS_DIR);
deleteOldFiles(CONVERTED_DIR);
