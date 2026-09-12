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

  return fs.existsSync(
    resolvePath(targetPath)
  );
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
  const json =
    JSON.stringify(
      data,
      null,
      2
    );

  return writeFile(
    filePath,
    json,
    "utf8"
  );
}


function readJson(filePath) {
  const content =
    readFile(
      filePath,
      "utf8"
    );

  return JSON.parse(content);
}


function deleteFile(filePath) {
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
  ).map((
