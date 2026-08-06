// Mission Control 5.0 — Prototyp-Mockdaten (kein Backend, rein clientseitig)

const PLATFORMS = [
  { id: "x",         name: "X",         code: "X",  color: "#FF7A45" },
  { id: "instagram",  name: "Instagram", code: "IG", color: "#00E5C7" },
  { id: "facebook",   name: "Facebook",  code: "FB", color: "#5B8DEF" },
  { id: "tiktok",     name: "TikTok",    code: "TT", color: "#FF3B7F" },
  { id: "youtube",    name: "YouTube",   code: "YT", color: "#FF0000" },
  { id: "pinterest",  name: "Pinterest", code: "PI", color: "#E60023" },
  { id: "snapchat",   name: "Snapchat",  code: "SC", color: "#FFFC00" },
];

const ANALYTICS = {
  reach: [62, 88, 41, 95, 76, 54, 68], // % vs. platform id order above
  trend7d: [48, 61, 55, 72, 66, 84, 91], // 7-Tage Reichweiten-Index
  kpis: [
    { label: "Reichweite ggü. Vormonat", value: "+18%", accent: "cyan" },
    { label: "Ø Engagement-Rate", value: "4.2%", accent: "orange" },
    { label: "Beiträge / Woche geplant", value: "12", accent: "cyan" },
  ],
  topPosts: [
    { platform: "tiktok", title: "Behind the Scenes: Studio-Setup", reach: "128.400", engagement: "9.4%", date: "03.08." },
    { platform: "instagram", title: "5 Tools, die ich jeden Tag nutze", reach: "84.200", engagement: "6.1%", date: "01.08." },
    { platform: "youtube", title: "Wie ich meinen Workflow automatisiere", reach: "61.900", engagement: "5.8%", date: "29.07." },
    { platform: "x", title: "Kurzer Thread zu Content-Strategie", reach: "22.100", engagement: "3.2%", date: "28.07." },
    { platform: "pinterest", title: "Moodboard: Sommer-Kampagne", reach: "18.700", engagement: "2.9%", date: "27.07." },
  ],
};

const RECENT_ACTIVITY = [
  { platform: "tiktok", text: "Video „Studio-Setup“ veröffentlicht", time: "vor 2 Std." },
  { platform: "instagram", text: "Analytics-Sync abgeschlossen", time: "vor 3 Std." },
  { platform: "x", text: "3 Beiträge für morgen geplant", time: "vor 5 Std." },
  { platform: "youtube", text: "Video-Pipeline: Untertitel erstellt", time: "gestern" },
  { platform: "pinterest", text: "Neuer Pin-Entwurf gespeichert", time: "gestern" },
];

const VIDEO_STEPS = [
  { key: "raw", title: "Rohmaterial", body: "Video-Upload oder Import aus Kamera-Roll / Cloud." },
  { key: "cut", title: "Auto-Cut", body: "KI erkennt die stärksten Momente & schneidet Clips." },
  { key: "captions", title: "Untertitel", body: "Automatische Captions, plattformgerecht gestylt." },
  { key: "reframe", title: "Reframe", body: "Zuschnitt auf 9:16 / 1:1 / 16:9 je Zielkanal." },
  { key: "review", title: "Review", body: "Kurze manuelle Freigabe vor Veröffentlichung." },
];

const CONTENT_TEMPLATES = {
  informativ: (topic) => `${topic} — 3 Dinge, die die wenigsten wissen. Ein kurzer Überblick, warum das gerade jetzt relevant ist und was du daraus mitnehmen kannst.`,
  locker: (topic) => `Okay, reden wir kurz über ${topic}. Ich hab's ausprobiert, hier meine ehrliche Meinung dazu 👇`,
  verkauf: (topic) => `${topic} verändert gerade, wie wir arbeiten. Wenn du das noch nicht nutzt, verpasst du etwas — schau's dir an.`,
};

function platformById(id) {
  return PLATFORMS.find((p) => p.id === id);
}
