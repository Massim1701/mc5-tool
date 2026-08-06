// OAuth-Callback von X. Tauscht den Code gegen Access-/Refresh-Token.
const { parseCookies, serializeCookie, appendSetCookie } = require("../../_lib/cookies");

module.exports = async (req, res) => {
  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  const { code, state, error } = req.query;

  if (!clientId || !clientSecret) {
    res.status(500).send(
      `Umgebungsvariablen fehlen auf dieser Deployment: ` +
      `X_CLIENT_ID ${clientId ? "vorhanden (Länge " + clientId.length + ")" : "FEHLT"}, ` +
      `X_CLIENT_SECRET ${clientSecret ? "vorhanden (Länge " + clientSecret.length + ")" : "FEHLT"}. ` +
      `Bitte in Vercel unter Settings → Environment Variables prüfen (Scope "Production" muss angehakt sein) und danach neu deployen.`
    );
    return;
  }

  if (error) {
    res.status(400).send(`X hat die Anfrage abgelehnt: ${error}`);
    return;
  }

  const cookies = parseCookies(req);
  if (!state || state !== cookies.x_oauth_state) {
    res.status(400).send("Ungültiger State-Parameter (mögliche CSRF). Bitte erneut versuchen.");
    return;
  }
  const verifier = cookies.x_pkce_verifier;
  if (!verifier) {
    res.status(400).send("PKCE-Verifier fehlt oder abgelaufen. Bitte Login erneut starten.");
    return;
  }

  const proto = req.headers["x-forwarded-proto"] || "https";
  const redirectUri = `${proto}://${req.headers.host}/api/auth/x/callback`;

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const tokenRes = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  });

  if (!tokenRes.ok) {
    const detail = await tokenRes.text();
    res.status(502).send(`Token-Austausch fehlgeschlagen: ${detail}`);
    return;
  }

  const tokens = await tokenRes.json();
  // tokens: { access_token, refresh_token, expires_in, scope, token_type }

  appendSetCookie(res, serializeCookie("x_access_token", tokens.access_token, { maxAge: tokens.expires_in || 7200 }));
  if (tokens.refresh_token) {
    appendSetCookie(res, serializeCookie("x_refresh_token", tokens.refresh_token, { maxAge: 60 * 60 * 24 * 30 }));
  }
  appendSetCookie(res, serializeCookie("x_pkce_verifier", "", { maxAge: 0 }));
  appendSetCookie(res, serializeCookie("x_oauth_state", "", { maxAge: 0 }));

  res.writeHead(302, { Location: "/#dashboard?x_connected=1" });
  res.end();
};
