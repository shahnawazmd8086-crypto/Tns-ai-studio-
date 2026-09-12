const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const API_BASE =
  window.TNSAPIConfig?.baseURL || "";


/* =========================
   AUTHENTICATION HELPERS
========================= */

function getCurrentAuthUser() {
  if (
    window.TNSAuth &&
    typeof window.TNSAuth.getCurrentUser === "function"
  ) {
    return window.TNSAuth.getCurrentUser();
  }

  return null;
}


function isAuthenticated() {
  if (
    window.TNSAuth &&
    typeof window.TNSAuth.isLoggedIn === "function"
  ) {
    return window.TNSAuth.isLoggedIn();
  }

  return false;
}


function sessionKey() {
  const user = getCurrentAuthUser();

  const email =
    user?.email ||
    "unknown-user";

  return `tnsProjects_${String(email)
    .toLowerCase()
    .replace(/[^a-z0-9@._-]/gi, "_")}`;
}


/* =========================
   TAB NAVIGATION
========================= */

$$(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    $$(".tab").forEach((item) =>
      item.classList.remove("active")
    );

    $$(".panel").forEach((panel) =>
      panel.classList.remove("active")
    );

    button.classList.add("active");

    const panel =
      $("#" + button.dataset.tab);

    if (panel) {
      panel.classList.add("active");
    }

    if (
      button.dataset.tab === "projects"
    ) {
      renderProjects();
    }
  });
});


/* =========================
   THEME
========================= */

$("#themeBtn")?.addEventListener(
  "click",
  () => {
    document.body.classList.toggle("light");

    localStorage.setItem(
      "tnsTheme",
      document.body.classList.contains("light")
        ? "light"
        : "dark"
    );
  }
);


if (
  localStorage.getItem("tnsTheme") ===
  "light"
) {
  document.body.classList.add("light");
}


/* =========================
   AI VIDEO PLAN
========================= */

function buildPlan() {
  const idea =
    $("#idea")?.value.trim() ||
    "Create a visually engaging original video.";

  const character =
    localStorage.getItem("tnsChar") ||
    "Create and lock one suitable character for this idea before generation.";

  const plan = `TNS AI VIDEO PRODUCTION PLAN

VIDEO IDEA / SCRIPT
${idea}

CATEGORY
${$("#type")?.value || "Realistic"}

LANGUAGE
${$("#language")?.value || "English"}

FORMAT
${$("#format")?.value || "9:16"}

DURATION
${$("#duration")?.value || "60 seconds"}

CAMERA
${$("#camera")?.value || "Natural"}

VISUAL STYLE
${$("#style")?.value || "Photorealistic"}


PRODUCTION STRUCTURE

1. Hook
Start with an immediate and visually interesting opening.

2. Setup
Clearly establish the characters, objects, location and environment.

3. Scene Breakdown
Divide the script into logical scenes with clear visual continuity.

4. Main Action
Show the important actions and transformation clearly.

5. Voice / Dialogue
If a character speaks, show the relevant materials or actions while speaking and use natural lip-sync.

6. Final Reveal
Create a strong and satisfying final shot.


VISUAL QUALITY

- High-quality generation
- Natural movement
- Consistent lighting
- Logical scene continuity
- Clean composition
- Realistic materials
- Natural facial expressions
- No random object changes
- No unnecessary character changes


LOCKED CHARACTER

${character}


LONG VIDEO WORKFLOW

For long videos, divide the script into multiple scenes.
Generate separate scene jobs and combine them during the server-side production process.


IMPORTANT

Actual AI video generation requires a connected AI video provider.
The frontend prepares the production request and sends it to the secure backend.`;

  if ($("#plan")) {
    $("#plan").textContent = plan;
  }

  return plan;
}


$("#buildBtn")?.addEventListener(
  "click",
  buildPlan
);


/* =========================
   COPY PLAN
========================= */

$("#copyBtn")?.addEventListener(
  "click",
  async () => {
    const text =
      $("#plan")?.textContent || "";

    try {
      await navigator.clipboard.writeText(
        text
      );

      $("#copyBtn").textContent =
        "Copied ✓";

      setTimeout(() => {
        $("#copyBtn").textContent =
          "Copy Plan";
      }, 1200);
    } catch {
      alert("Could not copy the plan.");
    }
  }
);


