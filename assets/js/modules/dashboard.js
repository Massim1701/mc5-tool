/*
====================================================

 We ❤️ 80s Mission Control 5.1

 DASHBOARD MODULE

 Countdown zum nächsten optimalen Posting-Zeitpunkt
 (pro Wochentag konfigurierbar, abgeleitet aus X's
 "Aktive Zeiten"-Heatmap) und Wochentags-Insight aus
 den CSV-Daten.

====================================================
*/

const POSTING_TIMES_KEY = "missionPostingTimesByDay";
const DONE_SLOTS_KEY = "missionDoneSlots";

// Aus der X "Aktive Zeiten"-Heatmap abgelesen (lokale Zeitzone):
// Donnerstag mittags, Dienstag/Samstag/Freitag abends als Hotspots.
const DEFAULT_POSTING_TIMES_BY_DAY = {

    Mo: [],
    Di: ["19:30"],
    Mi: [],
    Do: ["13:00"],
    Fr: ["20:00"],
    Sa: ["18:30"],
    So: [],
    default: ["14:00", "18:00"]

};

const DAY_KEYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const FIELD_IDS = {
    Mo: "postingTimeMo",
    Di: "postingTimeDi",
    Mi: "postingTimeMi",
    Do: "postingTimeDo",
    Fr: "postingTimeFr",
    Sa: "postingTimeSa",
    So: "postingTimeSo",
    default: "postingTimeDefault"
};

/* ----------------------------------------------------------
   Posting-Zeiten: Laden / Speichern
---------------------------------------------------------- */

function loadPostingTimesByDay(){

    const saved = localStorage.getItem(POSTING_TIMES_KEY);

    if(!saved){
        return DEFAULT_POSTING_TIMES_BY_DAY;
    }

    try{

        const parsed = JSON.parse(saved);

        if(parsed && typeof parsed === "object"){
            return parsed;
        }

        return DEFAULT_POSTING_TIMES_BY_DAY;

    }
    catch(error){

        console.warn("Posting-Zeiten konnten nicht gelesen werden:", error);
        return DEFAULT_POSTING_TIMES_BY_DAY;

    }

}

function savePostingTimesByDay(data){

    localStorage.setItem(POSTING_TIMES_KEY, JSON.stringify(data));

}

function parseTimesInput(text){

    if(!text){
        return [];
    }

    return text

        .split(",")

        .map(t => t.trim())

        .filter(t => /^\d{1,2}:\d{2}$/.test(t))

        .map(t => {

            const [h, m] = t.split(":");

            return h.padStart(2, "0") + ":" + m.padStart(2, "0");

        });

}

function getTimesForDay(dayKey){

    const data = loadPostingTimesByDay();

    const specific = data[dayKey];

    if(Array.isArray(specific) && specific.length > 0){
        return specific;
    }

    return Array.isArray(data.default) ? data.default : [];

}

/* ----------------------------------------------------------
   Abgehakte Slots (via "Erledigt"-Button)

   Jeder Slot bekommt eine eindeutige ID aus Datum + Uhrzeit
   (z.B. "2026-07-26_18:00"). Abgehakte Slots werden bei der
   Suche nach dem nächsten Zeitpunkt übersprungen. Vergangene
   Einträge werden beim Laden automatisch aufgeräumt.
---------------------------------------------------------- */

function slotId(date, timeStr){

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");

    return y + "-" + m + "-" + d + "_" + timeStr;

}

