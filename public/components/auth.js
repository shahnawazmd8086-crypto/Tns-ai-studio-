const TNSAuthComponent = {
  getAuth() {
    return window.TNSAuth || null;
  },

  isLoggedIn() {
    const auth = this.getAuth();

    if (!auth) {
      return false;
    }

    return auth.isLoggedIn();
  },

  getCurrentUser() {
    const auth = this.getAuth();

    if (!auth) {
      return null;
    }

    return auth.getCurrentUser();
  },

  login(user) {
    const auth = this.getAuth();

    if (!auth) {
      throw new Error(
        "Authentication system is not available."
      );
    }

    return auth.setLoggedIn(user);
  },

  logout() {
    const auth = this.getAuth();

    if (!auth) {
      return {
        success: false,
        message:
          "Authentication system is not available."
      };
    }

    return auth.logout();
  },

  requireLogin() {
    const auth = this.getAuth();

    if (!auth) {
      window.location.href =
        "/auth/login.html";

      return false;
    }

    return auth.requireLogin();
  },

  redirectIfLoggedIn() {
    const auth = this.getAuth();

    if (!auth) {
      return false;
    }

    return auth.redirectIfLoggedIn();
  },

  updateUserDisplay(selector) {
    const element =
      document.querySelector(selector);

    if (!element) {
      return false;
    }

    const user =
      this.getCurrentUser();

    if (!user) {
      element.textContent =
        "Guest";

      return false;
    }

    element.textContent =
      user.email ||
      user.mobile ||
      user.name ||
      "User";

    return true;
  },

  bindLogoutButton(selector) {
    const button =
      document.querySelector(selector);

    if (!button) {
      return false;
    }

    button.addEventListener(
      "click",
      (event) => {
        event.preventDefault();

        this.logout();

        window.location.href =
          "/auth/login.html";
      }
    );

    return true;
  }
};


window.TNSAuthComponent =
  TNSAuthComponent;
