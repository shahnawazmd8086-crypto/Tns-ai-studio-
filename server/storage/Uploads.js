const fs = require("fs");
const path = require("path");
const crypto = require("crypto");


const DEFAULT_MAX_FILE_SIZE =
  500 * 1024 * 1024;


const ALLOWED_EXTENSIONS = new Set([
  ".mp4",
  ".mov",
  ".webm",
  ".avi",
  ".mkv",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".mp3",
  ".wav",
  ".m4a",
  ".aac",
  ".ogg"
]);


function ensureDirectory(directory) {
  const resolved = path.resolve(directory);

  if (!fs.existsSync(resolved)) {
    fs.mkdirSync(resolved, {
      recursive: true
    });
  }

  return resolved;
}


function sanitizeFileName(fileName) {
  return String(fileName || "upload")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 180) || "upload";
}


function getExtension(fileName) {
  return path
    .extname(String(fileName || ""))
    .toLowerCase();
}


function isAllowedExtension(fileName) {
  return ALLOWED_EXTENSIONS.has(
    getExtension(fileName)
  );
}


function validateUpload(
  fileName,
  size,
  options = {}
) {
  const safeSize =
    Number(size) || 0;

  const maxFileSize =
    Number(options.maxFileSize) ||
    DEFAULT_MAX_FILE_SIZE;

  if (!fileName) {
    throw new Error(
      "Upload file name is required."
    );
  }

  if (safeSize < 0) {
    throw new Error(
      "Invalid file size."
    );
  }

  if (safeSize > maxFileSize) {
    throw new Error(
      "File size exceeds the maximum allowed limit."
    );
  }

  if (
    options.checkExtension !== false &&
    !isAllowedExtension(fileName)
  ) {
    throw new Error(
      "This file type is not supported."
    );
  }

  return true;
}


function createUploadPath(
  directory,
  fileName
) {
  const resolvedDirectory =
    ensureDirectory(directory);

  const safeName =
    sanitizeFileName(fileName);

  const uniqueName =
    `${Date.now()}-${crypto.randomUUID()}-${safeName}`;

  return path.join(
    resolvedDirectory,
    uniqueName
  );
}


function saveUpload(
  source,
  directory,
  fileName,
  options = {}
) {
  if (!source) {
    throw new Error(
      "Upload source is required."
    );
  }

  if (!directory) {
    throw new Error(
      "Upload directory is required."
    );
  }

  if (!fileName) {
    throw new Error(
      "Upload file name is required."
    );
  }

  let data;

  if (Buffer.isBuffer(source)) {
    data = source;
  } else if (
    typeof source === "string"
  ) {
    data = Buffer.from(source);
  } else {
    throw new Error(
      "Upload source must be a Buffer or string."
    );
  }

  validateUpload(
    fileName,
    data.length,
    options
  );

  const outputPath =
    createUploadPath(
      directory,
      fileName
    );

  fs.writeFileSync(
    outputPath,
    data
  );

  return {
    id: crypto.randomUUID(),
    originalName: String(fileName),
    fileName: path.basename(outputPath),
    path: outputPath,
    extension: getExtension(fileName),
    size: data.length,
    createdAt:
      new Date().toISOString()
  };
}


function getUploadInfo(filePath) {
  if (!filePath) {
    return null;
  }

  const resolved =
    path.resolve(filePath);

  if (!fs.existsSync(resolved)) {
    return null;
  }

  const stats =
    fs.statSync(resolved);

  if (!stats.isFile()) {
    return null;
  }

  return {
    path: resolved,
    fileName:
      path.basename(resolved),
    extension:
      getExtension(resolved),
    size: stats.size,
    createdAt:
      stats.birthtime.toISOString(),
    modifiedAt:
      stats.mtime.toISOString()
  };
}


function uploadExists(filePath) {
  return getUploadInfo(filePath) !== null;
}


function deleteUpload(filePath) {
  if (!filePath) {
    return false;
  }

  const resolved =
    path.resolve(filePath);

  if (!fs.existsSync(resolved)) {
    return false;
  }

  const stats =
    fs.statSync(resolved);

  if (!stats.isFile()) {
    return false;
  }

  fs.unlinkSync(resolved);

  return true;
}


function listUploads(
  directory
) {
  const resolvedDirectory =
    ensureDirectory(directory);

  return fs.readdirSync(
    resolvedDirectory,
    {
      withFileTypes: true
    }
  )
    .filter(
      (entry) => entry.isFile()
    )
    .map((entry) => {
      const filePath =
        path.join(
          resolvedDirectory,
          entry.name
        );

      return getUploadInfo(filePath);
    })
    .filter(Boolean);
}


module.exports = {
  DEFAULT_MAX_FILE_SIZE,
  ALLOWED_EXTENSIONS,
  ensureDirectory,
  sanitizeFileName,
  getExtension,
  isAllowedExtension,
  validateUpload,
  createUploadPath,
  saveUpload,
  getUploadInfo,
  uploadExists,
  deleteUpload,
  listUploads
};
