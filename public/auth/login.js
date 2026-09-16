(() => {
  "use strict";

  const LOGIN_API = "/api/auth/login";

  function getForm() {
    return document.querySelector("#loginForm");
  }

  function getEmailInput() {
    return document.querySelector("#loginEmail");
  }

  function getMobileInput() {
    return document.querySelector("#loginMobile");
  }

  function getPasswordInput() {
    return document.querySelector("#loginPassword");
  }

  function getMessageElement() {
    return document.querySelector("#loginMessage");
  }

  function showMessage(message, type = "info") {
    const element = getMessageElement();
    if (!element) return;

    element.textContent = String(message || "");
    element.dataset.type = type;
  }

  function getLoginMode() {
    const mobileField = document.querySelector("#mobileField");

    return mobileField && !mobileField.classList.contains("hidden")
      ? "mobile"
      : "email";
  }

  function getIdentifier() {
    const mode = getLoginMode();

    if (mode === "mobile") {
      return String(getMobileInput()?.value || "").trim();
    }

    return String(getEmailInput()?.value || "")
      .trim()
      .toLowerCase();
  }

  function validateLoginInput(identifier, password) {
    const safeIdentifier = String(identifier || "").trim();
    const safePassword = String(password || "");

    if (!safeIdentifier) {
      throw new Error(
        getLoginMode() === "mobile"
          ? "Mobile number is required."
          : "Email is required."
      );
    }

    if (!safePassword) {
      throw new Error("Password is required.");
    }

    if (safePassword.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    return {
      identifier: safeIdentifier,
      password: safePassword
    };
  }

  async function loginRequest(identifier, password) {
    const input = validateLoginInput(identifier, password);

    const response = await fetch(LOGIN_API, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(input)
    });

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        "Invalid email/mobile number or password."
      );
    }

    if (data.user) {
      try {
        localStorage.setItem(
          "tnsStudioUser",
          JSON.stringify(data.user)
        );
      } catch {}

      if (
        window.TNSAuth &&
        typeof window.TNSAuth.setLoggedIn === "function"
      ) {
        window.TNSAuth.setLoggedIn(data.user);
      }
    }

    window.dispatchEvent(
      new CustomEvent("tns:login-success", {
        detail: {
          user: data.user || null
        }
      })
    );

    return data;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const identifier = getIdentifier();
    const password = String(
      getPasswordInput()?.value || ""
    );

    try {
      showMessage("Signing in...", "info");

      const result = await loginRequest(
        identifier,
        password
      );

      showMessage(
        result.message || "Login successful.",
        "success"
      );

      window.setTimeout(() => {
        window.location.replace("/index.html");
      }, 300);
    } catch (error) {
      showMessage(
        error?.message ||
        "Login failed.",
        "error"
      );
    }
  }

  function initLogin() {
    const form = getForm();

    if (!form) return;

    /*
     * Current TNS Studio login is handled by app.js.
     * This file only exposes the reusable login functions.
     * No second submit listener is attached here.
     */

    window.TNSLogin = {
      login: loginRequest,
      validateLoginInput,
      initLogin
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initLogin,
      { once: true }
    );
  } else {
    initLogin();
  }
})();