/* =========================
   LOCKED CHARACTER
========================= */

$("#lockBtn")?.addEventListener(
  "click",
  () => {
    const character = `LOCKED CHARACTER

Name:
${$("#charName")?.value.trim() || "Unnamed Character"}

Age / Gender:
${$("#charAge")?.value.trim() || "Not specified"}

Face / Hair / Facial Features:
${$("#charFace")?.value.trim() || "Not specified"}

Body / Clothing / Accessories:
${$("#charOutfit")?.value.trim() || "Not specified"}


LOCK RULE

One idea = one locked character.

Repeat the exact character description in every scene prompt for this idea.

Never change:
- Face
- Identity
- Age
- Gender
- Hairstyle
- Hair color
- Facial features
- Body type
- Clothing
- Clothing colors
- Footwear
- Gloves
- Accessories

Only these may change:
- Pose
- Body position
- Facial expression
- Hand movement
- Action`;

    if ($("#charOutput")) {
      $("#charOutput").textContent =
        character;
    }

    localStorage.setItem(
      "tnsChar",
      character
    );
  }
);


/* =========================
   AI VIDEO JOB
========================= */

async function startAIJob() {
  const plan = buildPlan();

  if ($("#jobBox")) {
    $("#jobBox").textContent =
      "AI video status: submitting...";
  }

  try {
    const response = await fetch(
      `${API_BASE}/api/video/jobs`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          idea:
            $("#idea")?.value || "",

          type:
            $("#type")?.value || "",

          format:
            $("#format")?.value || "",

          duration:
            $("#duration")?.value || "",

          language:
            $("#language")?.value || "",

          camera:
            $("#camera")?.value || "",

          style:
            $("#style")?.value || "",

          plan,

          character:
            localStorage.getItem(
              "tnsChar"
            ) || ""
        })
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "Could not create AI video job."
      );
    }

    $("#jobBox").textContent =
      `AI video status: ${
        data.status || "queued"
      } • Job: ${
        data.id || "unknown"
      }`;

    if (data.id) {
      pollVideoJob(data.id);
    }
  } catch (error) {
    $("#jobBox").textContent =
      `AI video status: ${error.message}`;
  }
}


$("#generateBtn")?.addEventListener(
  "click",
  startAIJob
);


async function pollVideoJob(jobId) {
  let attempts = 0;

  const timer = setInterval(
    async () => {
      attempts++;

      try {
        const response =
          await fetch(
            `${API_BASE}/api/video/jobs/${encodeURIComponent(
              jobId
            )}`
          );

        const job =
          await response.json();

        $("#jobBox").textContent =
          `AI video status: ${
            job.status || "unknown"
          } • Job: ${jobId}`;

        if (job.result?.url) {
          $("#jobBox").innerHTML =
            `AI video completed • <a href="${job.result.url}" target="_blank" rel="noopener">Open Video</a>`;
        }

        if (
          [
            "completed",
            "failed",
            "cancelled"
          ].includes(job.status) ||
          attempts >= 60
        ) {
          clearInterval(timer);
        }
      } catch {
        if (attempts >= 8) {
          clearInterval(timer);
        }
      }
    },
    2000
  );
}


/* =========================
   AI IMAGE CREATOR
========================= */

$("#generateImageBtn")?.addEventListener(
  "click",
  async () => {
    const prompt =
      $("#imagePrompt")?.value.trim();

    if (!prompt) {
      alert(
        "Please enter an image script or prompt."
      );
      return;
    }

    $("#imageStatus").textContent =
      "AI image status: submitting...";

    try {
      const response =
        await fetch(
          `${API_BASE}/api/image/jobs`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              prompt,

              style:
                $("#imageStyle")?.value ||
                "Photorealistic",

              ratio:
                $("#imageRatio")?.value ||
                "9:16"
            })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not create image job."
        );
      }

      $("#imageStatus").textContent =
        `AI image status: ${
          data.status || "queued"
        } • Job: ${
          data.id || "unknown"
        }`;

      if (data.id) {
        pollImageJob(data.id);
      }
    } catch (error) {
      $("#imageStatus").textContent =
        `AI image status: ${error.message}`;
    }
  }
);


