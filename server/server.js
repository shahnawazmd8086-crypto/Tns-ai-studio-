const http = require("http");
const fs = require("fs");
const path = require("path");

const {
  create: createVideoJob,
  } = require("./jobs/video-job");
} = require("./jobs/video");

const {
  create: createImageJob,
  get} = require("./jobs/image-job");
} = require("./jobs/image");

const {
  registerProvider,
  getProvider
} = require("./providers/provider");

const MockProvider = require("./providers/mock");

registerProvider("mock", new MockProvider());

const PORT = process.env.PORT || 3000;

const PUBLIC_DIR = path.join(__dirname, "..", "public");

const voiceJobs = new Map();

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav"
};


function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });

  response.end(JSON.stringify(data));
}


function readBody(request, limit = 5 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = "";

    request.on("data", (chunk) => {
      raw += chunk.toString();

      if (raw.length > limit) {
        reject(new Error("Request body is too large."));
        request.destroy();
      }
    });

    request.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON request."));
      }
    });

    request.on("error", reject);
  });
}


function safePublicFile(requestPath) {
  const decoded = decodeURIComponent(
    requestPath.split("?")[0]
  );

  const relativePath =
    decoded.replace(/^\/+/, "") || "index.html";

  const fullPath = path.resolve(
    PUBLIC_DIR,
    relativePath
  );

  const publicRoot =
    path.resolve(PUBLIC_DIR) + path.sep;

  if (!fullPath.startsWith(publicRoot)) {
    return null;
  }

  return fullPath;
}


/* =========================
   VOICE JOB STORAGE
========================= */

