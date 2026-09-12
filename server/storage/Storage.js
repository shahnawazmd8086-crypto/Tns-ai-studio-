const fs = require("fs");
const path = require("path");


function resolvePath(targetPath) {
  if (!targetPath) {
    throw new Error("Storage path is required.");
  }

  return path.resolve(String(targetPath));
}


function ensureDirectory(directory) {
  const resolved = resolvePath(directory);

  if (!fs.existsSync(resolved)) {
    fs.mkdirSync(resolved, {
      recursive: true
    });
  }

  return resolved;
}


function exists(targetPath) {
  if (!targetPath) {
    return false;
  }

  try {
    return fs.existsSync(
      resolvePath(targetPath)
    );
  } catch (error) {
    return false;
  }
}


function isFile(filePath) {
  if (!exists(filePath)) {
    return false;
  }

  try {
    return fs.statSync(
      resolvePath(filePath)
    ).isFile();
  } catch (error) {
    return false;
  }
}


function isDirectory(directory) {
  if (!exists(directory)) {
    return false;
  }

  try {
    return fs.statSync(
      resolvePath(directory)
    ).isDirectory();
  } catch (error) {
    return false;
  }
}


function writeFile(
  filePath,
  data,
  encoding = "utf8"
) {
  const resolved =
    resolvePath(filePath);

  ensureDirectory(
    path.dirname(resolved)
  );

  fs.writeFileSync(
    resolved,
    data,
    encoding
  );

  return resolved;
}


function readFile(
  filePath,
  encoding = "utf8"
) {
  const resolved =
    resolvePath(filePath);

  if (!isFile(resolved)) {
    throw new Error(
      `File does not exist: ${resolved}`
    );
  }

  return fs.readFileSync(
    resolved,
    encoding
  );
}


function writeJson(
  filePath,
  data
) {
  return writeFile(
    filePath,
    JSON.stringify(
      data,
      null,
      2
    ),
    "utf8"
  );
}


function readJson(filePath) {
  const content =
    readFile(
      filePath,
      "utf8"
    );

  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Invalid JSON file: ${resolvePath(filePath)}`
    );
  }
}


function deleteFile(filePath) {
  if (!filePath) {
    return false;
  }

  const resolved =
    resolvePath(filePath);

  if (!isFile(resolved)) {
    return false;
  }

  fs.unlinkSync(resolved);

  return true;
}


function deleteDirectory(
  directory
) {
  if (!directory) {
    return false;
  }

  const resolved =
    resolvePath(directory);

  if (!isDirectory(resolved)) {
    return false;
  }

  fs.rmSync(resolved, {
    recursive: true,
    force: true
  });

  return true;
}


function listDirectory(
  directory
) {
  const resolved =
    ensureDirectory(directory);

  return fs.readdirSync(
    resolved,
    {
      withFileTypes: true
    }
  ).map((entry) => ({
    name: entry.name,
    path: path.join(
      resolved,
      entry.name
    ),
    type: entry.isDirectory()
      ? "directory"
      : "file"
  }));
}


function getFileInfo(filePath) {
  if (!filePath) {
    return null;
  }

  const resolved =
    resolvePath(filePath);

  if (!exists(resolved)) {
    return null;
  }

  const stats =
    fs.statSync(resolved);

  return {
    path: resolved,
    name: path.basename(resolved),
    extension: path.extname(resolved),
    type: stats.isDirectory()
      ? "directory"
      : "file",
    size: stats.isFile()
      ? stats.size
      : 0,
    createdAt:
      stats.birthtime.toISOString(),
    modifiedAt:
      stats.mtime.toISOString()
  };
}


function copyFile(
  source,
  destination
) {
  const sourcePath =
    resolvePath(source);

  const destinationPath =
    resolvePath(destination);

  if (!isFile(sourcePath)) {
    throw new Error(
      `Source file does not exist: ${sourcePath}`
    );
  }

  ensureDirectory(
    path.dirname(destinationPath)
  );

  fs.copyFileSync(
    sourcePath,
    destinationPath
  );

  return destinationPath;
}


function moveFile(
  source,
  destination
) {
  const sourcePath =
    resolvePath(source);

  const destinationPath =
    resolvePath(destination);

  if (!isFile(sourcePath)) {
    throw new Error(
      `Source file does not exist: ${sourcePath}`
    );
  }

  ensureDirectory(
    path.dirname(destinationPath)
  );

  fs.renameSync(
    sourcePath,
    destinationPath
  );

  return destinationPath;
}


module.exports = {
  resolvePath,
  ensureDirectory,
  exists,
  isFile,
  isDirectory,
  writeFile,
  readFile,
  writeJson,
  readJson,
  deleteFile,
  deleteDirectory,
  listDirectory,
  getFileInfo,
  copyFile,
  moveFile
};
