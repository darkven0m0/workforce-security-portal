import {
  InteractionRequiredAuthError,
  PublicClientApplication
} from "/vendor/msal-browser.js";

const signInButton =
  document.querySelector("#entra-sign-in");

const acquireTokenButton =
  document.querySelector("#entra-acquire-token");

const signOutButton =
  document.querySelector("#entra-sign-out");

const authStatus =
  document.querySelector("#entra-auth-status");

const authOutput =
  document.querySelector("#entra-auth-output");

let authConfiguration;
let msalInstance;
let activeAccount;
let currentAccessToken;
let interactionInProgress = false;

function setOutput(value) {
  authOutput.textContent = JSON.stringify(
    value,
    null,
    2
  );
}

function updateButtonState() {
  signInButton.disabled =
    interactionInProgress || Boolean(activeAccount);

  acquireTokenButton.disabled =
    interactionInProgress || !activeAccount;

  signOutButton.disabled =
    interactionInProgress || !activeAccount;
}

function setSignedOutState() {
  activeAccount = undefined;
  currentAccessToken = undefined;

  delete window.workforceEntraAuth;

  authStatus.textContent = "Signed out";
  authStatus.classList.remove("active-status");
  authStatus.classList.add("revoked-status");

  updateButtonState();
}

function setSignedInState(account) {
  activeAccount = account;
  msalInstance.setActiveAccount(account);

  authStatus.textContent = "Signed in";
  authStatus.classList.remove("revoked-status");
  authStatus.classList.add("active-status");

  updateButtonState();
}

function setInteractionState(value) {
  interactionInProgress = value;
  updateButtonState();
}

function decodeJwtPayload(token) {
  const segments = token.split(".");

  if (segments.length !== 3) {
    throw new Error(
      "The access token is not a valid JWT."
    );
  }

  const base64Url = segments[1];

  const base64 = base64Url
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(
      Math.ceil(base64Url.length / 4) * 4,
      "="
    );

  const decoded = atob(base64);

  const bytes = Uint8Array.from(
    decoded,
    character => character.charCodeAt(0)
  );

  return JSON.parse(
    new TextDecoder().decode(bytes)
  );
}

function saveAccessToken(token) {
  currentAccessToken = token;

  const claims =
    decodeJwtPayload(token);

  window.workforceEntraAuth = {
    account: activeAccount,
    accessToken: token,
    tokenClaims: claims
  };

  return claims;
}

function summarizeToken(token) {
  const payload =
    decodeJwtPayload(token);

  return {
    tokenAcquired: true,
    tokenStoredInMemoryOnly: true,

    name:
      payload.name ??
      activeAccount?.name ??
      null,

    username:
      payload.preferred_username ??
      activeAccount?.username ??
      null,

    tenantId:
      payload.tid ?? null,

    objectId:
      payload.oid ?? null,

    audience:
      payload.aud ?? null,

    scopes:
      typeof payload.scp === "string"
        ? payload.scp.split(" ")
        : [],

    roles:
      Array.isArray(payload.roles)
        ? payload.roles
        : [],

    issuedAt:
      typeof payload.iat === "number"
        ? new Date(
            payload.iat * 1000
          ).toISOString()
        : null,

    expiresAt:
      typeof payload.exp === "number"
        ? new Date(
            payload.exp * 1000
          ).toISOString()
        : null
  };
}

function displayToken(token) {
  saveAccessToken(token);

  const summary =
    summarizeToken(token);

  console.info(
    "Microsoft Entra API token acquired.",
    summary
  );

  setOutput({
    event: "ENTRA_API_TOKEN_ACQUIRED",
    ...summary
  });
}

async function acquireApiToken() {
  if (!activeAccount) {
    throw new Error(
      "Sign in before requesting an API token."
    );
  }

  const request = {
    account: activeAccount,
    scopes: [
      authConfiguration.apiScope
    ]
  };

  let response;

  try {
    response =
      await msalInstance.acquireTokenSilent(
        request
      );
  } catch (error) {
    if (
      error instanceof InteractionRequiredAuthError
    ) {
      response =
        await msalInstance.acquireTokenPopup(
          request
        );
    } else {
      throw error;
    }
  }

  if (!response.accessToken) {
    throw new Error(
      "Microsoft Entra did not return an API access token."
    );
  }

  displayToken(response.accessToken);

  return response.accessToken;
}

