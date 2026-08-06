// Mission Control 5.0 — Prototyp-Logik (rein clientseitig, keine echten API-Calls)

(function () {
  "use strict";

  /* ---------- Navigation ---------- */

  const navItems = document.querySelectorAll(".nav-item");
  const views = document.querySelectorAll(".view");

  function showView(name) {
    views.forEach((v) => v.classList.toggle("active", v.id === "view-" + name));
    navItems.forEach((n) => n.classList.toggle("active", n.dataset.view === name));
    if (history.replaceState) history.replaceState(null, "", "#" + name);
  }

  navItems.forEach((btn) => {
    btn.addEventListener("click", () => showView(btn.dataset.view));
  });

  /* ---------- Plattform-Logos (Font Awesome Brand-Icons) ---------- */

  const ICON_X = `<i class="fa-brands fa-x-twitter" style="font-size:1em;"></i>`;
  const ICON_YOUTUBE = `<i class="fa-brands fa-youtube" style="font-size:1em;"></i>`;
  const ICON_INSTAGRAM = `<i class="fa-brands fa-instagram" style="font-size:1em;"></i>`;
  const ICON_FACEBOOK = `<i class="fa-brands fa-facebook" style="font-size:1em;"></i>`;
  const ICON_TIKTOK = `<i class="fa-brands fa-tiktok" style="font-size:1em;"></i>`;
  const ICON_PINTEREST = `<i class="fa-brands fa-pinterest" style="font-size:1em;"></i>`;
  const ICON_SNAPCHAT = `<i class="fa-brands fa-snapchat" style="font-size:1em;"></i>`;
  const PLATFORM_ICONS = {
    x: ICON_X,
    instagram: ICON_INSTAGRAM,
    facebook: ICON_FACEBOOK,
    tiktok: ICON_TIKTOK,
    youtube: ICON_YOUTUBE,
    pinterest: ICON_PINTEREST,
    snapchat: ICON_SNAPCHAT,
  };

  /* ---------- Live X-Verbindung (echt, kein Mock) ---------- */

  let xLive = { connected: false, username: null };
  let ytLive = { connected: false, title: null };

  function renderXConnectStatus() {
    const el = document.getElementById("xConnectStatus");
    if (!el) return;
    if (xLive.connected) {
      el.innerHTML = `
        <span class="status-chip">${ICON_X} <span class="dot" style="background:#2ee6a6;"></span> Verbunden als @${xLive.username}</span>
        <span style="color:var(--muted); font-size:13px;">${xLive.followers != null ? xLive.followers.toLocaleString("de-DE") + " Follower (live)" : ""}</span>
      `;
    } else {
      el.innerHTML = `
        <button class="btn btn-primary" id="xConnectBtn">${ICON_X} Mit X verbinden</button>
        <span style="color:var(--muted); font-size:13px;">Verbindet deinen echten X-Account per OAuth 2.0.</span>
      `;
      const btn = document.getElementById("xConnectBtn");
      if (btn) btn.addEventListener("click", () => { window.location.href = "/api/auth/x/login"; });
    }
    renderPlatformStatus();
  }

  async function checkXConnection() {
    try {
      const r = await fetch("/api/x/me");
      if (r.ok) {
        const data = await r.json();
        xLive = {
          connected: true,
          username: data.username,
          followers: data.public_metrics ? data.public_metrics.followers_count : null,
        };
      } else {
        xLive = { connected: false };
      }
    } catch (e) {
      xLive = { connected: false };
    }
    renderXConnectStatus();
  }

  renderXConnectStatus();
  checkXConnection();

  /* ---------- Live YouTube-Verbindung (echt, kein Mock) ---------- */

  function renderYtConnectStatus() {
    const el = document.getElementById("ytConnectStatus");
    if (!el) return;
    if (ytLive.connected) {
      el.innerHTML = `
        <span class="status-chip">${ICON_YOUTUBE} <span class="dot" style="background:#2ee6a6;"></span> Verbunden als ${ytLive.title}</span>
        <span style="color:var(--muted); font-size:13px;">${ytLive.subscriberCount != null ? Number(ytLive.subscriberCount).toLocaleString("de-DE") + " Abonnenten (live)" : ""}</span>
      `;
    } else {
      el.innerHTML = `
        <button class="btn btn-primary" id="ytConnectBtn">${ICON_YOUTUBE} Mit YouTube verbinden</button>
        <span style="color:var(--muted); font-size:13px;">Verbindet deinen echten YouTube-Kanal per OAuth 2.0.</span>
      `;
      const btn = document.getElementById("ytConnectBtn");
      if (btn) btn.addEventListener("click", () => { window.location.href = "/api/auth/youtube/login"; });
    }
    renderYtUploadForm();
    renderPlatformStatus();
  }

  function renderYtUploadForm() {
    const el = document.getElementById("ytUploadArea");
    if (!el) return;
    if (!ytLive.connected) {
      el.innerHTML = `<p style="color:var(--muted); font-size:13px;">Erst verbinden, dann kannst du hier ein Testvideo hochladen.</p>`;
      return;
    }
    el.innerHTML = `
      <div class="field">
        <label for="ytFile">Videodatei (max. 20&nbsp;MB, nur zum Testen)</label>
        <input type="file" id="ytFile" accept="video/*">
      </div>
      <div class="field">
        <label for="ytTitle">Titel</label>
        <input type="text" id="ytTitle" value="Mission Control Testvideo">
      </div>
      <div class="field">
        <label for="ytPrivacy">Sichtbarkeit</label>
        <select id="ytPrivacy">
          <option value="private">Privat (nur du)</option>
          <option value="unlisted">Nicht gelistet (nur mit Link)</option>
        </select>
      </div>
      <button class="btn btn-primary" id="ytUploadBtn">⇧ Testvideo hochladen</button>
      <div id="ytUploadResult" style="margin-top:10px; font-size:13px; color:var(--muted);"></div>
    `;
    const uploadBtn = document.getElementById("ytUploadBtn");
    uploadBtn.addEventListener("click", async () => {
      const fileInput = document.getElementById("ytFile");
      const title = document.getElementById("ytTitle").value || "Mission Control Testvideo";
      const privacy = document.getElementById("ytPrivacy").value;
      const resultEl = document.getElementById("ytUploadResult");
      const file = fileInput.files && fileInput.files[0];
      if (!file) {
        resultEl.textContent = "Bitte zuerst eine Videodatei auswählen.";
        return;
      }
      uploadBtn.disabled = true;
      resultEl.textContent = "Lädt hoch …";
      try {
        const params = new URLSearchParams({ title, privacy, description: "Hochgeladen als Test über Mission Control 5.0" });
        const r = await fetch(`/api/youtube/upload?${params.toString()}`, {
          method: "POST",
          headers: { "Content-Type": file.type || "video/mp4" },
          body: file,
        });
        const data = await r.json();
        if (r.ok && data.uploaded) {
          resultEl.innerHTML = `Hochgeladen (${data.privacyStatus}): <a href="${data.url}" target="_blank" style="color:var(--cyan);">${data.url}</a>`;
        } else {
          resultEl.textContent = "Fehler: " + JSON.stringify(data.error || data);
        }
      } catch (e) {
        resultEl.textContent = "Fehler beim Upload: " + e.message;
      } finally {
        uploadBtn.disabled = false;
      }
    });
  }

  async function checkYtConnection() {
    try {
      const r = await fetch("/api/youtube/me");
      if (r.ok) {
        const data = await r.json();
        ytLive = { connected: true, title: data.title, subscriberCount: data.subscriberCount };
      } else {
        ytLive = { connected: false };
      }
    } catch (e) {
      ytLive = { connected: false };
    }
    renderYtConnectStatus();
  }

  renderYtConnectStatus();
  checkYtConnection();

  const initialHash = (location.hash || "").replace("#", "");
  const validViews = ["dashboard", "analytics", "content", "video", "mobile", "publish", "xfeed"];
  if (validViews.includes(initialHash)) showView(initialHash);

  /* ---------- Dashboard: Verbindungsstatus je Plattform ---------- */

  function renderPlatformStatus() {
    const el = document.getElementById("platformStatusList");
    if (!el) return;
    const liveStatus = {
      x: xLive.connected ? "on" : "off",
      youtube: ytLive.connected ? "on" : "off",
    };
    el.innerHTML = PLATFORMS.map((p) => {
      const state = liveStatus[p.id] || "unset";
      const inner = PLATFORM_ICONS[p.id] || p.code;
      const clickable = p.id === "x";
      return `
        <div class="platform-status-item" data-platform="${p.id}" title="${p.name}${state === "unset" ? " (noch keine Live-Anbindung)" : ""}" style="${clickable ? "cursor:pointer;" : ""}">
          <div class="platform-status-badge" style="color:${p.color}; border-color:${p.color}; font-size:18px;">
            ${inner}
            <span class="platform-status-indicator ${state}"></span>
          </div>
          <span class="platform-status-label">${p.name}</span>
        </div>
      `;
    }).join("");

    const xItem = el.querySelector('[data-platform="x"]');
    if (xItem) {
      xItem.addEventListener("click", () => {
        if (!xLive.connected) {
          showView("dashboard");
          const btn = document.getElementById("xConnectBtn");
          if (btn) btn.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
        showView("xfeed");
        loadXFeed();
      });
    }
  }

  /* ---------- X-Feed-Ansicht (echte Tweets + 30-Tage-Statistik) ---------- */

  async function loadXFeed() {
    const listEl = document.getElementById("xFeedTweetList");
    const statsEl = document.getElementById("xFeedStats");
    const titleEl = document.getElementById("xFeedTitle");
    if (!listEl || !statsEl) return;
    listEl.innerHTML = `<p style="color:var(--muted); font-size:13px;">Lädt …</p>`;
    statsEl.innerHTML = `<p style="color:var(--muted); font-size:13px;">Lädt …</p>`;

    try {
      const r = await fetch("/api/x/recent");
      const data = await r.json();
      if (!r.ok) {
        listEl.innerHTML = `<p style="color:var(--muted); font-size:13px;">Fehler: ${JSON.stringify(data.error || data)}</p>`;
        statsEl.innerHTML = "";
        return;
      }

      if (titleEl) titleEl.textContent = `Mein X-Feed — @${data.username}`;

      if (!data.tweets.length) {
        listEl.innerHTML = `<p style="color:var(--muted); font-size:13px;">Keine Tweets in den letzten 30 Tagen gefunden.</p>`;
      } else {
        listEl.innerHTML = data.tweets.map((t) => {
          const date = new Date(t.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
          const m = t.metrics || {};
          return `
            <div style="padding:12px 0; border-bottom:1px solid var(--line);">
              <p style="margin:0 0 8px 0; font-size:14px; line-height:1.5;">${(t.text || "").replace(/</g, "&lt;")}</p>
              <div style="display:flex; gap:14px; flex-wrap:wrap; font-size:12px; color:var(--muted);">
                <span>${date}</span>
                <span>❤️ ${m.like_count ?? 0}</span>
                <span>🔁 ${m.retweet_count ?? 0}</span>
                <span>💬 ${m.reply_count ?? 0}</span>
                <span>👁️ ${m.impression_count ?? 0}</span>
              </div>
            </div>
          `;
        }).join("");
      }

      const t = data.totals || {};
      statsEl.innerHTML = `
        <div class="grid cols-2" style="gap:12px;">
          <div class="card" style="background:var(--panel-2);"><div class="card-label">Tweets</div><div class="kpi-value cyan">${data.tweetCount}</div></div>
          <div class="card" style="background:var(--panel-2);"><div class="card-label">Impressions</div><div class="kpi-value cyan">${(t.impressions || 0).toLocaleString("de-DE")}</div></div>
          <div class="card" style="background:var(--panel-2);"><div class="card-label">Likes</div><div class="kpi-value orange">${(t.likes || 0).toLocaleString("de-DE")}</div></div>
          <div class="card" style="background:var(--panel-2);"><div class="card-label">Retweets</div><div class="kpi-value orange">${(t.retweets || 0).toLocaleString("de-DE")}</div></div>
          <div class="card" style="background:var(--panel-2); grid-column: span 2;"><div class="card-label">Replies</div><div class="kpi-value cyan">${(t.replies || 0).toLocaleString("de-DE")}</div></div>
        </div>
      `;
    } catch (e) {
      listEl.innerHTML = `<p style="color:var(--muted); font-size:13px;">Fehler beim Laden: ${e.message}</p>`;
      statsEl.innerHTML = "";
    }
  }

  const xFeedBackBtn = document.getElementById("xFeedBackBtn");
  if (xFeedBackBtn) xFeedBackBtn.addEventListener("click", () => showView("dashboard"));

  /* ---------- Sidebar platform mini list ---------- */

  const platformMiniList = document.getElementById("platformMiniList");
  PLATFORMS.forEach((p) => {
    const el = document.createElement("div");
    el.className = "platform-dot";
    el.style.color = p.color;
    el.style.borderColor = p.color;
    el.title = p.name;
    el.innerHTML = PLATFORM_ICONS[p.id] || p.code;
    platformMiniList.appendChild(el);
  });

  /* ---------- Dashboard ---------- */

  const kpiCards = document.getElementById("kpiCards");
  kpiCards.outerHTML = ANALYTICS.kpis.map((k) => `
    <div class="card">
      <div class="card-label">${k.label}</div>
      <div class="kpi-value ${k.accent}">${k.value}</div>
    </div>
  `).join("");

  const dashBars = document.getElementById("dashBars");
  function renderBars(container, values) {
    container.innerHTML = PLATFORMS.map((p, i) => `
      <div class="bar-row">
        <div class="bar-row-top"><span class="name">${p.name}</span><span class="val">${values[i]}%</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${values[i]}%; background:${p.color};"></div></div>
      </div>
    `).join("");
  }
  renderBars(dashBars, ANALYTICS.reach);

  const activityList = document.getElementById("activityList");
  activityList.innerHTML = RECENT_ACTIVITY.map((a) => {
    const p = platformById(a.platform);
    return `
      <div class="activity-item">
        <span class="pbadge" style="width:26px;height:26px;font-size:9px;color:${p.color};border-color:${p.color};">${p.code}</span>
        <span>${a.text}</span>
        <span class="time">${a.time}</span>
      </div>
    `;
  }).join("");

  /* ---------- Analytics ---------- */

  renderBars(document.getElementById("analyticsBars"), ANALYTICS.reach);

  function drawTrend() {
    const canvas = document.getElementById("trendCanvas");
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    const data = ANALYTICS.trend7d;
    const max = Math.max(...data) * 1.15;
    const pad = 24;

    ctx.clearRect(0, 0, w, h);

    // grid lines
    ctx.strokeStyle = "#26305a";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const y = pad + (i * (h - pad * 2)) / 3;
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(w - pad, y);
      ctx.stroke();
    }

    // line
    ctx.beginPath();
    ctx.strokeStyle = "#00e5c7";
    ctx.lineWidth = 2.5;
    data.forEach((v, i) => {
      const x = pad + (i * (w - pad * 2)) / (data.length - 1);
      const y = h - pad - (v / max) * (h - pad * 2);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // fill
    ctx.lineTo(w - pad, h - pad);
    ctx.lineTo(pad, h - pad);
    ctx.closePath();
    ctx.fillStyle = "rgba(0,229,199,0.08)";
    ctx.fill();

    // dots
    ctx.fillStyle = "#00e5c7";
    data.forEach((v, i) => {
      const x = pad + (i * (w - pad * 2)) / (data.length - 1);
      const y = h - pad - (v / max) * (h - pad * 2);
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  (function initCanvas() {
    const canvas = document.getElementById("trendCanvas");
    canvas.width = canvas.clientWidth || canvas.width;
  })();
  drawTrend();
  window.addEventListener("resize", () => {
    const canvas = document.getElementById("trendCanvas");
    canvas.width = canvas.clientWidth;
    drawTrend();
  });

  let topPostsSort = { key: null, dir: 1 };
  function renderTopPosts() {
    let rows = [...ANALYTICS.topPosts];
    if (topPostsSort.key) {
      rows.sort((a, b) => {
        const av = a[topPostsSort.key], bv = b[topPostsSort.key];
        return av > bv ? topPostsSort.dir : av < bv ? -topPostsSort.dir : 0;
      });
    }
    document.getElementById("topPostsBody").innerHTML = rows.map((r) => {
      const p = platformById(r.platform);
      return `
        <tr>
          <td><span class="pbadge" style="width:24px;height:24px;font-size:8.5px;color:${p.color};border-color:${p.color};">${p.code}</span></td>
          <td class="title-cell">${r.title}</td>
          <td>${r.reach}</td>
          <td>${r.engagement}</td>
          <td>${r.date}</td>
        </tr>
      `;
    }).join("");
  }
  renderTopPosts();
  document.querySelectorAll("#topPostsTable th[data-key]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.key;
      topPostsSort.dir = topPostsSort.key === key ? -topPostsSort.dir : 1;
      topPostsSort.key = key;
      renderTopPosts();
    });
  });

  /* ---------- KI-Content ---------- */

  function renderPlatformChecks(container, defaultChecked) {
    container.innerHTML = PLATFORMS.map((p) => `
      <label class="check-pill ${defaultChecked.includes(p.id) ? "checked" : ""}">
        <input type="checkbox" value="${p.id}" ${defaultChecked.includes(p.id) ? "checked" : ""}>
        <span class="pbadge" style="width:18px;height:18px;font-size:7px;color:${p.color};border-color:${p.color};">${p.code}</span>
        ${p.name}
      </label>
    `).join("");
    container.querySelectorAll(".check-pill").forEach((label) => {
      const input = label.querySelector("input");
      label.addEventListener("click", (e) => {
        e.preventDefault();
        input.checked = !input.checked;
        label.classList.toggle("checked", input.checked);
      });
    });
  }

  renderPlatformChecks(document.getElementById("contentPlatformChecks"), ["instagram", "x", "tiktok"]);

  document.getElementById("generateBtn").addEventListener("click", () => {
    const topic = document.getElementById("topicInput").value.trim() || "dein Thema";
    const tone = document.getElementById("toneSelect").value;
    const selected = [...document.querySelectorAll("#contentPlatformChecks input:checked")].map((i) => i.value);
    const draftsList = document.getElementById("draftsList");

    if (selected.length === 0) {
      draftsList.innerHTML = `<div class="empty-hint">Bitte mindestens einen Kanal auswählen.</div>`;
      return;
    }

    draftsList.innerHTML = `<div class="empty-hint">Generiere Entwürfe …</div>`;
    setTimeout(() => {
      const template = CONTENT_TEMPLATES[tone] || CONTENT_TEMPLATES.informativ;
      draftsList.innerHTML = selected.map((id) => {
        const p = platformById(id);
        return `
          <div class="card" style="margin-bottom:12px; background:var(--panel-2);">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
              <span class="pbadge" style="width:22px;height:22px;font-size:8px;color:${p.color};border-color:${p.color};">${p.code}</span>
              <strong style="font-size:13px;">${p.name}</strong>
            </div>
            <p style="margin:0; font-size:13px; color:var(--muted); line-height:1.5;">${template(topic)}</p>
          </div>
        `;
      }).join("");
    }, 550);
  });

  /* ---------- Video Pipeline ---------- */

  const pipelineSteps = document.getElementById("pipelineSteps");
  pipelineSteps.innerHTML = VIDEO_STEPS.map((s, i) => `
    <div class="pipeline-step" data-key="${s.key}">
      <div class="step-num">${String(i + 1).padStart(2, "0")}</div>
      <h4>${s.title}</h4>
      <p>${s.body}</p>
    </div>
  `).join("");

  document.getElementById("processBtn").addEventListener("click", () => {
    const stepEls = [...pipelineSteps.querySelectorAll(".pipeline-step")];
    const btn = document.getElementById("processBtn");
    const exportCard = document.getElementById("exportCard");
    stepEls.forEach((el) => el.classList.remove("active", "done"));
    exportCard.style.display = "none";
    btn.disabled = true;
    btn.textContent = "Verarbeite …";

    let i = 0;
    function step() {
      if (i > 0) stepEls[i - 1].classList.replace("active", "done");
      if (i < stepEls.length) {
        stepEls[i].classList.add("active");
        i++;
        setTimeout(step, 500);
      } else {
        btn.disabled = false;
        btn.textContent = "▶ Video verarbeiten";
        exportCard.style.display = "";
        document.getElementById("exportThumbs").innerHTML = PLATFORMS.map((p) => `
          <div class="card" style="padding:12px; text-align:center;">
            <span class="pbadge" style="width:26px;height:26px;font-size:9px;color:${p.color};border-color:${p.color};">${p.code}</span>
            <div style="font-size:10.5px; color:var(--muted); margin-top:8px;">bereit</div>
          </div>
        `).join("");
      }
    }
    step();
  });

  /* ---------- Mobile App ---------- */

  const mobileNotifs = [
    { text: "Schnitt fertig — Video bereit zur Freigabe", time: "vor 4 Min." },
    { text: "TikTok-Post live", time: "vor 1 Std." },
    { text: "Upload abgeschlossen: Video_export.mp4", time: "vor 2 Std." },
  ];
  document.getElementById("mobileNotifs").innerHTML = mobileNotifs.map((n) => `
    <div class="activity-item"><span>🔔 ${n.text}</span><span class="time">${n.time}</span></div>
  `).join("");

  const wifiToggle = document.getElementById("wifiToggle");
  wifiToggle.addEventListener("change", () => {
    const onWifi = wifiToggle.checked;
    document.getElementById("wifiLabel").textContent = onWifi
      ? "WLAN aktiv — Upload mit voller Geschwindigkeit"
      : "Mobilfunk aktiv — Upload läuft, Qualität ggf. reduziert";
    document.getElementById("phoneStatus").textContent = onWifi ? "📶 WLAN" : "📱 Mobilfunk";
    document.getElementById("phoneUploadMeta").textContent = (onWifi ? "WLAN · " : "Mobilfunk · ") + "72%";
    document.getElementById("phoneProgress").style.background = onWifi ? "var(--cyan)" : "var(--orange)";
  });

  /* ---------- Multi-Publish ---------- */

  renderPlatformChecks(document.getElementById("publishPlatformChecks"), ["instagram", "facebook", "x", "tiktok", "youtube", "pinterest", "snapchat"]);

  const QUEUE_KEY = "mc5_proto_queue";
  function loadQueue() {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY)) || []; } catch (e) { return []; }
  }
  function saveQueue(q) {
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch (e) { /* ignore */ }
  }

  function renderQueue() {
    const queue = loadQueue();
    const el = document.getElementById("queueList");
    if (queue.length === 0) {
      el.innerHTML = `<div class="empty-hint">Noch nichts eingeplant.</div>`;
      return;
    }
    el.innerHTML = queue.map((item, idx) => `
      <div class="queue-item">
        <div class="queue-dots">
          ${item.platforms.map((id) => { const p = platformById(id); return `<span class="qdot" style="background:${p.color};" title="${p.name}"></span>`; }).join("")}
        </div>
        <div class="qtext">
          <div class="qtitle">${item.text || "(ohne Text)"}</div>
          <div class="qmeta">${item.time ? new Date(item.time).toLocaleString("de-DE") : "sofort"}</div>
        </div>
        <span class="status-badge ${item.status}" data-idx="${idx}">${item.status === "planned" ? "Geplant" : "Veröffentlicht"}</span>
      </div>
    `).join("");

    el.querySelectorAll(".status-badge").forEach((badge) => {
      badge.addEventListener("click", () => {
        const q = loadQueue();
        const idx = Number(badge.dataset.idx);
        q[idx].status = q[idx].status === "planned" ? "published" : "planned";
        saveQueue(q);
        renderQueue();
      });
    });
  }
  renderQueue();

  document.getElementById("scheduleBtn").addEventListener("click", async () => {
    const text = document.getElementById("postText").value.trim();
    const time = document.getElementById("scheduleTime").value;
    const selected = [...document.querySelectorAll("#publishPlatformChecks input:checked")].map((i) => i.value);
    if (selected.length === 0) return;

    let xResultNote = "";
    if (selected.includes("x") && xLive.connected && text) {
      const btn = document.getElementById("scheduleBtn");
      const original = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Poste auf X …";
      try {
        const r = await fetch("/api/x/tweet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const data = await r.json();
        if (r.ok && data.posted) {
          xResultNote = ` · echt live auf X gepostet (ID ${data.tweet.id})`;
        } else {
          xResultNote = ` · X-Post fehlgeschlagen: ${(data.error && data.error.detail) || JSON.stringify(data.error) || "unbekannter Fehler"}`;
        }
      } catch (e) {
        xResultNote = " · X-Post fehlgeschlagen (Netzwerkfehler)";
      }
      btn.disabled = false;
      btn.textContent = original;
    }

    const queue = loadQueue();
    queue.unshift({ text: text + xResultNote, time, platforms: selected, status: "planned" });
    saveQueue(queue);
    document.getElementById("postText").value = "";
    renderQueue();
  });

})();
