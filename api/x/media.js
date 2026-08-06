// Lädt ein Bild zu X hoch (v1.1 media/upload) und gibt die media_id zurück.
// Achtung: dieser X-Endpunkt ist historisch auf OAuth 1.0a ausgelegt. Wir versuchen es
// mit unserem OAuth-2.0-User-Token; falls X das ablehnt, kommt eine klare Fehlermeldung zurück.
const { parseCookies } = require("../_lib/cookies");

module.exports.config = {
  api: { bodyParser: false },
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

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

  const contentType = req.headers["content-type"] || "image/jpeg";
  let imageBuffer;
  try {
    imageBuffer = await readRawBody(req);
  } catch (e) {
    res.status(400).json({ error: "Bild konnte nicht gelesen werden." });
    return;
  }
  if (!imageBuffer || imageBuffer.length === 0) {
    res.status(400).json({ error: "Kein Bild im Request-Body gefunden." });
    return;
  }
  const MAX_BYTES = 5 * 1024 * 1024; // 5 MB (X-Limit für Bilder)
  if (imageBuffer.length > MAX_BYTES) {
    res.status(413).json({ error: "Bild zu gross (Limit: 5 MB)." });
    return;
  }

  const boundary = "mc5_media_boundary_" + Date.now();
  const filename = "upload." + (contentType.split("/")[1] || "jpg");
  const parts = [
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="media"; filename="${filename}"\r\n` +
      `Content-Type: ${contentType}\r\n\r\n`,
  ];
  const body = Buffer.concat([
    Buffer.from(parts[0], "utf-8"),
    imageBuffer,
    Buffer.from(`\r\n--${boundary}--`, "utf-8"),
  ]);

  const uploadRes = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      "Content-Length": body.length,
    },
    body,
  });

  const text = await uploadRes.text();
  let data;
  try { data = JSON.parse(text); } catch (e) { data = { raw: text }; }

  if (!uploadRes.ok) {
    res.status(uploadRes.status).json({
      error: data,
      hint:
        "X's Medien-Upload-Endpunkt akzeptiert eventuell nur OAuth 1.0a statt unseres OAuth-2.0-Tokens. " +
        "Das würde eine zusätzliche Authentifizierungsart erfordern.",
    });
    return;
  }

  res.status(200).json({ uploaded: true, mediaId: data.media_id_string || data.media_id });
};
