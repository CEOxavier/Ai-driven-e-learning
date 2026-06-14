(function attachAuthHandlers(window, document) {
  "use strict";

  const api = window.AILearnAPI;

  function setCurrentYear() {
    document.querySelectorAll("[data-current-year]").forEach((item) => {
      item.textContent = new Date().getFullYear();
    });
  }

  function formValue(form, name) {
    const field = form.elements[name];
    return field ? field.value.trim() : "";
  }

  function validateSignup(form) {
    const username = formValue(form, "username");
    const email = formValue(form, "email");
    const password = formValue(form, "password");
    const confirmPassword = formValue(form, "confirmPassword");

    if (username.length < 3) return "Username must be at least 3 characters.";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return "Please enter a valid email address.";
    }
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (password !== confirmPassword) return "Passwords do not match.";

    return "";
  }

  function validateLogin(form) {
    if (!formValue(form, "username") || !formValue(form, "password")) {
      return "Please fill in all fields.";
    }
    return "";
  }

  async function handleLogin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button[type='submit']");
    const validationError = validateLogin(form);

    if (validationError) {
      api.showToast(validationError, "warning");
      return;
    }

    api.setBusy(button, true, "Logging in...");

    try {
      await api.request("/login", {
        method: "POST",
        body: JSON.stringify({
          username: formValue(form, "username"),
          password: formValue(form, "password"),
        }),
      });

      api.showToast("Login successful. Opening dashboard...", "success");
      window.setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 650);
    } catch (error) {
      api.showToast(error.message || "Login failed.", "error");
    } finally {
      api.setBusy(button, false);
    }
  }

  async function handleSignup(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button[type='submit']");
    const validationError = validateSignup(form);

    if (validationError) {
      api.showToast(validationError, "warning");
      return;
    }

    api.setBusy(button, true, "Creating account...");

    try {
      await api.request("/signup", {
        method: "POST",
        body: JSON.stringify({
          username: formValue(form, "username"),
          email: formValue(form, "email"),
          password: formValue(form, "password"),
        }),
      });

      api.showToast("Registration successful. Redirecting to login...", "success");
      form.reset();
      window.setTimeout(() => {
        window.location.href = "login.html";
      }, 850);
    } catch (error) {
      api.showToast(error.message || "Registration failed.", "error");
    } finally {
      api.setBusy(button, false);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    setCurrentYear();

    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");

    if (loginForm) loginForm.addEventListener("submit", handleLogin);
    if (signupForm) signupForm.addEventListener("submit", handleSignup);
  });
})(window, document);
