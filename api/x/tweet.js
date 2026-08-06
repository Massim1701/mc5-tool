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

  const apiRes = await fetch("https://api.x.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  const data = await apiRes.json();
  if (!apiRes.ok) {
    res.status(apiRes.status).json({ error: data });
    return;
  }

  res.status(200).json({ posted: true, tweet: data.data });
};