async function pollImageJob(jobId) {
  let attempts = 0;

  const timer = setInterval(
    async () => {
      attempts++;

      try {
        const response =
          await fetch(
            `${API_BASE}/api/image/jobs/${encodeURIComponent(
              jobId
            )}`
          );

        const data =
          await response.json();

        $("#imageStatus").textContent =
          `AI image status: ${
            data.status || "unknown"
          } • Job: ${jobId}`;

        if (data.result?.url) {
          const box =
            $("#imagePreviewBox");

          if (box) {
            box.innerHTML = "";

            const image =
              document.createElement(
                "img"
              );

            image.src =
              data.result.url;

            image.alt =
              "Generated AI image";

            box.appendChild(image);
          }
        }

        if (
          [
            "completed",
            "failed",
            "cancelled"
          ].includes(data.status) ||
          attempts >= 60
        ) {
          clearInterval(timer);
        }
      } catch {
        if (attempts >= 8) {
          clearInterval(timer);
        }
      }
    },
    2000
  );
}


/* =========================
   SAVE IMAGE
========================= */

$("#saveImageBtn")?.addEventListener(
  "click",
  () => {
    const image =
      $("#imagePreviewBox img");

    if (!image?.src) {
      alert(
        "Generate an image first."
      );
      return;
    }

    const link =
      document.createElement("a");

    link.href = image.src;
    link.target = "_blank";
    link.rel = "noopener";
    link.download =
      "tns-ai-image.png";

    document.body.appendChild(link);

    link.click();

    link.remove();
  }
);


/* =========================
   VIDEO UPLOAD
========================= */

$("#videoFile")?.addEventListener(
  "change",
  (event) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const preview =
      $("#preview");

    if (preview) {
      if (
        preview.dataset.objectUrl
      ) {
        URL.revokeObjectURL(
          preview.dataset.objectUrl
        );
      }

      const objectUrl =
        URL.createObjectURL(file);

      preview.dataset.objectUrl =
        objectUrl;

      preview.src = objectUrl;

      preview.load();
    }

    const timeline =
      $("#timeline");

    if (timeline) {
      timeline.innerHTML = "";

      const clip =
        document.createElement(
          "div"
        );

      clip.className = "clip";

      clip.textContent =
        `${file.name} • ${(file.size / 1024 / 1024).toFixed(1)} MB`;

      timeline.appendChild(clip);
    }
  }
);


/* =========================
   EDITOR TOOLS
========================= */

$$("[data-tool]").forEach(
  (button) => {
    button.addEventListener(
      "click",
      () => {
        const tool =
          button.dataset.tool;

        $("#editStatus").textContent =
          `${tool}: selected. The final media operation will be processed by the backend.`;
      }
    );
  }
);


/* =========================
   VIDEO EXPORT
========================= */

$("#exportBtn")?.addEventListener(
  "click",
  async () => {
    $("#editStatus").textContent =
      "Export: submitting...";

    try {
      const response =
        await fetch(
          `${API_BASE}/api/editor/export`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              format:
                $("#format")?.value ||
                "9:16",

              operation:
                "export-mp4"
            })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Export request failed."
        );
      }

      $("#editStatus").textContent =
        `Export job: ${
          data.id || "unknown"
        } • ${
          data.status || "queued"
        }`;
    } catch (error) {
      $("#editStatus").textContent =
        `Export server unavailable: ${error.message}`;
    }
  }
);


/* =========================
   RESET VIDEO
========================= */

$("#resetVideo")?.addEventListener(
  "click",
  () => {
    const preview =
      $("#preview");

    if (preview) {
      if (
        preview.dataset.objectUrl
      ) {
        URL.revokeObjectURL(
          preview.dataset.objectUrl
        );

        delete preview.dataset.objectUrl;
      }

      preview.removeAttribute("src");
      preview.load();
    }

    if ($("#videoFile")) {
      $("#videoFile").value = "";
    }

    if ($("#timeline")) {
      $("#timeline").innerHTML = "";
    }

    if ($("#timelineTime")) {
      $("#timelineTime").textContent =
        "00:00";
    }

    $("#editStatus").textContent =
      "Video preview reset.";
  }
);


