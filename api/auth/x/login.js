// Startet den OAuth-2.0-Login bei X (PKCE). Aufruf: /api/auth/x/login
const { generateVerifier, challengeFromVerifier, randomState } = require("../../_lib/pkce");
const { serializeCookie, appendSetCookie } = require("../../_lib/cookies");

module.exports = (req, res) => {
  const clientId = process.env.X_CLIENT_ID;
  if (!clientId) {
    res.status(500).send("X_CLIENT_ID fehlt in den Vercel-Umgebungsvariablen.");
    return;
  }

  const proto = req.headers["x-forwarded-proto"] || "https";
  const redirectUri = `${proto}://${req.headers.host}/api/auth/x/callback`;

  const verifier = generateVerifier();
  const challenge = challengeFromVerifier(verifier);
  const state = randomState();

  appendSetCookie(res, serializeCookie("x_pkce_verifier", verifier, { maxAge: 600 }));
  appendSetCookie(res, serializeCookie("x_oauth_state", state, { maxAge: 600 }));

  const authUrl = new URL("https://x.com/i/oauth2/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "tweet.read tweet.write users.read offline.access");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  res.writeHead(302, { Location: authUrl.toString() });
  res.end();
};