async function signIn() {
  if (interactionInProgress) {
    return;
  }

  setInteractionState(true);

  setOutput({
    event: "ENTRA_LOGIN_STARTED",
    message:
      "Waiting for Microsoft authentication."
  });

  try {
    const response =
      await msalInstance.loginPopup({
        scopes: [
          "openid",
          "profile",
          authConfiguration.apiScope
        ],

        redirectUri:
          authConfiguration.redirectUri,

        prompt:
          "select_account"
      });

    if (!response.account) {
      throw new Error(
        "Microsoft authentication completed without returning an account."
      );
    }

    setSignedInState(
      response.account
    );

    /*
     * loginPopup requested the API scope, so use the
     * returned access token directly when available.
     * This avoids starting a second overlapping
     * interactive operation.
     */
    if (response.accessToken) {
      displayToken(
        response.accessToken
      );
    } else {
      await acquireApiToken();
    }
  } catch (error) {
    setSignedOutState();

    setOutput({
      event: "ENTRA_LOGIN_FAILED",

      error:
        error instanceof Error
          ? error.message
          : String(error)
    });

    console.error(
      "Microsoft Entra login failed.",
      error
    );
  } finally {
    setInteractionState(false);
  }
}

async function requestToken() {
  if (
    interactionInProgress ||
    !activeAccount
  ) {
    return;
  }

  setInteractionState(true);

  try {
    await acquireApiToken();
  } catch (error) {
    setOutput({
      event:
        "ENTRA_API_TOKEN_ACQUISITION_FAILED",

      error:
        error instanceof Error
          ? error.message
          : String(error)
    });

    console.error(
      "Microsoft Entra token acquisition failed.",
      error
    );
  } finally {
    setInteractionState(false);
  }
}

async function signOut() {
  if (
    interactionInProgress ||
    !activeAccount
  ) {
    return;
  }

  setInteractionState(true);

  const account =
    activeAccount;

  setOutput({
    event: "ENTRA_LOGOUT_STARTED",
    username: account.username
  });

  try {
    /*
     * Local sign-out is deliberate for this demo.
     * It clears the application's cached account and
     * token without starting another popup operation.
     *
     * The next login uses prompt: "select_account",
     * allowing a different test identity to be chosen.
     */
    await msalInstance.clearCache({
      account
    });

    msalInstance.setActiveAccount(null);

    setSignedOutState();

    setOutput({
      event: "ENTRA_LOGOUT_COMPLETED",
      message:
        "The local application session was cleared."
    });
  } catch (error) {
    setOutput({
      event: "ENTRA_LOGOUT_FAILED",

      error:
        error instanceof Error
          ? error.message
          : String(error)
    });

    console.error(
      "Microsoft Entra logout failed.",
      error
    );
  } finally {
    setInteractionState(false);
  }
}

async function initializeAuthentication() {
  try {
    const response = await fetch(
      "/auth/config",
      {
        headers: {
          Accept:
            "application/json"
        },

        cache:
          "no-store"
      }
    );

    const body =
      await response.json();

    if (!response.ok) {
      throw new Error(
        body.message ??
        "Unable to load Entra configuration."
      );
    }

    authConfiguration = body;

    msalInstance =
      new PublicClientApplication({
        auth: {
          clientId:
            authConfiguration.spaClientId,

          authority:
            authConfiguration.authority,

          redirectUri:
            authConfiguration.redirectUri,

          postLogoutRedirectUri:
            authConfiguration.applicationUri
        },

        cache: {
          cacheLocation:
            "memoryStorage",

          storeAuthStateInCookie:
            false
        },

        system: {
          allowRedirectInIframe:
            false
        }
      });

    await msalInstance.initialize();

    const account =
      msalInstance.getActiveAccount() ??
      msalInstance.getAllAccounts()[0];

    if (account) {
      setSignedInState(account);

      try {
        await acquireApiToken();
      } catch (error) {
        setOutput({
          event:
            "ENTRA_SILENT_TOKEN_ACQUISITION_FAILED",

          username:
            account.username,

          error:
            error instanceof Error
              ? error.message
              : String(error),

          nextStep:
            "Select Acquire API Token."
        });
      }

      return;
    }

    setSignedOutState();

    setOutput({
      event: "ENTRA_AUTH_INITIALIZED",

      authority:
        authConfiguration.authority,

      apiScope:
        authConfiguration.apiScope,

      redirectUri:
        authConfiguration.redirectUri,

      message:
        "Select Sign in with Microsoft."
    });
  } catch (error) {
    setSignedOutState();

    signInButton.disabled = true;

    setOutput({
      event:
        "ENTRA_AUTH_INITIALIZATION_FAILED",

      error:
        error instanceof Error
          ? error.message
          : String(error)
    });

    console.error(
      "Microsoft Entra initialization failed.",
      error
    );
  }
}

signInButton.addEventListener(
  "click",
  signIn
);

acquireTokenButton.addEventListener(
  "click",
  requestToken
);

signOutButton.addEventListener(
  "click",
  signOut
);

const runningInsideAuthenticationPopup =
  window.opener !== null &&
  window.opener !== window;

if (runningInsideAuthenticationPopup) {
  console.info(
    "Authentication response loaded inside the Microsoft sign-in popup."
  );
} else {
  initializeAuthentication();
}
