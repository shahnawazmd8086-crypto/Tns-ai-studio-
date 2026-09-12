const FORGOT_PASSWORD_API =
  "/api/auth/forgot-password";


function getForgotPasswordForm() {
  return document.querySelector(
    "#forgotPasswordForm"
  );
}


function getIdentifierInput() {
  return document.querySelector(
    "#forgotPasswordIdentifier"
  );
}


function getMessageElement() {
  return document.querySelector(
    "#forgotPasswordMessage"
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

  element.dataset.type = type;
}


function setLoading(
  loading
) {
  const form =
    getForgotPasswordForm();

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
      ? "Sending..."
      : "Send OTP";
}


function validateIdentifier(
  identifier
) {
  const value =
    String(identifier || "")
      .trim();

  if (!value) {
    throw new Error(
      "Email or mobile number is required."
    );
  }

  return value;
}


async function requestPasswordReset(
  identifier
) {
  const value =
    validateIdentifier(identifier);

  const response =
    await fetch(
      FORGOT_PASSWORD_API,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          identifier: value
        })
      }
    );

  let data = null;

  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
      "Unable to send password reset OTP."
    );
  }

  return (
    data || {
      success: true
    }
  );
}


async function handleForgotPasswordSubmit(
  event
) {
  event.preventDefault();

  const input =
    getIdentifierInput();

  const identifier =
    input
      ? input.value
      : "";

  try {
    setLoading(true);

    showMessage(
      "Sending OTP...",
      "info"
    );

    const result =
      await requestPasswordReset(
        identifier
      );

    showMessage(
      result.message ||
        "OTP sent successfully.",
      "success"
    );

    window.dispatchEvent(
      new CustomEvent(
        "tns:password-reset-requested",
        {
          detail: {
            identifier:
              String(identifier).trim()
          }
        }
      )
    );
  } catch (error) {
    showMessage(
      error.message ||
        "Something went wrong.",
      "error"
    );
  } finally {
    setLoading(false);
  }
}


function initForgotPassword() {
  const form =
    getForgotPasswordForm();

  if (!form) {
    return;
  }

  form.addEventListener(
    "submit",
    handleForgotPasswordSubmit
  );
}


window.TNSForgotPassword = {
  requestPasswordReset,
  validateIdentifier,
  initForgotPassword
};


if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    initForgotPassword
  );
} else {
  initForgotPassword();
      }
