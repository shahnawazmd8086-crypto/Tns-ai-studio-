const LOGIN_API =
  "/api/auth/login";


function getLoginForm() {
  return document.querySelector(
    "#loginForm"
  );
}


function getEmailInput() {
  return document.querySelector(
    "#loginEmail"
  );
}


function getPasswordInput() {
  return document.querySelector(
    "#loginPassword"
  );
}


function getMessageElement() {
  return document.querySelector(
    "#loginMessage"
  );
}


function showMessage(
  message,
  type = "info"
) {
  const element =
    getMessageElement();

  if (!element) {
    return;
  }

  element.textContent =
    String(message || "");

  element.dataset.type =
    type;
}


function setLoading(
  loading
) {
  const form =
    getLoginForm();

  if (!form) {
    return;
  }

  const button =
    form.querySelector(
      'button[type="submit"]'
    );

  if (!button) {
    return;
  }

  button.disabled = loading;

  button.textContent =
    loading
      ? "Signing in..."
      : "Login";
}


function validateLoginInput(
  email,
  password
) {
  const safeEmail =
    String(email || "")
      .trim()
      .toLowerCase();

  const safePassword =
    String(password || "");

  if (!safeEmail) {
    throw new Error(
      "Email is required."
    );
  }

  if (!safePassword) {
    throw new Error(
      "Password is required."
    );
  }

  return {
    email: safeEmail,
    password: safePassword
  };
}


async function login(
  email,
  password
) {
  const input =
    validateLoginInput(
      email,
      password
    );

  const response =
    await fetch(
      LOGIN_API,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify(input)
      }
    );

  let data = null;

  try {
    data =
      await response.json();
  } catch (error) {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
      "Invalid email or password."
    );
  }

  const user =
    data?.user || null;

  if (
    window.TNSAuth &&
    user
  ) {
    window.TNSAuth.setLoggedIn(
      user
    );
  }

  window.dispatchEvent(
    new CustomEvent(
      "tns:login-success",
      {
        detail: {
          user
        }
      }
    )
  );

  return data;
}


async function handleLoginSubmit(
  event
) {
  event.preventDefault();

  const emailInput =
    getEmailInput();

  const passwordInput =
    getPasswordInput();

  const email =
    emailInput
      ? emailInput.value
      : "";

  const password =
    passwordInput
      ? passwordInput.value
      : "";

  try {
    setLoading(true);

    showMessage(
      "Signing in...",
      "info"
    );

    const result =
      await login(
        email,
        password
      );

    showMessage(
      result?.message ||
        "Login successful.",
      "success"
    );

    setTimeout(() => {
      window.location.href =
        "/index.html";
    }, 300);
  } catch (error) {
    showMessage(
      error.message ||
        "Login failed.",
      "error"
    );
  } finally {
    setLoading(false);
  }
}


function initLogin() {
  const form =
    getLoginForm();

  if (!form) {
    return;
  }

  form.addEventListener(
    "submit",
    handleLoginSubmit
  );
}


window.TNSLogin = {
  login,
  validateLoginInput,
  initLogin
};


if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    initLogin
  );
} else {
  initLogin();
}
