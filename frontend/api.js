(function attachApiHelpers(window) {
  "use strict";

  const TOKEN_KEY = "aiLearnAuthToken";
  const USER_KEY = "aiLearnCurrentUser";
  const DEFAULT_BACKEND = "http://localhost:5000";

  function trimTrailingSlash(value) {
    return String(value || "").replace(/\/+$/, "");
  }

  function getApiBase() {
    const configured =
      window.AI_LEARN_API_BASE_URL || window.localStorage.getItem("AI_LEARN_API_BASE_URL");

    if (configured) return trimTrailingSlash(configured);

    if (window.location.protocol === "http:" || window.location.protocol === "https:") {
      const frontendOnlyPorts = new Set(["3000", "5173", "5500", "8080"]);
      if (window.location.pathname.startsWith("/app/") || !frontendOnlyPorts.has(window.location.port)) {
        return window.location.origin;
      }
      return DEFAULT_BACKEND;
    }

    return DEFAULT_BACKEND;
  }

  function getToken() {
    return window.localStorage.getItem(TOKEN_KEY) || "";
  }

  function setSession(token, username) {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    if (username) window.localStorage.setItem(USER_KEY, username);
  }

  function clearSession() {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  }

  function getCurrentUser() {
    return window.localStorage.getItem(USER_KEY) || "";
  }

  async function request(path, options = {}) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), options.timeout || 20000);
    const headers = new Headers(options.headers || {});

    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const token = getToken();
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    try {
      const response = await fetch(`${getApiBase()}${path}`, {
        ...options,
        headers,
        signal: controller.signal,
      });
      const text = await response.text();
      const authToken = response.headers.get("X-Auth-Token");
      const username = response.headers.get("X-User-Name");

      if (authToken) setSession(authToken, username);

      if (!response.ok) {
        const error = new Error(
          text || `${response.status} ${response.statusText}` || "Request failed."
        );
        error.status = response.status;
        throw error;
      }

      return { response, text };
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("The request timed out. Please try again.");
      }
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function showToast(message, type = "info") {
    const region = document.getElementById("toastRegion") || createToastRegion();
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.setAttribute("role", "status");
    toast.textContent = message;

    region.appendChild(toast);
    window.setTimeout(() => {
      toast.remove();
    }, 4200);
  }

  function createToastRegion() {
    const region = document.createElement("div");
    region.id = "toastRegion";
    region.className = "toast-region";
    region.setAttribute("aria-live", "polite");
    region.setAttribute("aria-atomic", "true");
    document.body.appendChild(region);
    return region;
  }

  function setBusy(button, isBusy, busyLabel = "Working...") {
    if (!button) return;

    if (isBusy) {
      button.dataset.previousLabel = button.textContent;
      button.textContent = busyLabel;
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      return;
    }

    button.textContent =
      button.dataset.previousLabel || button.dataset.defaultLabel || button.textContent;
    button.disabled = false;
    button.removeAttribute("aria-busy");
  }

  window.AILearnAPI = {
    clearSession,
    getApiBase,
    getCurrentUser,
    getToken,
    request,
    setBusy,
    setSession,
    showToast,
  };
})(window);
