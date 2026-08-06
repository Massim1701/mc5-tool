// Liefert die letzten Tweets (max. 100, letzte 30 Tage) inkl. aggregierter Statistik.
const { parseCookies } = require("../_lib/cookies");

module.exports = async (req, res) => {
  const cookies = parseCookies(req);
  const token = cookies.x_access_token;
  if (!token) {
    res.status(401).json({ error: "Nicht mit X verbunden." });
    return;
  }

  const meRes = await fetch(
    "https://api.x.com/2/users/me?user.fields=username,name",
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!meRes.ok) {
    const detail = await meRes.text();
    res.status(meRes.status).json({ error: detail });
    return;
  }
  const me = (await meRes.json()).data;

  const startTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const params = new URLSearchParams({
    max_results: "100",
    "tweet.fields": "created_at,public_metrics",
    start_time: startTime,
    exclude: "retweets,replies",
  });

  const tweetsRes = await fetch(
    `https://api.x.com/2/users/${me.id}/tweets?${params.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!tweetsRes.ok) {
    const detail = await tweetsRes.text();
    res.status(tweetsRes.status).json({ error: detail });
    return;
  }
  const data = await tweetsRes.json();
  const tweets = data.data || [];

  const totals = tweets.reduce(
    (acc, t) => {
      const m = t.public_metrics || {};
      acc.likes += m.like_count || 0;
      acc.retweets += m.retweet_count || 0;
      acc.replies += m.reply_count || 0;
      acc.impressions += m.impression_count || 0;
      return acc;
    },
    { likes: 0, retweets: 0, replies: 0, impressions: 0 }
  );

  res.status(200).json({
    username: me.username,
    name: me.name,
    tweetCount: tweets.length,
    totals,
    tweets: tweets
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map((t) => ({
        id: t.id,
        text: t.text,
        createdAt: t.created_at,
        metrics: t.public_metrics,
      })),
  });
};
