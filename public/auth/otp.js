const OTP_API =
  "/api/auth/otp";


function getOtpForm() {
  return document.querySelector(
    "#otpForm"
  );
}


function getIdentifierInput() {
  return document.querySelector(
    "#otpIdentifier"
  );
}


function getOtpInput() {
  return document.querySelector(
    "#otpCode"
  );
}


function getMessageElement() {
  return document.querySelector(
    "#otpMessage"
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
    getOtpForm();

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
      ? "Verifying..."
      : "Verify OTP";
}


function validateOtpInput(
  identifier,
  code
) {
  const safeIdentifier =
    String(identifier || "")
      .trim();

  const safeCode =
    String(code || "")
      .trim();

  if (!safeIdentifier) {
    throw new Error(
      "Email or mobile number is required."
    );
  }

  if (!safeCode) {
    throw new Error(
      "OTP is required."
    );
  }

  if (!/^[0-9]{4,8}$/.test(safeCode)) {
    throw new Error(
      "OTP must contain 4 to 8 digits."
    );
  }

  return {
    identifier:
      safeIdentifier,
    code:
      safeCode
  };
}


async function verifyOtp(
  identifier,
  code
) {
  const input =
    validateOtpInput(
      identifier,
      code
    );

  const response =
    await fetch(
      `${OTP_API}/verify`,
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
      "OTP verification failed."
    );
  }

  return (
    data || {
      success: true
    }
  );
}


async function requestOtp(
  identifier
) {
  const safeIdentifier =
    String(identifier || "")
      .trim();

  if (!safeIdentifier) {
    throw new Error(
      "Email or mobile number is required."
    );
  }

  const response =
    await fetch(
      `${OTP_API}/request`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          identifier:
            safeIdentifier
        })
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
      "Unable to send OTP."
    );
  }

  return (
    data || {
      success: true
    }
  );
}


async function handleOtpSubmit(
  event
) {
  event.preventDefault();

  const identifierInput =
    getIdentifierInput();

  const otpInput =
    getOtpInput();

  const identifier =
    identifierInput
      ? identifierInput.value
      : "";

  const code =
    otpInput
      ? otpInput.value
      : "";

  try {
    setLoading(true);

    showMessage(
      "Verifying OTP...",
      "info"
    );

    const result =
      await verifyOtp(
        identifier,
        code
      );

    showMessage(
      result?.message ||
        "OTP verified successfully.",
      "success"
    );

    window.dispatchEvent(
      new CustomEvent(
        "tns:otp-verified",
        {
          detail: {
            identifier:
              String(
                identifier
              ).trim()
          }
        }
      )
    );
  } catch (error) {
    showMessage(
      error.message ||
        "OTP verification failed.",
      "error"
    );
  } finally {
    setLoading(false);
  }
}


function initOtp() {
  const form =
    getOtpForm();

  if (!form) {
    return;
  }

  form.addEventListener(
    "submit",
    handleOtpSubmit
  );
}


window.TNSOtp = {
  requestOtp,
  verifyOtp,
  validateOtpInput,
  initOtp
};


if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    initOtp
  );
} else {
  initOtp();
}
