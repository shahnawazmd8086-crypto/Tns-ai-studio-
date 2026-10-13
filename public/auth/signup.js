(() => {
  "use strict";

  const SIGNUP_API = "/api/auth/signup";

  function signupGetForm() {
    return document.querySelector("#signupForm");
  }

  function signupGetEmailInput() {
    return document.querySelector("#signupEmail");
  }

  function signupGetMobileInput() {
    return document.querySelector("#signupMobile");
  }

  function signupGetPasswordInput() {
    return document.querySelector("#signupPassword");
  }

  function signupGetConfirmPasswordInput() {
    return document.querySelector("#signupConfirmPassword");
  }

  function signupGetMessageElement() {
    return document.querySelector("#signupMessage");
  }

  function signupShowMessage(message, type = "info") {
    const element = signupGetMessageElement();
    if (!element) return;
    element.textContent = String(message || "");
    element.dataset.type = type;
  }

  function signupSetLoading(loading) {
    const form = signupGetForm();
    if (!form) return;

    const button = form.querySelector('button[type="submit"]');
    if (!button) return;

    button.disabled = loading;
    button.textContent = loading ? "Creating account..." : "Sign Up";
  }

  function signupValidateInput(email, mobile, password, confirmPassword) {
    const safeEmail = String(email || "").trim().toLowerCase();
    const safeMobile = String(mobile || "").replace(/[^0-9+]/g, "");
    const safePassword = String(password || "");
    const safeConfirmPassword = String(confirmPassword || "");

    if (!safeEmail && !safeMobile) throw new Error("Email or mobile number is required.");
    if (safeEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeEmail)) throw new Error("Please enter a valid email address.");
    if (safeMobile && !/^\+?[1-9][0-9]{7,14}$/.test(safeMobile)) throw new Error("Please enter a valid mobile number in international format.");
    if (!safePassword) throw new Error("Password is required.");

    if (safePassword.length < 8) {
      throw new Error("Password must be at least 8 characters long.");
    }

    if (safePassword !== safeConfirmPassword) {
      throw new Error("Passwords do not match.");
    }

    return { email: safeEmail || null, mobile: safeMobile || null, password: safePassword };
  }

  async function signupRequest(email, mobile, password, confirmPassword) {
    const input = signupValidateInput(email, mobile, password, confirmPassword);

    const response = await fetch(SIGNUP_API, {
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
        "Unable to create account."
      );
    }

    const user = data?.user || null;
    if (window.TNSAuth && user && typeof window.TNSAuth.setLoggedIn === "function") {
      window.TNSAuth.setLoggedIn(user);
    }

    return data;
  }

  async function signupHandleSubmit(event) {
    event.preventDefault();

    const emailInput = signupGetEmailInput();
    const mobileInput = signupGetMobileInput();
    const passwordInput = signupGetPasswordInput();
    const confirmInput = signupGetConfirmPasswordInput();

    try {
      signupSetLoading(true);
      signupShowMessage("Creating your account...", "info");

      const result = await signupRequest(
        emailInput?.value || "",
        mobileInput?.value || "",
        passwordInput?.value || "",
        confirmInput?.value || ""
      );

      signupShowMessage(
        result?.message || "Account created successfully.",
        "success"
      );

      window.dispatchEvent(
        new CustomEvent("tns:signup-success", {
          detail: { user: result?.user || null }
        })
      );

      window.setTimeout(() => {
        window.location.replace("/index.html");
      }, 500);
    } catch (error) {
      signupShowMessage(
        error?.message || "Signup failed.",
        "error"
      );
    } finally {
      signupSetLoading(false);
    }
  }

  function signupInit() {
    const form = signupGetForm();
    const showSignupButton = document.querySelector("#showSignupBtn");
    const showLoginButton = document.querySelector("#showLoginBtn");
    const loginForm = document.querySelector("#loginForm");

    if (form && form.dataset.tnsSignupBound !== "1") {
      form.dataset.tnsSignupBound = "1";
      form.addEventListener("submit", signupHandleSubmit);
    }

    if (showSignupButton && form && loginForm && showSignupButton.dataset.tnsSignupSwitchBound !== "1") {
      showSignupButton.dataset.tnsSignupSwitchBound = "1";
      showSignupButton.addEventListener("click", () => {
        loginForm.classList.add("hidden");
        showSignupButton.classList.add("hidden");
        form.classList.remove("hidden");
        signupGetEmailInput()?.focus();
      });
    }

    if (showLoginButton && form && loginForm && showLoginButton.dataset.tnsLoginSwitchBound !== "1") {
      showLoginButton.dataset.tnsLoginSwitchBound = "1";
      showLoginButton.addEventListener("click", () => {
        form.classList.add("hidden");
        loginForm.classList.remove("hidden");
        if (showSignupButton) showSignupButton.classList.remove("hidden");
        form.reset();
        signupShowMessage("", "info");
      });
    }
  }

  window.TNSSignup = {
    signup: signupRequest,
    validateSignupInput: signupValidateInput,
    initSignup: signupInit
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", signupInit, { once: true });
  } else {
    signupInit();
  }
})();
