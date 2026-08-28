/**
 * utils/cloudinaryUpload.js — Bee Cee Logistics
 *
 * Image handling mirrors the Makeni Central SDA / TXC Motors admin
 * servers: uploads are held in memory only (never written to local
 * disk) and pushed straight to Cloudinary. This matters on Render
 * (and most PaaS hosts) because the local filesystem is wiped on
 * every redeploy/restart — saving fleet photos to disk would silently
 * lose them the next time the service restarts.
 *
 * Cloudinary also gives us automatic format handling, including
 * Apple's HEIC/HEIF photos, which it decodes and re-encodes to JPG on
 * upload so every image is guaranteed to actually render in a normal
 * browser <img> tag, regardless of what format the admin's phone or
 * camera originally captured it in.
 */

'use strict';

const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;

/* ═══════════════════════════════════════════════
   ENV CHECK — fail fast rather than silently
   misbehaving in production.
═══════════════════════════════════════════════ */
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('❌ Missing Cloudinary env vars — set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
  process.exit(1);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* ═══════════════════════════════════════════════
   UPLOAD HELPERS
═══════════════════════════════════════════════ */

// Uploads a single in-memory file buffer to Cloudinary. `format: 'jpg'`
// forces Cloudinary to decode whatever it was given — JPG, PNG, WEBP,
// or HEIC/HEIF — and re-encode it as a JPG on their end, so every
// image stored ends up in a universally-renderable format no matter
// what the admin uploaded it as.
function uploadImageBuffer(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image', format: 'jpg' },
      (err, result) => {
        if (err) return reject(err);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

// Uploads several buffers (e.g. multiple fleet photos) one at a time.
// A single failed upload is skipped rather than failing the whole
// batch, so one bad file doesn't block the other 9.
async function uploadImageBuffers(files, folder) {
  const urls = [];
  for (const file of files) {
    try {
      const url = await uploadImageBuffer(file.buffer, folder);
      urls.push(url);
    } catch (err) {
      console.error('⚠️  Image upload failed, skipping:', err.message);
    }
  }
  return urls;
}

// Best-effort Cloudinary delete — never throws. Only touches URLs that
// actually point at our Cloudinary account; anything else (e.g. an old
// placeholder path) is ignored.
async function deleteCloudinaryImage(imageUrl) {
  try {
    if (!imageUrl || !imageUrl.includes('res.cloudinary.com')) return;
    const parts = imageUrl.split('/');
    const filename = parts[parts.length - 1].split('.')[0];
    const folder = parts[parts.length - 2];
    const publicId = `${folder}/${filename}`;
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.warn('⚠️  Cloudinary delete failed:', err.message);
  }
}

async function deleteCloudinaryImages(imageUrls = []) {
  for (const url of imageUrls) {
    await deleteCloudinaryImage(url);
  }
}

/* ═══════════════════════════════════════════════
   MULTER — memory storage only, files land in
   req.file.buffer / req.files[].buffer and go
   straight to Cloudinary, never touching local disk.
═══════════════════════════════════════════════ */
const memoryStorage = multer.memoryStorage();

// Accepts standard web formats plus Apple's HEIC/HEIF. iOS Safari and
// the Photos app usually report HEIC files with one of the mimetypes
// below, but mimetype sniffing for HEIC is notoriously inconsistent
// across browsers/OSes — some report 'application/octet-stream' — so
// we also fall back to checking the file extension.
const IMAGE_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp',
  'image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence',
];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];
const IMAGE_FILTER_ERROR = 'Only JPG, PNG, WEBP, and HEIC/HEIF (iPhone) images are allowed';

function imageFileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mimeOk = IMAGE_MIME_TYPES.includes(file.mimetype);
  const extOk = IMAGE_EXTENSIONS.includes(ext);
  if (!mimeOk && !extOk) {
    return cb(new Error(IMAGE_FILTER_ERROR));
  }
  cb(null, true);
}

// Fleet cards take between 1 and 10 images (per the fleet dashboard
// spec), so this mirrors the church server's recap-images uploader:
// up to 10 files, 5MB each, under the field name "images".
const uploadFleetImages = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
});

// Single-image uploader, kept around for anything that only ever
// needs one photo (e.g. a logo or a single hero image field).
const uploadSingleImage = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Booking KYC docs — a photo of the driver's licence and a photo of a
// proof-of-residence document, each capped at one file. Kept as its own
// multer instance (rather than reusing uploadSingleImage) because it needs
// two distinct named fields at once via .fields(), not .single().
const uploadBookingDocs = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 2 },
}).fields([
  { name: "driverLicenseImage", maxCount: 1 },
  { name: "proofOfResidenceImage", maxCount: 1 },
]);

module.exports = {
  cloudinary,
  uploadImageBuffer,
  uploadImageBuffers,
  deleteCloudinaryImage,
  deleteCloudinaryImages,
  uploadFleetImages,
  uploadSingleImage,
  uploadBookingDocs,
  IMAGE_FILTER_ERROR,
};