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


function createMedia(input = {}) {
  const filePath = input.path || input.filePath || null;

  return {
    id: input.id || null,
    name: input.name || null,
    type: input.type || "unknown",
    mimeType: input.mimeType || null,
    path: filePath,
    size: Number(input.size) || 0,
    url: input.url || null,
    createdAt:
      input.createdAt ||
      new Date().toISOString()
  };
}


function getMediaInfo(filePath) {
  if (!filePath) {
    throw new Error("Media file path is required.");
  }

  const resolved = path.resolve(
    String(filePath)
  );

  if (!fs.existsSync(resolved)) {
    throw new Error(
      `Media file does not exist: ${resolved}`
    );
  }

  const stats = fs.statSync(resolved);

  if (!stats.isFile()) {
    throw new Error(
      "The specified media path is not a file."
    );
  }

  return {
    path: resolved,
    name: path.basename(resolved),
    extension: path.extname(resolved),
    size: stats.size,
    createdAt: stats.birthtime.toISOString(),
    modifiedAt: stats.mtime.toISOString()
  };
}


function mediaExists(filePath) {
  if (!filePath) {
    return false;
  }

  const resolved = path.resolve(
    String(filePath)
  );

  try {
    return (
      fs.existsSync(resolved) &&
      fs.statSync(resolved).isFile()
    );
  } catch (error) {
    return false;
  }
}


function deleteMedia(filePath) {
  if (!mediaExists(filePath)) {
    return false;
  }

  const resolved = path.resolve(
    String(filePath)
  );

  fs.unlinkSync(resolved);

  return true;
}


function copyMedia(
  input,
  output
) {
  if (!input) {
    throw new Error(
      "Input media path is required."
    );
  }

  if (!output) {
    throw new Error(
      "Output media path is required."
    );
  }

  const inputPath = path.resolve(
    String(input)
  );

  const outputPath = path.resolve(
    String(output)
  );

  if (!mediaExists(inputPath)) {
    throw new Error(
      `Input media does not exist: ${inputPath}`
    );
  }

  ensureDirectory(
    path.dirname(outputPath)
  );

  fs.copyFileSync(
    inputPath,
    outputPath
  );

  return getMediaInfo(outputPath);
}


function moveMedia(
  input,
  output
) {
  if (!input) {
    throw new Error(
      "Input media path is required."
    );
  }

  if (!output) {
    throw new Error(
      "Output media path is required."
    );
  }

  const inputPath = path.resolve(
    String(input)
  );

  const outputPath = path.resolve(
    String(output)
  );

  if (!mediaExists(inputPath)) {
    throw new Error(
      `Input media does not exist: ${inputPath}`
    );
  }

  ensureDirectory(
    path.dirname(outputPath)
  );

  fs.renameSync(
    inputPath,
    outputPath
  );

  return getMediaInfo(outputPath);
}


function listMedia(
  directory,
  options = {}
) {
  const resolved =
    ensureDirectory(directory);

  const recursive =
    Boolean(options.recursive);

  const results = [];

  function scan(currentDirectory) {
    const entries = fs.readdirSync(
      currentDirectory,
      {
        withFileTypes: true
      }
    );

    for (const entry of entries) {
      const fullPath = path.join(
        currentDirectory,
        entry.name