/* =========================
   VIDEO TIMELINE TIME
========================= */

$("#preview")?.addEventListener(
  "timeupdate",
  () => {
    const video =
      $("#preview");

    if (
      !video ||
      !$("#timelineTime")
    ) {
      return;
    }

    const seconds =
      Math.floor(
        video.currentTime || 0
      );

    const minutes =
      Math.floor(seconds / 60);

    const remainingSeconds =
      seconds % 60;

    $("#timelineTime").textContent =
      `${String(minutes).padStart(
        2,
        "0"
      )}:${String(
        remainingSeconds
      ).padStart(2, "0")}`;
  }
);


/* =========================
   VOICE
========================= */

$("#voiceBtn")?.addEventListener(
  "click",
  async () => {
    const dialogue =
      $("#dialogue")?.value.trim();

    if (!dialogue) {
      alert(
        "Please enter dialogue or a voice script."
      );
      return;
    }

    const voicePlan =
      `VOICE PRODUCTION PLAN

Language:
${$("#voiceLanguage")?.value || "English"}

Voice:
${$("#voiceName")?.value || "Natural Voice"}

Style:
${$("#voiceStyle")?.value || "Natural"}

Speed:
${$("#voiceSpeed")?.value || "1.0x"}

Dialogue:
${dialogue}

AUDIO RULES

- Natural pronunciation
- Clear speech
- Natural pacing
- Clean audio
- Scene timing synchronization
- Natural character dialogue where applicable`;

    $("#voiceOutput").textContent =
      voicePlan;

    try {
      const response =
        await fetch(
          `${API_BASE}/api/voice/jobs`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              language:
                $("#voiceLanguage")?.value ||
                "English",

              voice:
                $("#voiceName")?.value ||
                "Natural Voice",

              style:
                $("#voiceStyle")?.value ||
                "Natural",

              speed:
                $("#voiceSpeed")?.value ||
                "1.0x",

              dialogue
            })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not create voice job."
        );
      }

      $("#voiceOutput").textContent +=
        `\n\nServer Job: ${
          data.id || "unknown"
        } • ${
          data.status || "queued"
        }`;
    } catch (error) {
      $("#voiceOutput").textContent +=
        `\n\nVoice server: ${error.message}`;
    }
  }
);


/* =========================
   PROJECT STORAGE
========================= */

function currentProject() {
  return {
    title:
      (
        $("#idea")?.value ||
        "Untitled TNS Project"
      ).slice(0, 100),

    date:
      new Date().toLocaleString(),

    type:
      $("#type")?.value ||
      "Realistic",

    format:
      $("#format")?.value ||
      "9:16",

    duration:
      $("#duration")?.value ||
      "60 seconds",

    language:
      $("#language")?.value ||
      "English",

    plan:
      $("#plan")?.textContent ||
      "",

    character:
      localStorage.getItem(
        "tnsChar"
      ) || "",

    dialogue:
      $("#dialogue")?.value ||
      ""
  };
}


function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[character]
  );
}


function getLocalProjects() {
  if (!isAuthenticated()) {
    return [];
  }

  try {
    const data =
      localStorage.getItem(
        sessionKey()
      );

    if (!data) {
      return [];
    }

    const projects =
      JSON.parse(data);

    return Array.isArray(projects)
      ? projects
      : [];
  } catch {
    return [];
  }
}


function saveLocalProjects(
  projects
) {
  if (!isAuthenticated()) {
    return;
  }

  localStorage.setItem(
    sessionKey(),
    JSON.stringify(projects)
  );
}


