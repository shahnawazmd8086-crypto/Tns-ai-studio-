const fs = require("fs");
const path = require("path");
const crypto = require("crypto");


function ensureDirectory(directory) {
  const resolved = path.resolve(directory);

  if (!fs.existsSync(resolved)) {
    fs.mkdirSync(resolved, {
      recursive: true
    });
  }

  return resolved;
}


function createProject(input = {}) {
  const now = new Date().toISOString();

  return {
    id: input.id || crypto.randomUUID(),
    name: input.name || "Untitled Project",
    description: input.description || "",
    format: input.format || "9:16",
    duration: Number(input.duration) || 0,
    status: input.status || "draft",
    clips: Array.isArray(input.clips)
      ? input.clips
      : [],
    audio: Array.isArray(input.audio)
      ? input.audio
      : [],
    text: Array.isArray(input.text)
      ? input.text
      : [],
    effects: Array.isArray(input.effects)
      ? input.effects
      : [],
    createdAt:
      input.createdAt || now,
    updatedAt:
      input.updatedAt || now
  };
}


function saveProject(
  project,
  directory
) {
  if (!project) {
    throw new Error(
      "Project data is required."
    );
  }

  const resolvedDirectory =
    ensureDirectory(directory);

  const safeProject =
    createProject(project);

  const filePath = path.join(
    resolvedDirectory,
    `${safeProject.id}.json`
  );

  fs.writeFileSync(
    filePath,
    JSON.stringify(
      safeProject,
      null,
      2
    ),
    "utf8"
  );

  return safeProject;
}


function loadProject(
  projectId,
  directory
) {
  if (!projectId) {
    throw new Error(
      "Project ID is required."
    );
  }

  const resolvedDirectory =
    path.resolve(directory);

  const filePath = path.join(
    resolvedDirectory,
    `${String(projectId)}.json`
  );

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const data =
    fs.readFileSync(
      filePath,
      "utf8"
    );

  return JSON.parse(data);
}


function updateProject(
  projectId,
  patch = {},
  directory
) {
  const project =
    loadProject(
      projectId,
      directory
    );

  if (!project) {
    return null;
  }

  const updatedProject = {
    ...project,
    ...patch,
    id: project.id,
    createdAt: project.createdAt,
    updatedAt:
      new Date().toISOString()
  };

  saveProject(
    updatedProject,
    directory
  );

  return updatedProject;
}


function deleteProject(
  projectId,
  directory
) {
  if (!projectId) {
    return false;
  }

  const resolvedDirectory =
    path.resolve(directory);

  const filePath = path.join(
    resolvedDirectory,
    `${String(projectId)}.json`
  );

  if (!fs.existsSync(filePath)) {
    return false;
  }

  fs.unlinkSync(filePath);

  return true;
}


function listProjects(directory) {
  const resolvedDirectory =
    ensureDirectory(directory);

  const files =
    fs.readdirSync(
      resolvedDirectory,
      {
        withFileTypes: true
      }
    );

  const projects = [];

  for (const file of files) {
    if (
      !file.isFile() ||
      path.extname(file.name)
        .toLowerCase() !== ".json"
    ) {
      continue;
    }

    try {
      const filePath =
        path.join(
          resolvedDirectory,
          file.name
        );

      const data =
        fs.readFileSync(
          filePath,
          "utf8"
        );

      projects.push(
        JSON.parse(data)
      );
    } catch (error) {
      continue;
    }
  }

  return projects;
}


function projectExists(
  projectId,
  directory
) {
  return (
    loadProject(
      projectId,
      directory
    ) !== null
  );
}


module.exports = {
  ensureDirectory,
  createProject,
  saveProject,
  loadProject,
  updateProject,
  deleteProject,
  listProjects,
  projectExists
};
