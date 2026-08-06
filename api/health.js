// Einfacher Health-Check, um die Vercel-Bereitstellung zu bestätigen.
// Aufrufbar unter /api/health

module.exports = (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "mission-control-5.0-backend",
    time: new Date().toISOString(),
  });
};
