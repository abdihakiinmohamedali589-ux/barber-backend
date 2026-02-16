const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDirs = ['uploads', 'uploads/shops', 'uploads/services', 'uploads/staff'];
uploadDirs.forEach(dir => {
  const fullPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let dest = 'uploads/';
    if (file.fieldname === 'shopImage' || file.fieldname === 'gallery') {
      dest = 'uploads/shops/';
    } else if (file.fieldname.startsWith('services')) {
      dest = 'uploads/services/';
    } else if (file.fieldname.startsWith('staff')) {
      dest = 'uploads/staff/';
    }
    cb(null, path.join(__dirname, '..', dest));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  console.log('📁 Received file metadata:', {
    fieldname: file.fieldname,
    originalname: file.originalname,
    mimetype: file.mimetype
  });

  if (file.mimetype && file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    // Fallback: check extension if mimetype is generic or missing
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(ext)) {
      console.log(`✅ Accepted file based on extension: ${ext}`);
      cb(null, true);
    } else {
      console.error(`❌ Rejected file. Mimetype: ${file.mimetype}, Extension: ${ext}`);
      cb(new Error('Not an image! Please upload an image.'), false);
    }
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

module.exports = upload;
