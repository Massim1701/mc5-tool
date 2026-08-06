// Lädt ein Testvideo zu YouTube hoch. Bleibt IMMER privat oder nicht gelistet — nie öffentlich.
// Erwartet: rohe Video-Bytes im Body (Content-Type z.B. video/mp4),
// Titel/Beschreibung/Sichtbarkeit als Query-Parameter (?title=...&description=...&privacy=private)
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
  const token = cookies.yt_access_token;
  if (!token) {
    res.status(401).json({ error: "Nicht mit YouTube verbunden." });
    return;
  }

  // Sicherheitsnetz: niemals "public" erlauben, egal was übergeben wird.
  const allowedPrivacy = ["private", "unlisted"];
  const privacyStatus = allowedPrivacy.includes(req.query.privacy) ? req.query.privacy : "private";
  const title = (req.query.title || "Mission Control Testvideo").toString().slice(0, 100);
  const description = (req.query.description || "Hochgeladen als Test über Mission Control 5.0").toString().slice(0, 4900);
  const contentType = req.headers["content-type"] || "video/mp4";

  let videoBuffer;
  try {
    videoBuffer = await readRawBody(req);
  } catch (e) {
    res.status(400).json({ error: "Video konnte nicht gelesen werden." });
    return;
  }

  if (!videoBuffer || videoBuffer.length === 0) {
    res.status(400).json({ error: "Kein Video im Request-Body gefunden." });
    return;
  }
  // Grobe Grössenbremse, da Vercel-Functions nur begrenzte Payloads annehmen.
  const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
  if (videoBuffer.length > MAX_BYTES) {
    res.status(413).json({ error: "Video zu gross (Limit für Testuploads: 20 MB)." });
    return;
  }

  const metadata = {
    snippet: { title, description },
    status: { privacyStatus, selfDeclaredMadeForKids: false },
  };

  const boundary = "mc5_upload_boundary_" + Date.now();
  const metaPart =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${contentType}\r\n\r\n`;
  const closing = `\r\n--${boundary}--`;

  const body = Buffer.concat([Buffer.from(metaPart, "utf-8"), videoBuffer, Buffer.from(closing, "utf-8")]);

  const uploadRes = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status&uploadType=multipart",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
        "Content-Length": body.length,
      },
      body,
    }
  );

  const data = await uploadRes.json();
  if (!uploadRes.ok) {
    res.status(uploadRes.status).json({ error: data });
    return;
  }

  res.status(200).json({
    uploaded: true,
    videoId: data.id,
    privacyStatus: data.status && data.status.privacyStatus,
    url: `https://youtu.be/${data.id}`,
  });
};
