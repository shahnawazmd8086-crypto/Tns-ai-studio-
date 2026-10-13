const fs = require("fs");
const path = require("path");


function ensureDirectory(directory) {
  const resolved = path.resolve(directory);

  if (!fs.existsSync(resolved)) {
    fs.mkdirSync(resolved, {
      recursive: true
    });
  }

  return resolved;
}


function removeFile(filePath) {
  if (!filePath) {
    return false;
  }

  const resolved = path.resolve(filePath);

  if (!fs.existsSync(resolved)) {
    return false;
  }

  const stats = fs.statSync(resolved);

  if (!stats.isFile()) {
    return false;
  }

  fs.unlinkSync(resolved);

  return true;
}


function removeDirectory(directory) {
  if (!directory) {
    return false;
  }

  const resolved = path.resolve(directory);

  if (!fs.existsSync(resolved)) {
    return false;
  }

  const stats = fs.statSync(resolved);

  if (!stats.isDirectory()) {
    return false;
  }

  fs.rmSync(resolved, {
    recursive: true,
    force: true
  });

  return true;
}


function cleanDirectory(
  directory,
  options = {}
) {
  const resolved = ensureDirectory(directory);

  const maxAgeMs =
    Number(options.maxAgeMs) ||
    24 * 60 * 60 * 1000;

  const now = Date.now();

  let removed = 0;

  const entries = fs.readdirSync(
    resolved,
    {
      withFileTypes: true
    }
  );

  for (const entry of entries) {
    const fullPath = path.join(
      resolved,
      entry.name
    );

    try {
      const stats = fs.statSync(fullPath);

      const age =
        now - stats.mtimeMs;

      if (age < maxAgeMs) {
        continue;
      }

      if (entry.isFile()) {
        fs.unlinkSync(fullPath);
        removed += 1;
      } else if (entry.isDirectory()) {
        fs.rmSync(fullPath, {
          recursive: true,
          force: true
        });

        removed += 1;
      }
    } catch (error) {
      continue;
    }
  }

  return {
    directory: resolved,
    removed
  };
}


function cleanFiles(
  directory,
  options = {}
) {
  const resolved = ensureDirectory(directory);

  const maxAgeMs =
    Number(options.maxAgeMs) ||
    24 * 60 * 60 * 1000;

  const now = Date.now();

  let removed = 0;

  const entries = fs.readdirSync(
    resolved,
    {
      withFileTypes: true
    }
  );

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const fullPath = path.join(
      resolved,
      entry.name
    );

    try {
      const stats = fs.statSync(fullPath);

      if (
        now - stats.mtimeMs >=
        maxAgeMs
      ) {
        fs.unlinkSync(fullPath);
        removed += 1;
      }
    } catch (error) {
      continue;
    }
  }

  return {
    directory: resolved,
    removed
  };
}


function getDirectorySize(directory) {
  const resolved = path.resolve(directory);

  if (!fs.existsSync(resolved)) {
    return 0;
  }

  const stats = fs.statSync(resolved);

  if (!stats.isDirectory()) {
    return 0;
  }

  let total = 0;

  const entries = fs.readdirSync(
    resolved,
    {
      withFileTypes: true
    }
  );

  for (const entry of entries) {
    const fullPath = path.join(
      resolved,
      entry.name
    );

    try {
      const entryStats =
        fs.statSync(fullPath);

      if (entry.isFile()) {
        total += entryStats.size;
      } else if (entry.isDirectory()) {
        total += getDirectorySize(
          fullPath
        );
      }
    } catch (error) {
      continue;
    }
  }

  return total;
}


module.exports = {
  ensureDirectory,
  removeFile,
  removeDirectory,
  cleanDirectory,
  cleanFiles,
  getDirectorySize
};