function loadDoneSlots(){

    const saved = localStorage.getItem(DONE_SLOTS_KEY);

    if(!saved){
        return [];
    }

    try{
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch(error){
        return [];
    }

}

function saveDoneSlots(slots){

    localStorage.setItem(DONE_SLOTS_KEY, JSON.stringify(slots));

}

function markSlotDone(date, timeStr){

    const slots = loadDoneSlots();
    const id = slotId(date, timeStr);

    if(!slots.includes(id)){
        slots.push(id);
    }

    saveDoneSlots(slots);

}

/* ----------------------------------------------------------
   Countdown zum nächsten Posting-Zeitpunkt
---------------------------------------------------------- */

function getNextPostingMoment(){

    const now = new Date();
    const doneSlots = loadDoneSlots();

    const candidates = [];

    // Heute + die nächsten 7 Tage als Kandidaten sammeln
    for(let dayOffset = 0; dayOffset <= 7; dayOffset++){

        const candidateDate = new Date(now);
        candidateDate.setDate(candidateDate.getDate() + dayOffset);

        const dayKey = DAY_KEYS[candidateDate.getDay()];
        const times = getTimesForDay(dayKey);

        times.forEach(timeStr => {

            const [hours, minutes] = timeStr.split(":").map(Number);

            const candidate = new Date(candidateDate);
            candidate.setHours(hours, minutes, 0, 0);

            const id = slotId(candidate, timeStr);

            if(candidate > now && !doneSlots.includes(id)){
                candidates.push({ date: candidate, timeStr: timeStr, dayKey: dayKey });
            }

        });

    }

    candidates.sort((a, b) => a.date - b.date);

    return candidates.length > 0 ? candidates[0] : null;

}

function formatCountdown(targetDate){

    const now = new Date();
    const diffMs = targetDate - now;

    if(diffMs <= 0){
        return "jetzt!";
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = n => String(n).padStart(2, "0");

    return pad(hours) + ":" + pad(minutes) + ":" + pad(seconds);

}

let countdownIntervalId = null;

function updateCountdownDisplay(){

    const timerEl = document.getElementById("nextPostTimer");
    const subEl = document.getElementById("nextPostTimerSub");

    if(!timerEl){
        return;
    }

    const next = getNextPostingMoment();

    if(!next){

        timerEl.textContent = "Keine Posting-Zeiten hinterlegt";

        if(subEl){
            subEl.textContent = "Trag welche in Settings ein.";
        }

        return;

    }

    timerEl.textContent = formatCountdown(next.date);

    if(subEl){

        const isToday = next.date.toDateString() === new Date().toDateString();
        const dayLabel = isToday ? "heute" : next.dayKey;

        subEl.textContent = "Nächster Slot: " + next.timeStr + " Uhr (" + dayLabel + ")";

    }

}

function startCountdown(){

    if(countdownIntervalId){
        clearInterval(countdownIntervalId);
    }

    updateCountdownDisplay();

    countdownIntervalId = setInterval(updateCountdownDisplay, 1000);

}

/* ----------------------------------------------------------
   Bester Wochentag aus den CSV-Daten
---------------------------------------------------------- */

/* ----------------------------------------------------------
   Kennzahlen-Karten: Nächster Slot, Posts gesamt,
   Zeitversetzt ausstehend, Bester Tag
---------------------------------------------------------- */

function renderDashboardStats(){

    // Posts gesamt & Zeitversetzt ausstehend aus Archiv
    let archive = [];
    try{
        const saved = localStorage.getItem("missionArchive");
        archive = saved ? JSON.parse(saved) : [];
    }
    catch(e){ archive = []; }

    const total = archive.length;
    const scheduled = archive.filter(p =>
        p.postMode === "scheduled" && !p.publishedAt
    ).length;

    const totalEl = document.getElementById("dashStatTotal");
    if(totalEl){ totalEl.textContent = total; }

    const schedEl = document.getElementById("dashStatScheduled");
    if(schedEl){ schedEl.textContent = scheduled; }

    // Nächster Slot aus dem Countdown-System
    const nextSlotEl = document.getElementById("dashStatNextSlot");
    const nextDayEl  = document.getElementById("dashStatNextDay");

    if(nextSlotEl){
        const nextMoment = getNextPostingMoment();
        if(nextMoment){
            nextSlotEl.textContent = nextMoment.date.toLocaleTimeString("de-DE", {
                hour: "2-digit", minute: "2-digit"
            });
            if(nextDayEl){
                const days = ["So","Mo","Di","Mi","Do","Fr","Sa"];
                nextDayEl.textContent = days[nextMoment.date.getDay()];
            }
        }
        else{
            nextSlotEl.textContent = "–";
        }
    }

}

/* ----------------------------------------------------------
   Bester Tag (Kurzversion für Kennzahl-Karte)
---------------------------------------------------------- */

function renderDashboardBestDay(){

    const valueEl = document.getElementById("dashStatBestDay");
    const subEl   = document.getElementById("dashStatBestDayImpr");

    if(!valueEl){ return; }

    const dailyRaw = localStorage.getItem("missionAnalyticsDaily");
    if(!dailyRaw){
        valueEl.textContent = "–";
        return;
    }

    try{
        const daily = JSON.parse(dailyRaw);
        const dayNames = ["So","Mo","Di","Mi","Do","Fr","Sa"];
        const byDay = [0,1,2,3,4,5,6].map(d => {
            const posts = daily.filter(p => new Date(p.date).getDay() === d);
            const avg = posts.length > 0
                ? posts.reduce((s,p) => s + (p.impressions || 0), 0) / posts.length
                : 0;
            return { day: dayNames[d], avg };
        });
        const best = byDay.reduce((b, d) => d.avg > b.avg ? d : b, { day:"–", avg:0 });
        valueEl.textContent = best.day;
        if(subEl){ subEl.textContent = "Ø " + Math.round(best.avg).toLocaleString("de-DE") + " Impr"; }
    }
    catch(e){
        valueEl.textContent = "–";
    }

}

/* ----------------------------------------------------------
   Evergreen-Top-3: Posts mit höchster Save-Rate,
   die mindestens 200 Tage nicht gepostet wurden.
   Durchblättern mit Prev/Next-Buttons.
---------------------------------------------------------- */

function renderDashboardEvergreen(){

    const container = document.getElementById("dashboardEvergreen");
    if(!container){ return; }

    const DAYS_MIN = 200;
    const now = Date.now();
    const minAge = DAYS_MIN * 24 * 60 * 60 * 1000;

    // CSV-Posts laden (für Save-Rate)
    let csvPosts = [];
    try{
        const raw = localStorage.getItem("missionAnalyticsCsv");
        csvPosts = raw ? JSON.parse(raw) : [];
    }
    catch(e){ csvPosts = []; }

    // Archiv laden (um zu prüfen, wann ein Post zuletzt gepostet wurde)
    let archive = [];
    try{
        const raw = localStorage.getItem("missionArchive");
        archive = raw ? JSON.parse(raw) : [];
    }
    catch(e){ archive = []; }

    // Welche Posts wurden wann zuletzt gepostet?
    // Key: normalisierter Text (erste 30 Zeichen)
    function normKey(text){
        return (text || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 30);
    }

    const lastPosted = new Map();
    archive.forEach(post => {
        const key = normKey(post.text);
        const ts = new Date(post.archivedAt || post.createdAt).getTime();
        if(!lastPosted.has(key) || lastPosted.get(key) < ts){
            lastPosted.set(key, ts);
        }
    });

    // CSV-Posts mit Save-Rate berechnen, nur Content-Posts
    const content = csvPosts.filter(p =>
        !(p.text || "").trim().startsWith("@") && p.impressions >= 200
    );

    if(content.length === 0){
        container.innerHTML = '<p class="planner-empty">Noch keine CSV importiert – Analytics aufrufen.</p>';
        return;
    }

    const withRate = content.map(p => ({
        post: p,
        saveRate: (p.bookmarks || 0) / p.impressions * 1000,
        lastTs: lastPosted.get(normKey(p.text)) || 0
    }));

    // Nur Posts, die mindestens 200 Tage nicht gepostet wurden
    const eligible = withRate
        .filter(item => (now - item.lastTs) >= minAge)
        .sort((a, b) => b.saveRate - a.saveRate)
        .slice(0, 3);

    if(eligible.length === 0){
        container.innerHTML = '<p class="planner-empty">Alle Top-Evergreen-Posts wurden in den letzten 200 Tagen gepostet – schau in 200+ Tagen nochmal rein.</p>';
        return;
    }

    // Durchblättern-Zustand
    let currentIdx = 0;

    function renderCard(){

        const item = eligible[currentIdx];
        const post = item.post;
        const shortText = (post.text || "").slice(0, 100) + ((post.text || "").length > 100 ? "…" : "");
        const daysSince = item.lastTs > 0
            ? Math.floor((now - item.lastTs) / (24 * 60 * 60 * 1000))
            : null;

        container.innerHTML =
            '<div class="evergreen-card">' +
                '<div class="evergreen-card-header">' +
                    '<span class="evergreen-badge">💾 ' + item.saveRate.toFixed(1) + ' Saves/1k</span>' +
                    (daysSince !== null
                        ? '<span class="evergreen-age">zuletzt vor ' + daysSince + ' Tagen</span>'
                        : '<span class="evergreen-age">noch nie wiederholt</span>') +
                '</div>' +
                '<p class="evergreen-text">' + escapeHtmlDashboard(shortText) + '</p>' +
                '<div class="evergreen-nav">' +
                    '<button class="evergreen-nav-btn" id="evPrev" ' + (currentIdx === 0 ? 'disabled' : '') + '>← Zurück</button>' +
                    '<span class="evergreen-counter">' + (currentIdx + 1) + ' / ' + eligible.length + '</span>' +
                    '<button class="evergreen-nav-btn" id="evNext" ' + (currentIdx === eligible.length - 1 ? 'disabled' : '') + '>Weiter →</button>' +
                '</div>' +
            '</div>';

        const prevBtn = document.getElementById("evPrev");
        const nextBtn = document.getElementById("evNext");

        if(prevBtn){
            prevBtn.addEventListener("click", () => {
                if(currentIdx > 0){ currentIdx--; renderCard(); }
            });
        }
        if(nextBtn){
            nextBtn.addEventListener("click", () => {
                if(currentIdx < eligible.length - 1){ currentIdx++; renderCard(); }
            });
        }

    }

    renderCard();

}

function renderBestDayInsight(){

    const el = document.getElementById("bestDayInsight");

    if(!el){
        return;
    }

    if(typeof window.loadStoredCsvPosts !== "function"){
        return;
    }

    const posts = window.loadStoredCsvPosts();

    const contentPosts = posts.filter(p => !(p.text || "").trim().startsWith("@"));

    if(contentPosts.length === 0){

        el.textContent = "Noch keine CSV importiert – Analytics-Seite besuchen.";
        return;

    }

    const byDay = {};

    contentPosts.forEach(post => {

        const d = new Date(post.date);

        if(isNaN(d)){
            return;
        }

        const day = DAY_KEYS[d.getDay()];

        if(!byDay[day]){
            byDay[day] = { count: 0, impressions: 0 };
        }

        byDay[day].count++;
        byDay[day].impressions += post.impressions || 0;

    });

    const dayAverages = Object.entries(byDay).map(([day, stats]) => ({
        day: day,
        avgImpressions: stats.impressions / stats.count
    }));

    if(dayAverages.length === 0){

        el.textContent = "Nicht genug Daten für eine Auswertung.";
        return;

    }

    dayAverages.sort((a, b) => b.avgImpressions - a.avgImpressions);

    const best = dayAverages[0];

    el.textContent = best.day + " (Ø " + Math.round(best.avgImpressions).toLocaleString("de-DE") +
        " Impressions pro Post)";

}

/* ----------------------------------------------------------
   History: Bereits geplante & gepostete (archivierte) Posts
   Neueste zuerst - liest direkt aus dem Planner-Archiv.
---------------------------------------------------------- */

function escapeHtmlDashboard(value){

    const div = document.createElement("div");
    div.textContent = value == null ? "" : String(value);
    return div.innerHTML;

}

/**
 * Formatiert einen ISO-Zeitstempel als "DD.MM.YYYY HH:MM".
 * Gibt null zurück, wenn der Wert fehlt/ungültig ist.
 */
function formatDateTimeDE(isoString){

    if(!isoString){
        return null;
    }

    const d = new Date(isoString);

    if(isNaN(d)){
        return null;
    }

    return d.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }) + " " + d.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit"
    });

}

