// TNS AI Studio - Main Server

const http = require("http");
const fs = require("fs");
const path = require("path");

const { create, getJob } = require("./jobs/video-job");
const MockProvider = require("./providers/mock");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "..", "public");

const provider = new MockProvider();

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4"
};

function json(res, code, data) {
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8"
  });
  res.end(JSON.stringify(data));
}

function body(req) {
  return new Promise((resolve, reject) => {
    let data = "";

    req.on("data", chunk => {
      data += chunk;
      if (data.length > 1024 * 1024) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (!data) return resolve({});
      
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });

    req.on("error", reject);
  });
}

function safePublicPath(urlPath) {
  let clean = decodeURIComponent(urlPath.split("?")[0]);

  if (clean === "/") {
    clean = "/index.html";
  }

  const filePath = path.normalize(
    path.join(PUBLIC_DIR, clean)
  );

  if (
    filePath !== PUBLIC_DIR &&
    !filePath.startsWith(PUBLIC_DIR + path.sep)
  ) {
    return null;
  }

  return filePath;
}

const server = http.createServer(async (req, res) => {
  try {
    // Health check
    if (req.method === "GET" && req.url === "/health") {
      return json(res, 200, {
        ok: true,
        service: "TNS AI Studio",
        provider: provider.name
      });
    }

    // Create video job
    if (
      req.method === "POST" &&
      req.url === "/api/video/jobs"
    ) {
      const input = await body(req);

      const job = await create(provider.name, input);

      return json(res, 202, job);
    }

    // Get video job
    if (
      req.method === "GET" &&
      req.url.startsWith("/api/video/jobs/")
    ) {
      const id = req.url.split("/").pop();

      if (!id) {
        return json(res, 400, {
          error: "Job ID is required"
        });
      }

      const job = await getJob(id);

      if (!job) {
        return json(res, 404, {
          error: "Job not found"
        });
      }

      return json(res, 200, job);
    }

    // Static files
    if (req.method === "GET") {
      const filePath = safePublicPath(req.url);

      if (!filePath) {
        return json(res, 403, {
          error: "Forbidden"
        });
      }

      fs.stat(filePath, (err, stat) => {
        if (err || !stat.isFile()) {
          return json(res, 404, {
            error: "Not found"
          });
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType =
          mime[ext] || "application/octet-stream";

        res.writeHead(200, {
          "Content-Type": contentType
        });

        fs.createReadStream(filePath).pipe(res);
      });

      return;
    }

    return json(res, 404, {
      error: "Not found"
    });

  } catch (error) {
    console.error(error);

    return json(res, 400, {
      error: error.message || "Bad request"
    });
  }
});

server.listen(PORT, () => {
  console.log(
    `TNS AI Studio running on http://localhost:${PORT}`
  );
});
