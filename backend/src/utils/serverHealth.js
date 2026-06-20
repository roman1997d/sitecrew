const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');
const pool = require('../db/pool');
const env = require('../config/env');
const { checkAiScanService } = require('./moderationHealth');

const execFileAsync = promisify(execFile);

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.bmp', '.svg']);

function getUploadRoot() {
  return path.resolve(__dirname, '..', '..', env.uploadDir);
}

function normalizeUploadReference(value) {
  if (!value) {
    return null;
  }

  const normalized = String(value).trim().replace(/\\/g, '/');
  if (!normalized.startsWith('/uploads/')) {
    return null;
  }

  return normalized.replace(/^\/uploads\//, '');
}

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  if (value < 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

function getMemorySnapshot() {
  const processMemory = process.memoryUsage();
  const totalSystemMemory = os.totalmem();
  const freeSystemMemory = os.freemem();
  const usedSystemMemory = totalSystemMemory - freeSystemMemory;

  return {
    process: {
      rssBytes: processMemory.rss,
      rssLabel: formatBytes(processMemory.rss),
      heapUsedBytes: processMemory.heapUsed,
      heapUsedLabel: formatBytes(processMemory.heapUsed),
      heapTotalBytes: processMemory.heapTotal,
      heapTotalLabel: formatBytes(processMemory.heapTotal),
      externalBytes: processMemory.external,
      externalLabel: formatBytes(processMemory.external),
      arrayBuffersBytes: processMemory.arrayBuffers || 0,
      arrayBuffersLabel: formatBytes(processMemory.arrayBuffers || 0),
    },
    system: {
      totalBytes: totalSystemMemory,
      totalLabel: formatBytes(totalSystemMemory),
      usedBytes: usedSystemMemory,
      usedLabel: formatBytes(usedSystemMemory),
      freeBytes: freeSystemMemory,
      freeLabel: formatBytes(freeSystemMemory),
      usedPercent: totalSystemMemory > 0
        ? Number(((usedSystemMemory / totalSystemMemory) * 100).toFixed(1))
        : 0,
    },
  };
}

function buildMemoryBreakdown(memory) {
  const total = memory.system.totalBytes;
  const processRss = memory.process.rssBytes;
  const systemUsed = memory.system.usedBytes;
  const systemFree = memory.system.freeBytes;
  const otherAppsEstimate = Math.max(0, systemUsed - processRss);

  const percentOfTotal = (bytes) => (
    total > 0 ? Number(((bytes / total) * 100).toFixed(1)) : 0
  );

  return {
    note: 'The large system memory figure is for the entire computer (macOS, Cursor, browsers, PostgreSQL, Docker, etc.). SiteCrew backend uses only a small part of it.',
    segments: [
      {
        id: 'system_used',
        label: 'Used by all apps and the operating system',
        bytes: systemUsed,
        sizeLabel: memory.system.usedLabel,
        percentOfTotalRam: memory.system.usedPercent,
        description: 'Total RAM currently in use on this machine.',
      },
      {
        id: 'sitecrew_backend',
        label: 'SiteCrew backend API process',
        bytes: processRss,
        sizeLabel: memory.process.rssLabel,
        percentOfTotalRam: percentOfTotal(processRss),
        description: 'This Node.js backend only — not the whole platform stack.',
      },
      {
        id: 'other_apps_estimate',
        label: 'Other applications and OS services (estimated)',
        bytes: otherAppsEstimate,
        sizeLabel: formatBytes(otherAppsEstimate),
        percentOfTotalRam: percentOfTotal(otherAppsEstimate),
        description: 'System used memory minus the SiteCrew backend RSS estimate.',
      },
      {
        id: 'system_free',
        label: 'Available system memory',
        bytes: systemFree,
        sizeLabel: memory.system.freeLabel,
        percentOfTotalRam: percentOfTotal(systemFree),
        description: 'Memory still available for apps and file cache.',
      },
    ],
    processDetails: [
      { label: 'Process RSS', value: memory.process.rssLabel, detail: 'Resident memory for the backend process.' },
      { label: 'V8 heap used', value: memory.process.heapUsedLabel, detail: 'JavaScript objects currently in heap.' },
      { label: 'V8 heap allocated', value: memory.process.heapTotalLabel, detail: 'Total heap reserved by V8.' },
      { label: 'External memory', value: memory.process.externalLabel, detail: 'Native bindings and buffers outside V8 heap.' },
      { label: 'Array buffers', value: memory.process.arrayBuffersLabel, detail: 'Shared array buffers accounted separately.' },
    ],
  };
}

async function getTopMemoryProcesses(limit = 10) {
  if (!['darwin', 'linux'].includes(process.platform)) {
    return [];
  }

  try {
    const args = process.platform === 'darwin'
      ? ['-axo', 'rss=,command=']
      : ['-eo', 'rss=,comm=', '--sort=-rss'];
    const { stdout } = await execFileAsync('ps', args, { maxBuffer: 1024 * 1024 });
    const totalSystemMemory = os.totalmem();

    return stdout
      .trim()
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^(\d+)\s+(.+)$/);
        if (!match) {
          return null;
        }

        const memoryBytes = Number(match[1]) * 1024;
        return {
          name: match[2].trim().slice(0, 120),
          memoryBytes,
          memoryLabel: formatBytes(memoryBytes),
          percentOfTotalRam: totalSystemMemory > 0
            ? Number(((memoryBytes / totalSystemMemory) * 100).toFixed(1))
            : 0,
        };
      })
      .filter(Boolean)
      .sort((left, right) => right.memoryBytes - left.memoryBytes)
      .slice(0, limit);
  } catch (error) {
    return [];
  }
}

