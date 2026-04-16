// patch-exfat-build.js
const fs = require('fs');

// Patch fs.readlink
const originalReadlink = fs.readlink;
fs.readlink = function(path, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  originalReadlink(path, options, (err, linkString) => {
    if (err && err.code === 'EISDIR') {
      const e = new Error('EINVAL: invalid argument, readlink');
      e.code = 'EINVAL';
      e.syscall = 'readlink';
      return callback(e);
    }
    callback(err, linkString);
  });
};

// Patch fs.readlinkSync
const originalReadlinkSync = fs.readlinkSync;
fs.readlinkSync = function(path, options) {
  try {
    return originalReadlinkSync(path, options);
  } catch (err) {
    if (err.code === 'EISDIR') {
      const e = new Error('EINVAL: invalid argument, readlink');
      e.code = 'EINVAL';
      e.syscall = 'readlink';
      throw e;
    }
    throw err;
  }
};

// Patch fs.promises.readlink
const originalPromisesReadlink = fs.promises.readlink;
fs.promises.readlink = async function(path, options) {
  try {
    return await originalPromisesReadlink(path, options);
  } catch (err) {
    if (err.code === 'EISDIR') {
      const e = new Error('EINVAL: invalid argument, readlink');
      e.code = 'EINVAL';
      e.syscall = 'readlink';
      throw e;
    }
    throw err;
  }
};

console.log("🛠️  [exFAT Patch] fs.readlink parcheado exitosamente para evitar EISDIR.");

// Iniciar proceso build de Next.js
require('next/dist/bin/next');
