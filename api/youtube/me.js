// Liefert Kanal-Info des verbundenen YouTube-Accounts. Erneuert den Access Token bei Bedarf.
const { parseCookies, serializeCookie, appendSetCookie } = require("../_lib/cookies");

async function refreshAccessToken(refreshToken) {
  const clientId = process.env.YT_CLIENT_ID;
  const clientSecret = process.env.YT_CLIENT_SECRET;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!r.ok) return null;
  return r.json();
}

module.exports = async (req, res) => {
  const cookies = parseCookies(req);
  let token = cookies.yt_access_token;

  if (!token) {
    if (!cookies.yt_refresh_token) {
      res.status(401).json({ connected: false, error: "Nicht mit YouTube verbunden." });
      return;
    }
    const refreshed = await refreshAccessToken(cookies.yt_refresh_token);
    if (!refreshed) {
      res.status(401).json({ connected: false, error: "Sitzung abgelaufen, bitte erneut verbinden." });
      return;
    }
    token = refreshed.access_token;
    appendSetCookie(res, serializeCookie("yt_access_token", token, { maxAge: refreshed.expires_in || 3600 }));
  }

  const apiRes = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!apiRes.ok) {
    const detail = await apiRes.text();
    res.status(apiRes.status).json({ connected: false, error: detail });
    return;
  }

  const data = await apiRes.json();
  const channel = data.items && data.items[0];
  if (!channel) {
    res.status(404).json({ connected: false, error: "Kein Kanal gefunden." });
    return;
  }

  res.status(200).json({
    connected: true,
    channelId: channel.id,
    title: channel.snippet.title,
    thumbnail: channel.snippet.thumbnails && channel.snippet.thumbnails.default && channel.snippet.thumbnails.default.url,
    subscriberCount: channel.statistics.subscriberCount,
    videoCount: channel.statistics.videoCount,
  });
};