async function getUploadStorageUsage() {
  const uploadRoot = getUploadRoot();

  try {
    const files = await walkUploadFiles(uploadRoot);
    let totalBytes = 0;

    for (const relativePath of files) {
      const stat = await fs.stat(path.join(uploadRoot, relativePath));
      totalBytes += stat.size;
    }

    return {
      fileCount: files.length,
      totalBytes,
      totalLabel: formatBytes(totalBytes),
    };
  } catch (error) {
    return {
      fileCount: 0,
      totalBytes: 0,
      totalLabel: '0 B',
    };
  }
}

async function collectReferencedUploadPaths() {
  const referenced = new Set();

  const addValue = (value) => {
    const normalized = normalizeUploadReference(value);
    if (normalized) {
      referenced.add(normalized);
    }
  };

  const [
    feedPosts,
    stories,
    workerPhotos,
    companyLogos,
    mediaQueue,
  ] = await Promise.all([
    pool.query('SELECT unnest(media_urls) AS path FROM feed_posts'),
    pool.query('SELECT media_url FROM stories WHERE media_url IS NOT NULL'),
    pool.query('SELECT profile_photo FROM worker_profiles WHERE profile_photo IS NOT NULL'),
    pool.query('SELECT logo FROM company_profiles WHERE logo IS NOT NULL'),
    pool.query('SELECT file_path, thumbnail_path FROM media_review_queue'),
  ]);

  feedPosts.rows.forEach((row) => addValue(row.path));
  stories.rows.forEach((row) => addValue(row.media_url));
  workerPhotos.rows.forEach((row) => addValue(row.profile_photo));
  companyLogos.rows.forEach((row) => addValue(row.logo));
  mediaQueue.rows.forEach((row) => {
    addValue(row.file_path);
    addValue(row.thumbnail_path);
  });

  return referenced;
}

