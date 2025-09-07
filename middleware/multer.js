const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        fs.mkdirSync('public/upload-center', { recursive: true });
        cb(null, 'public/upload-center');
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const name = Date.now() + ext;
        cb(null, name);
    }
});

const uploadFile = multer({
    storage
});

module.exports = {
    uploadFile
};
