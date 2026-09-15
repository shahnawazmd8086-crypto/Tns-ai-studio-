(() => {
  "use strict";

  const LOGIN_API = "/api/auth/login";

  function loginGetForm() {
    return document.querySelector("#loginForm");
  }

  function loginGetEmailInput() {
    return document.querySelector("#loginEmail");
  }

  function loginGetPasswordInput() {
    return document.querySelector("#loginPassword");
  }

  function loginGetMessageElement() {
    return document.querySelector("#loginMessage");
  }

  function loginShowMessage(message, type = "info") {
    const element = loginGetMessageElement();
    if (!element) return;
    element.textContent = String(message || "");
    element.dataset.type = type;
  }

  function loginSetLoading(loading) {
    const form = loginGetForm();
    if (!form) return;

    const button = form.querySelector('button[type="submit"]');
    if (!button) return;

    button.disabled = loading;
    button.textContent = loading ? "Signing in..." : "Login";
  }

  function loginValidateInput(email, password) {
    const safeEmail = String(email || "").trim().toLowerCase();
    const safePassword = String(password || "");

    if (!safeEmail) {
      throw new Error("Email is required.");
    }

    if (!safePassword) {
      throw new Error("Password is required.");
    }

    return {
      email: safeEmail,
      password: safePassword
    };
  }

  async function loginRequest(email, password) {
    const input = loginValidateInput(email, password);

    const response = await fetch(LOGIN_API, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(input)
    });

    let data = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
        data?.error ||
        "Invalid email or password."
      );
    }

    const user = data?.user || null;

    if (window.TNSAuth && user && typeof window.TNSAuth.setLoggedIn === "function") {
      window.TNSAuth.setLoggedIn(user);
    }

    window.dispatchEvent(
      new CustomEvent("tns:login-success", {
        detail: { user }
      })
    );

    return data;
  }

  async function loginHandleSubmit(event) {
    event.preventDefault();

    const emailInput = loginGetEmailInput();
    const passwordInput = loginGetPasswordInput();

    const email = emailInput ? emailInput.value : "";
    const password = passwordInput ? passwordInput.value : "";

    try {
      loginSetLoading(true);
      loginShowMessage("Signing in...", "info");

      const result = await loginRequest(email, password);

      loginShowMessage(
        result?.message || "Login successful.",
        "success"
      );

      window.setTimeout(() => {
        window.location.replace("/index.html");
      }, 300);
    } catch (error) {
      loginShowMessage(
        error?.message || "Login failed.",
        "error"
      );
    } finally {
      loginSetLoading(false);
    }
  }

  function loginInit() {
    const form = loginGetForm();
    if (!form) return;

    if (form.dataset.tnsLoginBound === "1") return;
    form.dataset.tnsLoginBound = "1";
    form.addEventListener("submit", loginHandleSubmit);
  }

  window.TNSLogin = {
    login: loginRequest,
    validateLoginInput: loginValidateInput,
    initLogin: loginInit
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loginInit, { once: true });
  } else {
    loginInit();
  }
})();