async function walkUploadFiles(rootDir, relativeDir = '') {
  let entries;
  try {
    entries = await fs.readdir(path.join(rootDir, relativeDir), { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const files = [];

  for (const entry of entries) {
    const relativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...await walkUploadFiles(rootDir, relativePath));
      continue;
    }

    if (entry.isFile()) {
      files.push(relativePath.replace(/\\/g, '/'));
    }
  }

  return files;
}

function isPictureFile(relativePath) {
  return IMAGE_EXTENSIONS.has(path.extname(relativePath).toLowerCase());
}

async function getServerOverview() {
  const memory = getMemorySnapshot();
  const [aiScan, dbStatus, topProcesses, uploadStorage] = await Promise.all([
    checkAiScanService(),
    checkDatabasePanic(),
    getTopMemoryProcesses(12),
    getUploadStorageUsage(),
  ]);

  const uploadRoot = getUploadRoot();
  let uploadDirExists = false;
  let uploadPictureCount = 0;

  try {
    const files = await walkUploadFiles(uploadRoot);
    uploadDirExists = true;
    uploadPictureCount = files.filter(isPictureFile).length;
  } catch (error) {
    uploadDirExists = false;
  }

  return {
    generatedAt: new Date().toISOString(),
    runtime: {
      nodeVersion: process.version,
      platform: `${os.platform()} ${os.arch()}`,
      hostname: os.hostname(),
      cpuCount: os.cpus().length,
      processUptimeSeconds: Math.floor(process.uptime()),
      processUptimeLabel: formatDuration(process.uptime()),
      systemUptimeSeconds: Math.floor(os.uptime()),
      systemUptimeLabel: formatDuration(os.uptime()),
      backendPort: env.port,
      uploadDir: env.uploadDir,
      uploadDirExists,
      uploadPictureCount,
    },
    memory,
    memoryBreakdown: buildMemoryBreakdown(memory),
    topProcesses,
    storage: {
      uploads: uploadStorage,
      note: 'Upload storage is disk space, not RAM. It is shown here to avoid confusing files on disk with memory usage.',
    },
    services: {
      aiScan,
      database: dbStatus,
    },
  };
}

async function checkServerPanic() {
  const checks = [];
  let panic = false;

  const memory = getMemorySnapshot();
  const heapPressure = memory.process.heapTotalBytes > 0
    ? (memory.process.heapUsedBytes / memory.process.heapTotalBytes) * 100
    : 0;

  checks.push({
    name: 'Process uptime',
    status: process.uptime() > 0 ? 'ok' : 'panic',
    detail: `Backend process has been running for ${formatDuration(process.uptime())}.`,
  });

  if (process.uptime() <= 0) {
    panic = true;
  }

  checks.push({
    name: 'Heap memory pressure',
    status: heapPressure >= 95 ? 'panic' : heapPressure >= 85 ? 'warning' : 'ok',
    detail: `Heap usage is ${heapPressure.toFixed(1)}% (${memory.process.heapUsedLabel} of ${memory.process.heapTotalLabel}).`,
  });

  if (heapPressure >= 95) {
    panic = true;
  }

  checks.push({
    name: 'System memory usage',
    status: memory.system.usedPercent >= 95 ? 'panic' : memory.system.usedPercent >= 90 ? 'warning' : 'ok',
    detail: `System memory used: ${memory.system.usedLabel} of ${memory.system.totalLabel} (${memory.system.usedPercent}%).`,
  });

  if (memory.system.usedPercent >= 95) {
    panic = true;
  }

  const uploadRoot = getUploadRoot();
  try {
    await fs.access(uploadRoot);
    checks.push({
      name: 'Upload directory',
      status: 'ok',
      detail: `Upload directory is reachable at ${uploadRoot}.`,
    });
  } catch (error) {
    panic = true;
    checks.push({
      name: 'Upload directory',
      status: 'panic',
      detail: `Upload directory is not reachable: ${error.message}`,
    });
  }

  const aiScan = await checkAiScanService();
  if (env.aiScanEnabled && !aiScan.ok) {
    checks.push({
      name: 'AI Scan service',
      status: 'warning',
      detail: 'AI Scan microservice is unavailable. Backend is using local rules fallback.',
    });
  } else {
    checks.push({
      name: 'AI Scan service',
      status: 'ok',
      detail: env.aiScanEnabled ? `AI Scan is online (${aiScan.mode}).` : 'AI Scan microservice is disabled; local rules only.',
    });
  }

  return {
    panic,
    status: panic ? 'panic' : 'ok',
    message: panic
      ? 'Server panic detected. One or more critical runtime checks failed.'
      : 'No server panic detected. Runtime checks passed.',
    checks,
    checkedAt: new Date().toISOString(),
  };
}

async function checkDatabasePanic() {
  const startedAt = Date.now();

  try {
    await pool.query('SELECT 1 AS ok');
    const durationMs = Date.now() - startedAt;

    return {
      panic: false,
      status: 'ok',
      message: 'Database connection is healthy.',
      detail: `PostgreSQL responded in ${durationMs} ms.`,
      pool: {
        totalConnections: pool.totalCount,
        idleConnections: pool.idleCount,
        waitingRequests: pool.waitingCount,
      },
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      panic: true,
      status: 'panic',
      message: 'Database panic detected. The backend cannot reach PostgreSQL.',
      detail: error.message,
      pool: {
        totalConnections: pool.totalCount,
        idleConnections: pool.idleCount,
        waitingRequests: pool.waitingCount,
      },
      checkedAt: new Date().toISOString(),
    };
  }
}

async function scanAbandonedPictureFiles() {
  const uploadRoot = getUploadRoot();
  const referenced = await collectReferencedUploadPaths();
  const files = await walkUploadFiles(uploadRoot);
  const pictureFiles = files.filter(isPictureFile);

  const abandoned = [];

  for (const relativePath of pictureFiles) {
    if (!referenced.has(relativePath)) {
      const absolutePath = path.join(uploadRoot, relativePath);
      const stat = await fs.stat(absolutePath);
      abandoned.push({
        path: `/uploads/${relativePath}`,
        relativePath,
        sizeBytes: stat.size,
        sizeLabel: formatBytes(stat.size),
        modifiedAt: stat.mtime.toISOString(),
      });
    }
  }

  abandoned.sort((left, right) => left.path.localeCompare(right.path));

  const abandonedBytes = abandoned.reduce((sum, file) => sum + file.sizeBytes, 0);

  return {
    scannedAt: new Date().toISOString(),
    uploadDir: uploadRoot,
    totalPictureFiles: pictureFiles.length,
    referencedPictureFiles: pictureFiles.length - abandoned.length,
    abandonedCount: abandoned.length,
    abandonedSizeBytes: abandonedBytes,
    abandonedSizeLabel: formatBytes(abandonedBytes),
    abandonedFiles: abandoned,
    message: abandoned.length
      ? `Found ${abandoned.length} abandoned picture file(s) using ${formatBytes(abandonedBytes)} of storage.`
      : 'No abandoned picture files were found.',
  };
}

async function deleteAbandonedPictureFiles() {
  const scan = await scanAbandonedPictureFiles();
  const uploadRoot = getUploadRoot();
  const deleted = [];
  const failed = [];

  for (const file of scan.abandonedFiles) {
    const absolutePath = path.join(uploadRoot, file.relativePath);

    try {
      await fs.unlink(absolutePath);
      deleted.push(file);
    } catch (error) {
      failed.push({
        ...file,
        error: error.message,
      });
    }
  }

  const deletedBytes = deleted.reduce((sum, file) => sum + file.sizeBytes, 0);

  return {
    scannedAt: scan.scannedAt,
    deletedAt: new Date().toISOString(),
    abandonedCount: scan.abandonedCount,
    deletedCount: deleted.length,
    failedCount: failed.length,
    deletedSizeBytes: deletedBytes,
    deletedSizeLabel: formatBytes(deletedBytes),
    deletedFiles: deleted,
    failedFiles: failed,
    message: deleted.length
      ? `Deleted ${deleted.length} abandoned picture file(s), freeing ${formatBytes(deletedBytes)} of storage.`
      : scan.abandonedCount
        ? 'No abandoned picture files could be deleted.'
        : 'No abandoned picture files were found to delete.',
  };
}

module.exports = {
  getServerOverview,
  checkServerPanic,
  checkDatabasePanic,
  scanAbandonedPictureFiles,
  deleteAbandonedPictureFiles,
  formatBytes,
};
