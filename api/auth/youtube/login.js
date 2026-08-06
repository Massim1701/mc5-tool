// Startet den Google-OAuth-Flow für YouTube.
const { serializeCookie, appendSetCookie } = require("../../_lib/cookies");
const { randomState } = require("../../_lib/pkce");

module.exports = (req, res) => {
  const clientId = process.env.YT_CLIENT_ID;
  if (!clientId) {
    res.status(500).send("YT_CLIENT_ID fehlt in den Vercel-Umgebungsvariablen.");
    return;
  }

  const proto = req.headers["x-forwarded-proto"] || "https";
  const redirectUri = `${proto}://${req.headers.host}/api/auth/youtube/callback`;

  const state = randomState();
  appendSetCookie(res, serializeCookie("yt_oauth_state", state, { maxAge: 600 }));

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set(
    "scope",
    "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.upload"
  );
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

  res.writeHead(302, { Location: authUrl.toString() });
  res.end();
};
