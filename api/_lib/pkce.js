// PKCE-Hilfsfunktionen für OAuth 2.0 Authorization Code Flow (X / Twitter).

const crypto = require("crypto");

function base64url(input) {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function generateVerifier() {
  return base64url(crypto.randomBytes(32));
}

function challengeFromVerifier(verifier) {
  const hash = crypto.createHash("sha256").update(verifier).digest();
  return base64url(hash);
}

function randomState() {
  return base64url(crypto.randomBytes(16));
}

module.exports = { generateVerifier, challengeFromVerifier, randomState };
