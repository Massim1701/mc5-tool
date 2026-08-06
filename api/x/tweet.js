// Postet einen echten Tweet über das verbundene X-Konto.
const { parseCookies } = require("../_lib/cookies");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Nur POST erlaubt." });
    return;
  }

  const cookies = parseCookies(req);
  const token = cookies.x_access_token;
  if (!token) {
    res.status(401).json({ error: "Nicht mit X verbunden." });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const text = (body && body.text || "").trim();
  if (!text) {
    res.status(400).json({ error: "Text darf nicht leer sein." });
    return;
  }
  if (text.length > 280) {
    res.status(400).json({ error: "Text ist länger als 280 Zeichen." });
    return;
  }

  const payload = { text };

  // Medien anhängen (X erlaubt entweder Medien ODER eine Umfrage, nicht beides).
  if (Array.isArray(body.media_ids) && body.media_ids.length > 0) {
    payload.media = { media_ids: body.media_ids.slice(0, 4) };
  } else if (body.poll && Array.isArray(body.poll.options) && body.poll.options.length >= 2) {
    const options = body.poll.options
      .map((o) => (o || "").toString().trim())
      .filter(Boolean)
      .slice(0, 4);
    if (options.length >= 2) {
      payload.poll = {
        options,
        duration_minutes: Math.min(Math.max(parseInt(body.poll.duration_minutes, 10) || 1440, 5), 10080),
      };
    }
  }

  const apiRes = await fetch("https://api.x.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await apiRes.json();
  if (!apiRes.ok) {
    res.status(apiRes.status).json({ error: data });
    return;
  }

  res.status(200).json({ posted: true, tweet: data.data });
};
