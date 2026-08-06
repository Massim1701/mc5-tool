// OAuth-Callback von Google. Tauscht den Code gegen Access-/Refresh-Token.
const { parseCookies, serializeCookie, appendSetCookie } = require("../../_lib/cookies");

module.exports = async (req, res) => {
  const clientId = process.env.YT_CLIENT_ID;
  const clientSecret = process.env.YT_CLIENT_SECRET;
  const { code, state, error } = req.query;

  if (!clientId || !clientSecret) {
    res.status(500).send(
      `Umgebungsvariablen fehlen: ` +
      `YT_CLIENT_ID ${clientId ? "vorhanden" : "FEHLT"}, ` +
      `YT_CLIENT_SECRET ${clientSecret ? "vorhanden" : "FEHLT"}. ` +
      `Bitte in Vercel unter Settings → Environments → Production eintragen und redeployen.`
    );
    return;
  }

  if (error) {
    res.status(400).send(`Google hat die Anfrage abgelehnt: ${error}`);
    return;
  }

  const cookies = parseCookies(req);
  if (!state || state !== cookies.yt_oauth_state) {
    res.status(400).send("Ungültiger State-Parameter (mögliche CSRF). Bitte erneut versuchen.");
    return;
  }

  const proto = req.headers["x-forwarded-proto"] || "https";
  const redirectUri = `${proto}://${req.headers.host}/api/auth/youtube/callback`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!tokenRes.ok) {
    const detail = await tokenRes.text();
    res.status(502).send(`Token-Austausch fehlgeschlagen: ${detail}`);
    return;
  }

  const tokens = await tokenRes.json();
  // tokens: { access_token, refresh_token, expires_in, scope, token_type }

  appendSetCookie(res, serializeCookie("yt_access_token", tokens.access_token, { maxAge: tokens.expires_in || 3600 }));
  if (tokens.refresh_token) {
    appendSetCookie(res, serializeCookie("yt_refresh_token", tokens.refresh_token, { maxAge: 60 * 60 * 24 * 180 }));
  }
  appendSetCookie(res, serializeCookie("yt_oauth_state", "", { maxAge: 0 }));

  res.writeHead(302, { Location: "/#mobile?yt_connected=1" });
  res.end();
};