function renderProjects() {
  const list =
    $("#projectList");

  if (!list) {
    return;
  }

  if (!isAuthenticated()) {
    list.innerHTML =
      "<p>Please log in to view projects.</p>";

    return;
  }

  const projects =
    getLocalProjects();

  if (!projects.length) {
    list.innerHTML =
      "<p>No local projects yet.</p>";

    return;
  }

  list.innerHTML =
    projects
      .map(
        (project, index) => `
          <article>
            <div>
              <b>${escapeHtml(
                project.title
              )}</b>

              <small>
                ${escapeHtml(
                  project.date
                )} •
                ${escapeHtml(
                  project.type
                )}
              </small>
            </div>

            <button
              type="button"
              onclick="loadProject(${index})"
            >
              Load
            </button>
          </article>
        `
      )
      .join("");
}


window.loadProject =
  function (index) {
    if (!isAuthenticated()) {
      alert(
        "Please log in first."
      );

      return;
    }

    const projects =
      getLocalProjects();

    const project =
      projects[index];

    if (!project) {
      return;
    }

    if ($("#idea")) {
      $("#idea").value =
        project.title || "";
    }

    if ($("#type")) {
      $("#type").value =
        project.type ||
        "Realistic";
    }

    if ($("#format")) {
      $("#format").value =
        project.format ||
        "9:16";
    }

    if ($("#duration")) {
      $("#duration").value =
        project.duration ||
        "60 seco
        }

    if ($("#language")) {
      $("#language").value =
        project.language ||
        "English";
    }

    if ($("#plan")) {
      $("#plan").textContent =
        project.plan || "";
    }

    if ($("#dialogue")) {
      $("#dialogue").value =
        project.dialogue || "";
    }

    if (project.character) {
      localStorage.setItem(
        "tnsChar",
        project.character
      );

      if ($("#charOutput")) {
        $("#charOutput").textContent =
          project.character;
      }
    }

    document
      .querySelector(
        '[data-tab="generate"]'
      )
      ?.click();
  };


$("#saveBtn")?.addEventListener(
  "click",
  () => {
    if (!isAuthenticated()) {
      alert(
        "Please log in before saving a project."
      );

      return;
    }

    const projects =
      getLocalProjects();

    projects.unshift(
      currentProject()
    );

    saveLocalProjects(
      projects.slice(0, 50)
    );

    renderProjects();

    alert(
      "Project saved locally."
    );
  }
);


$("#clearBtn")?.addEventListener(
  "click",
  () => {
    if (!isAuthenticated()) {
      return;
    }

    localStorage.removeItem(
      sessionKey()
    );

    renderProjects();
  }
);


/* =========================
   SETTINGS
========================= */

$("#saveSettings")?.addEventListener(
  "click",
  () => {
    const endpoint =
      $("#endpoint")?.value.trim() ||
      "/api";

    const prefix =
      $("#prefix")?.value.trim() ||
      "/api";

    localStorage.setItem(
      "tnsEndpoint",
      endpoint
    );

    localStorage.setItem(
      "tnsPrefix",
      prefix
    );

    alert(
      "Settings saved locally."
    );
  }
);


if ($("#endpoint")) {
  $("#endpoint").value =
    localStorage.getItem(
      "tnsEndpoint"
    ) || "/api";
}


if ($("#prefix")) {
  $("#prefix").value =
    localStorage.getItem(
      "tnsPrefix"
    ) || "/api";
}


/* =========================
   AUTH UI
========================= */

function initAuth() {
  const loggedIn =
    isAuthenticated();

  const user =
    getCurrentAuthUser();

  if (loggedIn && user) {
    $("#authGate")?.classList.add(
      "hidden"
    );

    if ($("#userBadge")) {
      $("#userBadge").textContent =
        user.email ||
        "Authenticated User";
    }
  } else {
    $("#authGate")?.classList.remove(
      "hidden"
    );

    if ($("#userBadge")) {
      $("#userBadge").textContent =
        "Login required";
    }
  }
}


$("#logoutBtn")?.addEventListener(
  "click",
  () => {
    if (
      window.TNSAuth &&
      typeof window.TNSAuth.logout ===
        "function"
    ) {
      window.TNSAuth.logout();
    }

    location.reload();
  }
);


/* =========================
   INITIALIZATION
========================= */

initAuth();
renderProjects();