/**
 * Berechnet die Lead Time zwischen zwei Zeitpunkten als
 * "X Tage Y Std Z Min" (nur die relevanten Einheiten).
 */
function computeLeadTime(fromIso, toIso){

    if(!fromIso || !toIso){
        return null;
    }

    const from = new Date(fromIso);
    const to = new Date(toIso);

    if(isNaN(from) || isNaN(to)){
        return null;
    }

    let diffMs = to - from;

    if(diffMs < 0){
        return null;
    }

    const totalMinutes = Math.floor(diffMs / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;

    const parts = [];
    if(days > 0){ parts.push(days + (days === 1 ? " Tag" : " Tage")); }
    if(hours > 0){ parts.push(hours + " Std"); }
    if(minutes > 0 && days === 0){ parts.push(minutes + " Min"); }

    return parts.length > 0 ? parts.join(" ") : "unter 1 Min";

}

function renderDashboardHistory(){

    const container = document.getElementById("dashboardHistory");
    const countEl = document.getElementById("dashboardHistoryCount");

    if(!container){
        return;
    }

    // Archiv aus dem Planner holen (falls geladen), sonst direkt aus localStorage
    let archive = [];

    if(window.planner && Array.isArray(window.planner.archive)){
        archive = window.planner.archive;
    }
    else{
        try{
            const saved = localStorage.getItem("missionArchive");
            archive = saved ? JSON.parse(saved) : [];
        }
        catch(error){
            archive = [];
        }
    }

    if(archive.length === 0){

        container.innerHTML = '<p class="planner-empty">Noch nichts gepostet & archiviert. ' +
            'Sobald du im Creative Studio einen Tweet archivierst, erscheint er hier.</p>';

        if(countEl){
            countEl.textContent = "";
        }

        return;

    }

    // Suchfilter anwenden
    const searchInput = document.getElementById("historySearchInput");
    const query = searchInput ? searchInput.value.trim().toLowerCase() : "";

    let filtered = archive;

    if(query !== ""){
        filtered = archive.filter(post => {
            const haystack = (
                (post.text || "") + " " +
                (post.song || "") + " " +
                (post.category || "")
            ).toLowerCase();
            return haystack.indexOf(query) !== -1;
        });
    }

    // Neueste zuerst (nach archivedAt, Fallback: unverändert)
    const sorted = [...filtered].sort((a, b) => {
        const da = a.archivedAt ? new Date(a.archivedAt) : 0;
        const db = b.archivedAt ? new Date(b.archivedAt) : 0;
        return db - da;
    });

    if(countEl){
        const totalLabel = query !== ""
            ? sorted.length + " von " + archive.length
            : String(sorted.length);
        countEl.textContent = totalLabel + (archive.length === 1 && query === "" ? " Eintrag" : " Einträge");
    }

    container.innerHTML = "";

    if(sorted.length === 0 && query !== ""){
        container.innerHTML = '<p class="planner-empty">Keine Treffer für "' +
            escapeHtmlDashboard(query) + '".</p>';
        return;
    }

    sorted.forEach(post => {

        const card = document.createElement("div");
        card.className = "planner-card planner-card-archived";

        // Zeitpunkte aufbereiten
        const createdLabel = formatDateTimeDE(post.createdAt);
        const scheduledLabel = formatDateTimeDE(post.scheduledFor);
        const publishedLabel = formatDateTimeDE(post.publishedAt);

        // Lead Time: von Created bis Scheduled (oder bis Published, falls vorhanden)
        const leadTarget = post.scheduledFor || post.publishedAt;
        const leadTime = computeLeadTime(post.createdAt, leadTarget);

        // Zeitleiste zusammenbauen
        const timeline = [];

        if(createdLabel){
            timeline.push('📝 Erstellt: ' + createdLabel);
        }

        if(scheduledLabel){
            timeline.push('🚀 Geplant für: ' + scheduledLabel);
        }

        // Published: aus CSV-Abgleich (später) - solange Platzhalter-Emoji
        if(publishedLabel){
            timeline.push('✅ Veröffentlicht: ' + publishedLabel);
        }
        else{
            timeline.push('⏳ Veröffentlicht: wartet auf CSV-Abgleich 🎈');
        }

        if(leadTime){
            timeline.push('⏱️ Vorlaufzeit: ' + leadTime);
        }

        const timelineBlock = timeline.length > 0
            ? '<div class="history-timeline">' +
                timeline.map(t => '<div class="history-timeline-row">' + escapeHtmlDashboard(t) + '</div>').join("") +
              '</div>'
            : "";

        const songBlock = post.song
            ? '<div class="planner-song">🎵 ' + escapeHtmlDashboard(post.song) + '</div>'
            : "";

        const categoryLabel = post.category ? escapeHtmlDashboard(post.category) : "Post";

        card.innerHTML =
            '<div class="planner-header">' +
                '<span>' + categoryLabel + '</span>' +
                '<span class="planner-ampel">' +
                    '<span class="ampel-dot ampel-gruen"></span>Archiviert' +
                '</span>' +
            '</div>' +
            songBlock +
            '<div class="planner-text">' + escapeHtmlDashboard(post.text || "") + '</div>' +
            timelineBlock;

        container.appendChild(card);

    });

}

/* ----------------------------------------------------------
   3-Tages-Content-Rhythmus (Merkhilfe-Checkliste)

   Ziel-Mischung pro 3-Tage-Block: 3 Videos, 1 TV-Serie/LP,
   1 Quiz ODER "Heute vor 40 Jahren". Abhaken wird gespeichert.
---------------------------------------------------------- */

const RHYTHM_STORAGE_KEY = "missionRhythmChecks";

const RHYTHM_ITEMS = [
    { id: "video1", label: "🎵 Musikvideo 1" },
    { id: "video2", label: "🎵 Musikvideo 2" },
    { id: "video3", label: "🎵 Musikvideo 3" },
    { id: "tvlp", label: "📺 TV-Serie / 💿 LP" },
    { id: "quiz_or_onthisday", label: "❓ Quiz oder 📼 Heute vor 40 Jahren" }
];

function loadRhythmChecks(){

    const saved = localStorage.getItem(RHYTHM_STORAGE_KEY);

    if(!saved){
        return {};
    }

    try{
        const parsed = JSON.parse(saved);
        return (parsed && typeof parsed === "object") ? parsed : {};
    }
    catch(error){
        return {};
    }

}

function saveRhythmChecks(checks){

    localStorage.setItem(RHYTHM_STORAGE_KEY, JSON.stringify(checks));

}

function renderRhythmChecklist(){

    const container = document.getElementById("rhythmChecklist");

    if(!container){
        return;
    }

    const checks = loadRhythmChecks();

    container.innerHTML = "";

    RHYTHM_ITEMS.forEach(item => {

        const done = checks[item.id] === true;

        const row = document.createElement("label");
        row.className = "rhythm-item" + (done ? " rhythm-item-done" : "");

        row.innerHTML =
            '<input type="checkbox" data-rhythm="' + item.id + '"' + (done ? " checked" : "") + ">" +
            '<span>' + item.label + '</span>';

        container.appendChild(row);

    });

    // Fortschritt anzeigen
    const total = RHYTHM_ITEMS.length;
    const doneCount = RHYTHM_ITEMS.filter(i => checks[i.id] === true).length;

    const progress = document.createElement("div");
    progress.className = "rhythm-progress";
    progress.textContent = doneCount + " von " + total + " erledigt" +
        (doneCount === total ? " – Block komplett! 🎉" : "");
    container.appendChild(progress);

    // Checkbox-Handler
    container.querySelectorAll('input[data-rhythm]').forEach(cb => {

        cb.addEventListener("change", () => {

            const current = loadRhythmChecks();
            current[cb.dataset.rhythm] = cb.checked;
            saveRhythmChecks(current);
            renderRhythmChecklist();

        });

    });

}

function resetRhythmChecks(){

    saveRhythmChecks({});
    renderRhythmChecklist();

}

/* ----------------------------------------------------------
   Reply-Anteil (7 Tage)

   Warnt, wenn zu viele Posts eigentlich Antworten auf andere
   Accounts sind (Text beginnt mit "@"). Diese bringen kaum
   Reichweite und drücken den Ø-Wert / die Engagement-Rate.
   Schwellen: < 20% grün, 20-35% gelb, > 35% rot.
---------------------------------------------------------- */

function renderReplyQuota(){

    const valueEl = document.getElementById("dashStatReplyQuota");
    const subEl = document.getElementById("dashStatReplyQuotaSub");
    const cardEl = document.getElementById("dashStatReplyCard");

    if(!valueEl){
        return;
    }

    const posts = (typeof window.loadStoredCsvPosts === "function")
        ? window.loadStoredCsvPosts()
        : [];

    if(!posts || posts.length === 0){
        valueEl.textContent = "–";
        if(subEl){
            subEl.textContent = "CSV importieren für Daten";
        }
        return;
    }

    // Letzte 7 Tage anhand des CSV-Datumsfelds ("Wed, Jul 29, 2026")
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recent = posts.filter(post => {
        const d = new Date(post.date);
        return !isNaN(d) && d >= sevenDaysAgo && d <= now;
    });

    if(recent.length === 0){
        valueEl.textContent = "–";
        if(subEl){
            subEl.textContent = "Keine Posts in den letzten 7 Tagen";
        }
        return;
    }

    const replyCount = recent.filter(p =>
        (p.text || "").trim().startsWith("@")
    ).length;

    const quota = Math.round((replyCount / recent.length) * 100);

    valueEl.textContent = quota + "%";

    if(subEl){
        subEl.textContent = replyCount + " von " + recent.length + " Posts sind Replies";
    }

    if(cardEl){

        cardEl.classList.remove("dashboard-stat-card-ok", "dashboard-stat-card-warn", "dashboard-stat-card-bad");

        if(quota < 20){
            cardEl.classList.add("dashboard-stat-card-ok");
        }
        else if(quota <= 35){
            cardEl.classList.add("dashboard-stat-card-warn");
        }
        else{
            cardEl.classList.add("dashboard-stat-card-bad");
        }

    }

}

window.renderReplyQuota = renderReplyQuota;

/* ----------------------------------------------------------
   Settings: Felder befüllen / speichern
---------------------------------------------------------- */

function fillSettingsFields(){

    const data = loadPostingTimesByDay();

    Object.entries(FIELD_IDS).forEach(([dayKey, fieldId]) => {

        const field = document.getElementById(fieldId);

        if(field){
            field.value = Array.isArray(data[dayKey]) ? data[dayKey].join(", ") : "";
        }

    });

}

function saveSettingsFields(){

    const result = {};

    Object.entries(FIELD_IDS).forEach(([dayKey, fieldId]) => {

        const field = document.getElementById(fieldId);

        result[dayKey] = field ? parseTimesInput(field.value) : [];

    });

    savePostingTimesByDay(result);

    return result;

}

/* ----------------------------------------------------------
   Dashboard: kompakte Wochentags-Performance-Übersicht
   (dieselbe Berechnung wie renderPostingTimePerformanceHints,
   aber als eigenständige Kachel oben im Dashboard sichtbar)
---------------------------------------------------------- */

function renderDashboardWeekdayPerformance(){

    const container = document.getElementById("dashboardWeekdayPerformance");
    if(!container){ return; }

    let csvPosts = [];
    try{
        const raw = localStorage.getItem("missionAnalyticsCsv");
        csvPosts = raw ? JSON.parse(raw) : [];
    }
    catch(e){ csvPosts = []; }

    const content = csvPosts.filter(p => !(p.text || "").trim().startsWith("@"));

    if(content.length === 0){
        container.innerHTML = '<p class="planner-empty">Noch keine CSV importiert – Analytics-Seite besuchen.</p>';
        return;
    }

    const dayNames = ["So","Mo","Di","Mi","Do","Fr","Sa"];
    const byDay = {};
    for(let d = 0; d <= 6; d++){
        byDay[d] = { impressions: 0, likes: 0, count: 0 };
    }

    content.forEach(post => {
        const d = new Date(post.date).getDay();
        if(isNaN(d)){ return; }
        byDay[d].impressions += post.impressions || 0;
        byDay[d].likes += post.likes || 0;
        byDay[d].count += 1;
    });

    let bestDay = null;
    let bestAvg = -1;

    Object.keys(byDay).forEach(d => {
        const day = byDay[d];
        if(day.count > 0){
            const avgImpr = day.impressions / day.count;
            if(avgImpr > bestAvg){
                bestAvg = avgImpr;
                bestDay = d;
            }
        }
    });

    // Anzeige-Reihenfolge Mo-So
    const order = [1,2,3,4,5,6,0];

    container.innerHTML = order.map(d => {

        const day = byDay[d];
        const isBest = String(d) === String(bestDay);

        if(!day || day.count === 0){
            return '<div class="weekday-perf-item">' +
                '<span class="weekday-perf-label">' + dayNames[d] + '</span>' +
                '<span class="weekday-perf-value weekday-perf-empty">–</span>' +
                '</div>';
        }

        const avgImpr = Math.round(day.impressions / day.count);

        return '<div class="weekday-perf-item' + (isBest ? ' weekday-perf-item-best' : '') + '">' +
            '<span class="weekday-perf-label">' + (isBest ? "🔥 " : "") + dayNames[d] + '</span>' +
            '<span class="weekday-perf-value">' + avgImpr.toLocaleString("de-DE") + '</span>' +
            '<span class="weekday-perf-sub">Ø Impressions · ' + day.count + ' Posts</span>' +
            '</div>';

    }).join("");

}

window.renderDashboardWeekdayPerformance = renderDashboardWeekdayPerformance;

/* ----------------------------------------------------------
   Settings: Ø Likes & Reichweite pro Wochentag anzeigen

   Reiner Info-Hinweis unter jedem Zeit-Feld, berechnet aus den
   importierten CSV-Daten (nur Original-Posts, keine Replies).
   Ersetzt NICHT die manuelle Uhrzeit-Eingabe, da X keine
   Uhrzeit pro Post exportiert - nur der Wochentag ist auswertbar.
---------------------------------------------------------- */

function renderPostingTimePerformanceHints(){

    const dayFieldMap = {
        1: "postingTimeMo",
        2: "postingTimeDi",
        3: "postingTimeMi",
        4: "postingTimeDo",
        5: "postingTimeFr",
        6: "postingTimeSa",
        0: "postingTimeSo"
    };

    let csvPosts = [];
    try{
        const raw = localStorage.getItem("missionAnalyticsCsv");
        csvPosts = raw ? JSON.parse(raw) : [];
    }
    catch(e){ csvPosts = []; }

    const content = csvPosts.filter(p => !(p.text || "").trim().startsWith("@"));

    if(content.length === 0){
        return;
    }

    const byDay = {};
    for(let d = 0; d <= 6; d++){
        byDay[d] = { impressions: 0, likes: 0, count: 0 };
    }

    content.forEach(post => {
        const d = new Date(post.date).getDay();
        if(isNaN(d)){ return; }
        byDay[d].impressions += post.impressions || 0;
        byDay[d].likes += post.likes || 0;
        byDay[d].count += 1;
    });

    let bestDay = null;
    let bestAvg = -1;

    Object.keys(byDay).forEach(d => {
        const day = byDay[d];
        if(day.count > 0){
            const avgImpr = day.impressions / day.count;
            if(avgImpr > bestAvg){
                bestAvg = avgImpr;
                bestDay = d;
            }
        }
    });

    Object.keys(dayFieldMap).forEach(d => {

        const hintEl = document.getElementById(dayFieldMap[d] + "Hint");
        if(!hintEl){ return; }

        const day = byDay[d];

        if(!day || day.count === 0){
            hintEl.textContent = "Noch keine Daten für diesen Tag";
            return;
        }

        const avgImpr = Math.round(day.impressions / day.count);
        const isBest = String(d) === String(bestDay);

        hintEl.textContent = (isBest ? "🔥 " : "") +
            "Ø " + avgImpr.toLocaleString("de-DE") + " Impressions (" + day.count + " Posts)";

        hintEl.classList.toggle("posting-time-hint-best", isBest);

    });

}

window.renderPostingTimePerformanceHints = renderPostingTimePerformanceHints;

document.addEventListener("DOMContentLoaded", () => {

    startCountdown();
    renderBestDayInsight();
    renderDashboardStats();
    renderDashboardBestDay();
    renderDashboardEvergreen();
    renderDashboardHistory();
    renderReplyQuota();
    renderPostingTimePerformanceHints();
    renderDashboardWeekdayPerformance();
    fillSettingsFields();

    const historySearch = document.getElementById("historySearchInput");
    if(historySearch){
        historySearch.addEventListener("input", renderDashboardHistory);
    }

    const saveTimesButton = document.getElementById("settingsSaveTimesButton");
    const timesStatus = document.getElementById("settingsTimesStatus");

    if(saveTimesButton){

        saveTimesButton.addEventListener("click", () => {

            const saved = saveSettingsFields();

            const summary = Object.entries(saved)
                .filter(([, times]) => times.length > 0)
                .map(([day, times]) => day + ": " + times.join("/"))
                .join(", ");

            if(timesStatus){
                timesStatus.textContent = summary
                    ? "Gespeichert - " + summary
                    : "Gespeichert (nur Standard-Zeiten aktiv).";
            }

            updateCountdownDisplay();

        });

    }

    const slotDoneButton = document.getElementById("slotDoneButton");
    const slotDoneHint = document.getElementById("slotDoneHint");

    if(slotDoneButton){

        slotDoneButton.addEventListener("click", () => {

            const current = getNextPostingMoment();

            if(!current){

                if(slotDoneHint){
                    slotDoneHint.textContent = "Kein aktiver Slot zum Abhaken.";
                }

                return;

            }

            markSlotDone(current.date, current.timeStr);

            if(slotDoneHint){
                slotDoneHint.textContent = "Slot " + current.timeStr + " (" + current.dayKey +
                    ") abgehakt - Timer springt zum nächsten.";
            }

            updateCountdownDisplay();
            renderDashboardStats();

        });

    }

});

// Global verfügbar machen, damit der Planner die History nach dem
// Archivieren aktualisieren kann.
window.renderDashboardHistory = renderDashboardHistory;
