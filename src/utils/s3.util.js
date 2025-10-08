const { S3Client, PutObjectCommand, DeleteObjectCommand, HeadBucketCommand, CreateBucketCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.AWS_S3_BUCKET;

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const generateKey = (prefix = 'uploads', originalName = 'file') => {
  const ext = originalName.includes('.') ? originalName.substring(originalName.lastIndexOf('.')) : '';
  return `${prefix}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
};

async function uploadBufferToS3(buffer, key, contentType) {
  if (!BUCKET) throw new Error('Missing AWS_S3_BUCKET env');
  await ensureBucketExists();
  const putParams = {
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType
  };
  // Only set ACL if explicitly enabled via env to avoid error when ACLs are disabled
  if (process.env.S3_OBJECT_ACL) {
    putParams.ACL = process.env.S3_OBJECT_ACL; // e.g., 'public-read'
  }
  const put = new PutObjectCommand(putParams);
  await s3.send(put);
  const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
  return { key, url };
}

async function deleteFromS3(key) {
  if (!key) return;
  const del = new DeleteObjectCommand({ Bucket: BUCKET, Key: key });
  await s3.send(del);
}

function tryExtractKeyFromUrl(url) {
  try {
    const u = new URL(url);
    return decodeURIComponent(u.pathname.replace(/^\//, ''));
  } catch (_) {
    return undefined;
  }
}

async function ensureBucketExists() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
    return true;
  } catch (err) {
    // Auto-create bucket in local/dev if allowed
    if (process.env.NODE_ENV === 'production' || process.env.S3_AUTO_CREATE_BUCKET === 'false') {
      throw err;
    }
    const params = { Bucket: BUCKET };
    // us-east-1 does not need LocationConstraint
    if (REGION && REGION !== 'us-east-1') {
      params.CreateBucketConfiguration = { LocationConstraint: REGION };
    }
    await s3.send(new CreateBucketCommand(params));
    return true;
  }
}

module.exports = {
  s3,
  uploadBufferToS3,
  deleteFromS3,
  generateKey,
  tryExtractKeyFromUrl,
  ensureBucketExists
};


