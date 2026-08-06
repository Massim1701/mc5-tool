// Liefert Profil + öffentliche Metriken des verbundenen X-Accounts.
const { parseCookies } = require("../_lib/cookies");

module.exports = async (req, res) => {
  const cookies = parseCookies(req);
  const token = cookies.x_access_token;
  if (!token) {
    res.status(401).json({ connected: false, error: "Nicht mit X verbunden." });
    return;
  }

  const apiRes = await fetch(
    "https://api.x.com/2/users/me?user.fields=public_metrics,username,name,profile_image_url",
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!apiRes.ok) {
    const detail = await apiRes.text();
    res.status(apiRes.status).json({ connected: false, error: detail });
    return;
  }

  const data = await apiRes.json();
  // X liefert das Profil verschachtelt unter "data" — hier flach machen.
  res.status(200).json({ connected: true, ...data.data });
};
