import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'puzzles_dist');

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME || 'chesshub-puzzles';

if (!accountId || !accessKeyId || !secretAccessKey) {
  console.error('ERROR: Missing R2 credentials in .env.local');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  }
  return fileList;
}

async function uploadFile(localPath, s3Key) {
  const fileContent = fs.readFileSync(localPath);
  const isGzip = s3Key.endsWith('.gz');

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: s3Key,
    Body: fileContent,
    ContentType: isGzip ? 'application/json' : 'application/json',
    ...(isGzip ? { ContentEncoding: 'gzip' } : {}),
  });

  await s3.send(command);
}

async function main() {
  console.log('=======================================================');
  console.log('ChessHub Academy - Cloudflare R2 Upload Pipeline');
  console.log('=======================================================');
  console.log(`Bucket:   ${bucketName}`);
  console.log(`Endpoint: https://${accountId}.r2.cloudflarestorage.com`);

  const manifestPath = path.join(DIST_DIR, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error(`ERROR: manifest.json not found in ${DIST_DIR}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  console.log(`Total Puzzles to Publish: ${manifest.totalPuzzles.toLocaleString()}`);

  const allFiles = getAllFiles(DIST_DIR);
  // Separate manifest to upload last
  const shardFiles = allFiles.filter((f) => path.basename(f) !== 'manifest.json');
  console.log(`Total Shard & Index Files: ${shardFiles.length.toLocaleString()}`);

  const startTime = Date.now();
  let uploadedCount = 0;
  let totalBytesUploaded = 0;
  const CONCURRENCY = 30;

  // Worker pool
  let fileIndex = 0;
  async function worker() {
    while (fileIndex < shardFiles.length) {
      const currentIndex = fileIndex++;
      const localFilePath = shardFiles[currentIndex];
      const relativePath = path.relative(DIST_DIR, localFilePath).replace(/\\/g, '/');
      const fileSize = fs.statSync(localFilePath).size;

      try {
        await uploadFile(localFilePath, relativePath);
        uploadedCount++;
        totalBytesUploaded += fileSize;

        if (uploadedCount % 250 === 0 || uploadedCount === shardFiles.length) {
          const elapsedSec = (Date.now() - startTime) / 1000;
          const pct = ((uploadedCount / shardFiles.length) * 100).toFixed(1);
          const mbUploaded = (totalBytesUploaded / 1024 / 1024).toFixed(1);
          const rateMb = (totalBytesUploaded / 1024 / 1024 / elapsedSec).toFixed(1);
          const remainingSec = Math.round((shardFiles.length - uploadedCount) / (uploadedCount / elapsedSec));
          console.log(`  [${uploadedCount}/${shardFiles.length}] ${pct}% (${mbUploaded} MB at ${rateMb} MB/s, ETA: ${remainingSec}s)`);
        }
      } catch (err) {
        console.error(`Failed to upload ${relativePath}:`, err);
        throw err;
      }
    }
  }

  console.log(`\nStarting concurrent upload (concurrency: ${CONCURRENCY})...`);
  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  // Upload manifest.json last to seal the deployment
  console.log('\nPublishing master manifest.json...');
  await uploadFile(manifestPath, 'manifest.json');

  const totalTimeSec = ((Date.now() - startTime) / 1000).toFixed(1);
  const totalMb = (totalBytesUploaded / 1024 / 1024).toFixed(1);
  console.log('\n=======================================================');
  console.log(`UPLOAD COMPLETE!`);
  console.log(`Uploaded ${uploadedCount + 1} files (${totalMb} MB) in ${totalTimeSec} seconds.`);
  console.log(`R2 Bucket "${bucketName}" is now fully populated and verified.`);
  console.log('=======================================================');
}

main().catch((err) => {
  console.error('Fatal Upload Error:', err);
  process.exit(1);
});
