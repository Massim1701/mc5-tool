// Liefert die letzten Tweets + Tages-Statistik für einen wählbaren Zeitraum (7/28/90 Tage).
const { parseCookies } = require("../_lib/cookies");

const ALLOWED_DAYS = [7, 28, 90];

function dateKey(d) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

module.exports = async (req, res) => {
  const cookies = parseCookies(req);
  const token = cookies.x_access_token;
  if (!token) {
    res.status(401).json({ error: "Nicht mit X verbunden." });
    return;
  }

  let days = parseInt(req.query.days, 10);
  if (!ALLOWED_DAYS.includes(days)) days = 7;

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

  const startTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Bis zu 3 Seiten (max. 300 Tweets) holen, um Kosten/Zeit im Rahmen zu halten.
  let allTweets = [];
  let paginationToken = null;
  for (let page = 0; page < 3; page++) {
    const params = new URLSearchParams({
      max_results: "100",
      "tweet.fields": "created_at,public_metrics",
      start_time: startTime,
      exclude: "retweets,replies",
    });
    if (paginationToken) params.set("pagination_token", paginationToken);

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
    allTweets = allTweets.concat(data.data || []);
    paginationToken = data.meta && data.meta.next_token;
    if (!paginationToken) break;
  }

  // Tages-Buckets für den gesamten Zeitraum vorbereiten (auch Tage ohne Tweets).
  const buckets = {};
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    buckets[dateKey(d)] = { date: dateKey(d), tweets: 0, likes: 0, retweets: 0, replies: 0, impressions: 0 };
  }

  const totals = { likes: 0, retweets: 0, replies: 0, impressions: 0 };
  allTweets.forEach((t) => {
    const m = t.public_metrics || {};
    const key = dateKey(new Date(t.created_at));
    if (buckets[key]) {
      buckets[key].tweets += 1;
      buckets[key].likes += m.like_count || 0;
      buckets[key].retweets += m.retweet_count || 0;
      buckets[key].replies += m.reply_count || 0;
      buckets[key].impressions += m.impression_count || 0;
    }
    totals.likes += m.like_count || 0;
    totals.retweets += m.retweet_count || 0;
    totals.replies += m.reply_count || 0;
    totals.impressions += m.impression_count || 0;
  });

  const dailySeries = Object.values(buckets).sort((a, b) => (a.date < b.date ? -1 : 1));

  res.status(200).json({
    username: me.username,
    name: me.name,
    days,
    tweetCount: allTweets.length,
    totals,
    dailySeries,
    tweets: allTweets
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 40)
      .map((t) => ({
        id: t.id,
        text: t.text,
        createdAt: t.created_at,
        metrics: t.public_metrics,
      })),
  });
};
