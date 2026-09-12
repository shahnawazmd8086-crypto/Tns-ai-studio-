const SIGNUP_API =
  "/api/auth/signup";


function getSignupForm() {
  return document.querySelector(
    "#signupForm"
  );
}


function getEmailInput() {
  return document.querySelector(
    "#signupEmail"
  );
}


function getPasswordInput() {
  return document.querySelector(
    "#signupPassword"
  );
}


function getConfirmPasswordInput() {
  return document.querySelector(
    "#signupConfirmPassword"
  );
}


function getMessageElement() {
  return document.querySelector(
    "#signupMessage"
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
    getSignupForm();

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

  button.disabled =
    loading;

  button.textContent =
    loading
      ? "Creating account..."
      : "Sign Up";
}


function validateSignupInput(
  email,
  password,
  confirmPassword
) {
  const safeEmail =
    String(email || "")
      .trim()
      .toLowerCase();

  const safePassword =
    String(password || "");

  const safeConfirmPassword =
    String(confirmPassword || "");

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

  if (safePassword.length < 8) {
    throw new Error(
      "Password must be at least 8 characters long."
    );
  }

  if (
    safePassword !==
    safeConfirmPassword
  ) {
    throw new Error(
      "Passwords do not match."
    );
  }

  return {
    email: safeEmail,
    password: safePassword
  };
}


async function signup(
  email,
  password,
  confirmPassword
) {
  const input =
    validateSignupInput(
      email,
      password,
      confirmPassword
    );

  const response =
    await fetch(
      SIGNUP_API,
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
      "Unable to create account."
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

  return data;
}


async function handleSignupSubmit(
  event
) {
  event.preventDefault();

  const emailInput =
    getEmailInput();

  const passwordInput =
    getPasswordInput();

  const confirmPasswordInput =
    getConfirmPasswordInput();

  const email =
    emailInput
      ? emailInput.value
      : "";

  const password =
    passwordInput
      ? passwordInput.value
      : "";

  const confirmPassword =
    confirmPasswordInput
      ? confirmPasswordInput.value
      : "";

  try {
    setLoading(true);

    showMessage(
      "Creating your account...",
      "info"
    );

    const result =
      await signup(
        email,
        password,
        confirmPassword
      );

    showMessage(
      result?.message ||
        "Account created successfully.",
      "success"
    );

    window.dispatchEvent(
      new CustomEvent(
        "tns:signup-success",
        {
          detail: {
            user:
              result?.user || null
          }
        }
      )
    );

    setTimeout(() => {
      window.location.href =
        "/index.html";
    }, 500);
  } catch (error) {
    showMessage(
      error.message ||
        "Signup failed.",
      "error"
    );
  } finally {
    setLoading(false);
  }
}


function initSignup() {
  const form =
    getSignupForm();

  if (!form) {
    return;
  }

  form.addEventListener(
    "submit",
    handleSignupSubmit
  );
}


window.TNSSignup = {
  signup,
  validateSignupInput,
  initSignup
};


if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    initSignup
  );
} else {
  initSignup();
      }