function createVoiceJob(provider = "mock", input = {}) {
  const id = require("crypto").randomUUID();

  const job = {
    id,
    provider,
    type: "voice",
    status: "queued",
    progress: 0,
    input,
    result: null,
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  voiceJobs.set(id, job);

  return job;
}


function getVoiceJob(id) {
  return voiceJobs.get(id) || null;
}


/* =========================
   SERVER
========================= */

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(
      request.url,
      `http://${request.headers.host || "localhost"}`
    );


    /* =========================
       HEALTH CHECK
    ========================= */

    if (
      request.method === "GET" &&
      url.pathname === "/health"
    ) {
      return sendJson(response, 200, {
        ok: true,
        service: "tns-ai-studio",
        version: "1.0.0",
        time: new Date().toISOString()
      });
    }


    /* =========================
       AI VIDEO CREATE
    ========================= */

    if (
      request.method === "POST" &&
      url.pathname === "/api/video/jobs"
    ) {
      const input = await readBody(request);

      const providerName = String(
        process.env.VIDEO_PROVIDER || "mock"
      ).toLowerCase();

      const provider = getProvider(providerName);

      const job = await createVideoJob(
        providerName,
        input
      );

      if (
        provider &&
        typeof provider.create === "function"
      ) {
        try {
          job.providerJob =
            await provider.create(input);
        } catch (error) {
          job.status = "failed";
          job.error = error.message;
        }
      }

      return sendJson(response, 202, job);
    }


    /* =========================
       AI VIDEO STATUS
    ========================= */

    const videoMatch =
      url.pathname.match(
        /^\/api\/video\/jobs\/([^/]+)$/
      );

    if (
      request.method === "GET" &&
      videoMatch
    ) {
      const job = await getVideoJob(
        decodeURIComponent(videoMatch[1])
      );

      if (!job) {
        return sendJson(response, 404, {
          error: "Video job not found."
        });
      }

      return sendJson(response, 200, job);
    }


    /* =========================
       AI IMAGE CREATE
    ========================= */

    if (
      request.method === "POST" &&
      url.pathname === "/api/image/jobs"
    ) {
      const input = await readBody(request);

      const providerName = String(
        process.env.IMAGE_PROVIDER || "mock"
      ).toLowerCase();

      const provider = getProvider(providerName);

      const job = await createImageJob(
        providerName,
        input
      );

      if (
        provider &&
        typeof provider.createImage === "function"
      ) {
        try {
          job.providerJob =
            await provider.createImage(input);
        } catch (error) {
          job.status = "failed";
          job.error = error.message;
        }
      }

      return sendJson(response, 202, job);
    }


    /* =========================
       AI IMAGE STATUS
    ========================= */

    const imageMatch =
      url.pathname.match(
        /^\/api\/image\/jobs\/([^/]+)$/
      );

    if (
      request.method === "GET" &&
      imageMatch
    ) {
      const job = await getImageJob(
        decodeURIComponent(imageMatch[1])
      );

      if (!job) {
        return sendJson(response, 404, {
          error: "Image job not found."
        });
      }

      return sendJson(response, 200, job);
    }


    /* =========================
       AI VOICE CREATE
    ========================= */

    if (
      request.method === "POST" &&
      url.pathname === "/api/voice/jobs"
    ) {
      const input = await readBody(request);

      const providerName = String(
        process.env.VOICE_PROVIDER || "mock"
      ).toLowerCase();

      const job = createVoiceJob(
        providerName,
        input
      );

      const provider = getProvider(providerName);

      if (
        provider &&
        typeof provider.createVoice === "function"
      ) {
        try {
          job.providerJob =
            await provider.createVoice(input);
        } catch (error) {
          job.status = "failed";
          job.error = error.message;
        }
      }

      return sendJson(response, 202, job);
    }


    /* =========================
       AI VOICE STATUS
    ========================= */

    const voiceMatch =
      url.pathname.match(
        /^\/api\/voice\/jobs\/([^/]+)$/
      );

    if (
      request.method === "GET" &&
      voiceMatch
    ) {
      const job = getVoiceJob(
        decodeURIComponent(voiceMatch[1])
      );

      if (!job) {
        return sendJson(response, 404, {
          error: "Voice job not found."
        });
      }

      return sendJson(response, 200, job);
    }


    /* =========================
       VIDEO EDITOR EXPORT
    ========================= */

    if (
      request.method === "POST" &&
      url.pathname === "/api/editor/export"
    ) {
      const input = await readBody(request);

      const job = await createVideoJob(
        "ffmpeg",
        {
          operation: "export-mp4",
          ...input
        }
      );

      return sendJson(response, 202, job);
    }


    /* =========================
       API INFORMATION
    ========================= */

    if (
      request.method === "GET" &&
      url.pathname === "/api"
    ) {
      return sendJson(response, 200, {
        name: "TNS AI Studio API",
        version: "1.0.0",
        endpoints: {
          health: "GET /health",
          videoCreate: "POST /api/video/jobs",
          videoStatus: "GET /api/video/jobs/:id",
          imageCreate: "POST /api/image/jobs",
          imageStatus: "GET /api/image/jobs/:id",
          voiceCreate: "POST /api/voice/jobs",
          voiceStatus: "GET /api/voice/jobs/:id",
          editorExport: "POST /api/editor/export"
        }
      });
    }


    /* =========================
       STATIC FRONTEND
    ========================= */

    if (request.method === "GET") {
      const filePath =
        safePublicFile(url.pathname);

      if (!filePath) {
        return sendJson(response, 403, {
          error: "Forbidden."
        });
      }

      let target = filePath;

      if (
        !fs.existsSync(target) ||
        fs.statSync(target).isDirectory()
      ) {
        target =
          path.join(PUBLIC_DIR, "index.html");
      }

      const extension =
        path.extname(target).toLowerCase();

      response.writeHead(200, {
        "Content-Type":
          MIME_TYPES[extension] ||
          "application/octet-stream"
      });

      return fs
        .createReadStream(target)
        .pipe(response);
    }


    /* =========================
       NOT FOUND
    ========================= */

    return sendJson(response, 404, {
      error: "Not found."
    });

  } catch (error) {

    console.error(error);

    return sendJson(response, 500, {
      error:
        error.message ||
        "Internal server error."
    });
  }
});


/* =========================
   START SERVER
========================= */

server.listen(PORT, () => {
  console.log(
    `TNS AI Studio running on port ${PORT}`
  );
});
