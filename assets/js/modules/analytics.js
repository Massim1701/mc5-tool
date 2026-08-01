/*
====================================================

 We ❤️ 80s Mission Control 5.1

 ANALYTICS MODULE

 Auswertung der Planner-Daten

====================================================
*/

function computeAnalytics(posts){

    const total = posts.length;

    const byStatus = {};
    const byCategory = {};

    posts.forEach(post => {

        const status = post.status || "Unbekannt";
        const category = post.category || "Unbekannt";

        byStatus[status] = (byStatus[status] || 0) + 1;
        byCategory[category] = (byCategory[category] || 0) + 1;

    });

    const neu = byStatus["Neu"] || 0;
    const inBearbeitung = byStatus["In Bearbeitung"] || 0;
    const fertig = byStatus["Fertig"] || 0;

    return {
        total: total,
        neu: neu,
        inBearbeitung: inBearbeitung,
        fertig: fertig,
        byStatus: byStatus,
        byCategory: byCategory
    };

}

function renderAnalyticsOverview(stats){

    const container = document.getElementById("analyticsOverview");

    if(!container){
        return;
    }

    container.innerHTML = `
        <div class="card">
            <h4>Gesamt Posts</h4>
            <p>${stats.total}</p>
        </div>
        <div class="card">
            <h4>🟡 Neu</h4>
            <p>${stats.neu}</p>
        </div>
        <div class="card">
            <h4>🔵 In Bearbeitung</h4>
            <p>${stats.inBearbeitung}</p>
        </div>
        <div class="card">
            <h4>🟢 Fertig</h4>
            <p>${stats.fertig}</p>
        </div>
    `;

}

function renderBreakdown(containerId, data, total){

    const container = document.getElementById(containerId);

    if(!container){
        return;
    }

    const entries = Object.entries(data);

    if(entries.length === 0){

        container.innerHTML = '<p class="planner-empty">Noch keine Daten vorhanden.</p>';
        return;

    }

    container.innerHTML = "";

    entries

        .sort((a, b) => b[1] - a[1])

        .forEach(([label, count]) => {

            const percent = total > 0 ? Math.round((count / total) * 100) : 0;

            const row = document.createElement("div");
            row.className = "analytics-row";

            const safeLabel = document.createElement("div");
            safeLabel.textContent = label;
            safeLabel.className = "analytics-row-label";

            row.innerHTML = `
                <div class="analytics-row-label"></div>
                <div class="analytics-row-bar">
                    <div class="analytics-row-fill" style="width:${percent}%;"></div>
                </div>
                <div class="analytics-row-count">${count} (${percent}%)</div>
            `;

            row.querySelector(".analytics-row-label").textContent = label;

            container.appendChild(row);

        });

}

function renderAnalytics(){

    const posts = (window.planner && window.planner.posts) ? window.planner.posts : [];

    const stats = computeAnalytics(posts);

    renderAnalyticsOverview(stats);
    renderBreakdown("analyticsStatusBreakdown", stats.byStatus, stats.total);
    renderBreakdown("analyticsCategoryBreakdown", stats.byCategory, stats.total);

}

window.renderAnalytics = renderAnalytics;

/* ==========================================================
   CSV IMPORT (X / Twitter Analytics Export)

   Die Spaltenreihenfolge im X-Export ist immer gleich,
   auch wenn sich die Spaltenüberschriften je nach
   Kontosprache unterscheiden. Deshalb wird hier über die
   feste Position (Index) gelesen, nicht über den Namen.

   0  Post-ID
   1  Datum
   2  Post-Text
   3  Post-Link
   4  Impressions
   5  Gefällt mir
   6  Interaktionen
   7  Lesezeichen
   8  Mal geteilt
   9  Neue Follower
   10 Antworten
   11 Reposts
   12 Profilbesuche
   13 Detailerweiterungen
   14 URL-Klicks
   15 Hashtag-Klicks
   16 Permalink-Klicks
========================================================== */

const CSV_STORAGE_KEY = "missionAnalyticsCsv";

/* ----------------------------------------------------------
   Robuster CSV-Parser (RFC4180-artig)
   Behandelt Kommas und Zeilenumbrüche innerhalb von
   Anführungszeichen sowie doppelte Anführungszeichen ("")
   als escapte Quotes.
---------------------------------------------------------- */

function parseCSV(text){

    const rows = [];

    let row = [];
    let field = "";
    let insideQuotes = false;

    for(let i = 0; i < text.length; i++){

        const char = text[i];
        const nextChar = text[i + 1];

        if(insideQuotes){

            if(char === '"' && nextChar === '"'){
                field += '"';
                i++;
            }
            else if(char === '"'){
                insideQuotes = false;
            }
            else{
                field += char;
            }

        }
        else{

            if(char === '"'){
                insideQuotes = true;
            }
            else if(char === ','){
                row.push(field);
                field = "";
            }
            else if(char === '\r'){
                // ignorieren, \n übernimmt den Zeilenumbruch
            }
            else if(char === '\n'){
                row.push(field);
                rows.push(row);
                row = [];
                field = "";
            }
            else{
                field += char;
            }

        }

    }

    // letztes Feld / letzte Zeile übernehmen, falls Datei nicht mit \n endet
    if(field.length > 0 || row.length > 0){
        row.push(field);
        rows.push(row);
    }

    return rows.filter(r => r.length > 1 || (r.length === 1 && r[0] !== ""));

}

function toNumber(value){

    const n = parseInt(String(value).replace(/[^\d-]/g, ""), 10);

    return isNaN(n) ? 0 : n;

}

function parseXAnalyticsCsv(text){

    const rows = parseCSV(text);

    if(rows.length < 2){
        return [];
    }

    // erste Zeile ist immer der Header, unabhängig von der Sprache
    const dataRows = rows.slice(1);

    return dataRows

        .filter(cols => cols.length >= 17 && cols[0])

        .map(cols => ({

            id: cols[0],
            date: cols[1],
            text: cols[2],
            link: cols[3],
            impressions: toNumber(cols[4]),
            likes: toNumber(cols[5]),
            interactions: toNumber(cols[6]),
            bookmarks: toNumber(cols[7]),
            shares: toNumber(cols[8]),
            newFollowers: toNumber(cols[9]),
            replies: toNumber(cols[10]),
            reposts: toNumber(cols[11]),
            profileVisits: toNumber(cols[12]),
            detailExpands: toNumber(cols[13]),
            urlClicks: toNumber(cols[14]),
            hashtagClicks: toNumber(cols[15]),
            permalinkClicks: toNumber(cols[16])

        }));

}

/* ----------------------------------------------------------
   Speichern / Laden (mit Dedupe über Post-ID)
---------------------------------------------------------- */

function loadStoredCsvPosts(){

    const saved = localStorage.getItem(CSV_STORAGE_KEY);

    if(!saved){
        return [];
    }

    try{
        return JSON.parse(saved);
    }
    catch(error){
        console.warn("CSV-Speicher konnte nicht gelesen werden:", error);
        return [];
    }

}

window.loadStoredCsvPosts = loadStoredCsvPosts;

function saveCsvPosts(posts){

    localStorage.setItem(CSV_STORAGE_KEY, JSON.stringify(posts));

}

/* ----------------------------------------------------------
   Published-Abgleich: gleicht archivierte Posts mit den
   CSV-Daten ab. Wenn ein archivierter Tweet-Text in der CSV
   auftaucht, wird sein publishedAt-Datum aus der CSV gesetzt.
   Matching über normalisierte erste Textzeile (robust gegen
   Unicode-Fettschrift und Emojis).
---------------------------------------------------------- */

function normalizeForMatch(text){

    if(!text){
        return "";
    }

    // Nur erste Zeile (Titel - Künstler), Unicode-Fett auf normal,
    // Kleinschreibung, nur Buchstaben/Zahlen behalten
    let firstLine = String(text).split("\n")[0];

    // Unicode-Fettschrift zurück auf ASCII mappen
    let normalized = "";
    for(const char of firstLine){
        const code = char.codePointAt(0);
        if(code >= 0x1D5D4 && code <= 0x1D5ED){
            normalized += String.fromCharCode(0x41 + (code - 0x1D5D4)); // A-Z
        }
        else if(code >= 0x1D5EE && code <= 0x1D607){
            normalized += String.fromCharCode(0x61 + (code - 0x1D5EE)); // a-z
        }
        else if(code >= 0x1D7EC && code <= 0x1D7F5){
            normalized += String.fromCharCode(0x30 + (code - 0x1D7EC)); // 0-9
        }
        else{
            normalized += char;
        }
    }

    return normalized
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

}

function matchPublishedDates(csvPosts){

    let archive = [];

    try{
        const saved = localStorage.getItem("missionArchive");
        archive = saved ? JSON.parse(saved) : [];
    }
    catch(error){
        return 0;
    }

    if(archive.length === 0){
        return 0;
    }

    // CSV-Posts normalisieren (Liste von {key, date})
    const csvKeys = csvPosts
        .map(cp => ({ key: normalizeForMatch(cp.text), date: cp.date }))
        .filter(item => item.key && item.key.length >= 8);

    let matchCount = 0;

    archive.forEach(post => {

        // Schon gematcht? überspringen
        if(post.publishedAt){
            return;
        }

        const postKey = normalizeForMatch(post.text);

        if(!postKey || postKey.length < 8){
            return;
        }

        // Match, wenn einer der Keys mit dem anderen beginnt
        // (robust gegen URLs/Hashtags, die nur bei einem dranhängen)
        const found = csvKeys.find(item =>
            item.key.startsWith(postKey) || postKey.startsWith(item.key)
        );

        if(found){

            const parsedDate = new Date(found.date);

            if(!isNaN(parsedDate)){
                post.publishedAt = parsedDate.toISOString();
                matchCount++;
            }

        }

    });

    if(matchCount > 0){
        localStorage.setItem("missionArchive", JSON.stringify(archive));

        if(window.planner){
            window.planner.archive = archive;
        }

        if(typeof window.renderDashboardHistory === "function"){
            window.renderDashboardHistory();
        }
    }

    return matchCount;

}

function mergeCsvPosts(existingPosts, newPosts){

    const map = new Map();

    existingPosts.forEach(post => map.set(post.id, post));

    // neue Daten überschreiben ggf. ältere Werte zum gleichen Post
    newPosts.forEach(post => map.set(post.id, post));

    return Array.from(map.values());

}

/* ----------------------------------------------------------
   Import-Ablauf
---------------------------------------------------------- */

/* ----------------------------------------------------------
   Dateinamen-Auswertung

   Erwartet ein Datum am Ende des Dateinamens, optional
   gefolgt von einem Zähler, z.B.:
     account_analytics_content_2026-04-28_2026-07-26.csv
     account_analytics_content_2026-04-28_2026-07-26-2.csv

   Das LETZTE Datum im Namen gilt als der Tag, zu dem der
   Import gehört. Ein angehängter Zähler (z.B. "-2") markiert
   einen wiederholten Import am selben Tag; die höchste Zahl
   gilt als der aktuellste Stand.
---------------------------------------------------------- */

function parseFilenameMeta(fileName){

    const match = fileName.match(/(\d{4}-\d{2}-\d{2})(?:-(\d+))?\.csv$/i);

    if(match){

        return {
            date: match[1],
            counter: match[2] ? parseInt(match[2], 10) : 1
        };

    }

    // Fallback: irgendein Datum im Namen suchen (letztes Vorkommen)
    const allDates = fileName.match(/\d{4}-\d{2}-\d{2}/g);

    if(allDates && allDates.length > 0){

        return {
            date: allDates[allDates.length - 1],
            counter: 1
        };

    }

    return { date: null, counter: 1 };

}

/* ----------------------------------------------------------
   Tages-Snapshots (für Jahresverlauf / Charts)
---------------------------------------------------------- */

const DAILY_STORAGE_KEY = "missionAnalyticsDaily";

/* ----------------------------------------------------------
   ACCOUNT-STAND (manuell gepflegt)

   Die absolute Follower- und Post-Gesamtzahl steht nicht in
   der X-CSV (dort gibt es nur "Neue Follower" pro Post als
   Delta). Diese Zahlen liest man direkt vom Profil ab und
   trägt sie hier manuell ein - einmal pro Tag reicht.
---------------------------------------------------------- */

const ACCOUNT_STORAGE_KEY = "missionAccountSnapshots";

function loadAccountSnapshots(){

    const saved = localStorage.getItem(ACCOUNT_STORAGE_KEY);

    if(!saved){
        return {};
    }

    try{
        return JSON.parse(saved);
    }
    catch(error){
        console.warn("Account-Snapshots konnten nicht gelesen werden:", error);
        return {};
    }

}

function saveAccountSnapshots(snapshots){

    localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(snapshots));

}

function updateAccountSnapshot(date, followers, posts){

    const snapshots = loadAccountSnapshots();

    snapshots[date] = {
        followers: followers,
        posts: posts,
        updatedAt: new Date().toISOString()
    };

    const trimmed = enforceMaxDays(snapshots);

    saveAccountSnapshots(trimmed);

}

function renderAccountStandCards(){

    const container = document.getElementById("accountStandCards");

    if(!container){
        return;
    }

    const snapshots = loadAccountSnapshots();
    const dates = Object.keys(snapshots).sort();

    if(dates.length === 0){

        container.innerHTML = '<p class="planner-empty">Noch kein Account-Stand erfasst. Klicke auf "Aktualisieren" und trage die Zahlen von deinem Profil ein.</p>';
        return;

    }

    const latestDate = dates[dates.length - 1];
    const latest = snapshots[latestDate];

    let followerChange = "";

    if(dates.length >= 2){

        const previous = snapshots[dates[dates.length - 2]];
        const diff = latest.followers - previous.followers;

        followerChange = diff === 0
            ? " (± 0 seit " + dates[dates.length - 2] + ")"
            : (diff > 0 ? " (+" : " (") + diff + " seit " + dates[dates.length - 2] + ")";

    }

    container.innerHTML = `
        <div class="card">
            <h4>Follower gesamt</h4>
            <p>${latest.followers.toLocaleString("de-DE")}${followerChange}</p>
        </div>
        <div class="card">
            <h4>Posts gesamt</h4>
            <p>${latest.posts.toLocaleString("de-DE")}</p>
        </div>
        <div class="card">
            <h4>Stand vom</h4>
            <p>${latestDate}</p>
        </div>
    `;

}

function renderFollowerTotalChart(){

    const container = document.getElementById("accountFollowerTotalChart");

    if(!container){
        return;
    }

    const snapshots = loadAccountSnapshots();
    const dates = Object.keys(snapshots).sort();

    if(dates.length === 0){

        container.innerHTML = '<p class="planner-empty">Noch keine Daten vorhanden.</p>';
        return;

    }

    const values = dates.map(date => snapshots[date].followers);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = Math.max(1, maxValue - minValue);
    const trackHeight = 128; // Platz für Label oberhalb der Balken lassen

    container.innerHTML = "";

    dates.forEach(date => {

        const value = snapshots[date].followers;

        const percentHeight = Math.max(3, Math.round(((value - minValue) / range) * 100));

        const wrap = document.createElement("div");
        wrap.className = "analytics-bar-item";

        const label = document.createElement("span");
        label.className = "analytics-bar-label";
        label.textContent = value.toLocaleString("de-DE");

        const bar = document.createElement("div");
        bar.className = "analytics-bar analytics-bar-account";
        bar.style.height = Math.round((percentHeight / 100) * trackHeight) + "px";
        bar.title = date + ": " + value.toLocaleString("de-DE") + " Follower";

        wrap.appendChild(label);
        wrap.appendChild(bar);
        container.appendChild(wrap);

    });

}

function initAccountStandButton(){

    const button = document.getElementById("updateAccountStandButton");

    if(!button){
        return;
    }

    button.addEventListener("click", () => {

        const snapshots = loadAccountSnapshots();
        const dates = Object.keys(snapshots).sort();

        const lastEntry = dates.length > 0 ? snapshots[dates[dates.length - 1]] : null;

        const defaultFollowers = lastEntry ? String(lastEntry.followers) : "";
        const defaultPosts = lastEntry ? String(lastEntry.posts) : "";

        const followersInput = window.prompt(
            "Aktuelle Follower-Gesamtzahl (vom Profil ablesen):",
            defaultFollowers
        );

        if(followersInput === null){
            return;
        }

        const postsInput = window.prompt(
            "Aktuelle Post-Gesamtzahl (vom Profil ablesen):",
            defaultPosts
        );

        if(postsInput === null){
            return;
        }

        const followers = parseInt(followersInput.replace(/[^\d]/g, ""), 10);
        const posts = parseInt(postsInput.replace(/[^\d]/g, ""), 10);

        if(isNaN(followers) || isNaN(posts)){

            window.alert("Bitte gültige Zahlen eingeben.");
            return;

        }

        const today = new Date().toISOString().slice(0, 10);

        updateAccountSnapshot(today, followers, posts);

        renderAccountStandCards();
        renderFollowerTotalChart();

    });

}
const MAX_DAYS = 365;

function computeFileTotals(posts){

    return posts.reduce((sum, post) => {

        sum.impressions += post.impressions;
        sum.likes += post.likes;
        sum.interactions += post.interactions;
        sum.newFollowers += post.newFollowers;
        sum.bookmarks += post.bookmarks;
        sum.shares += post.shares;
        sum.replies += post.replies;
        sum.reposts += post.reposts;
        sum.profileVisits += post.profileVisits;

        return sum;

    }, {
        impressions: 0,
        likes: 0,
        interactions: 0,
        newFollowers: 0,
        bookmarks: 0,
        shares: 0,
        replies: 0,
        reposts: 0,
        profileVisits: 0,
        postCount: posts.length
    });

}

function loadDailySnapshots(){

    const saved = localStorage.getItem(DAILY_STORAGE_KEY);

    if(!saved){
        return {};
    }

    try{
        return JSON.parse(saved);
    }
    catch(error){
        console.warn("Tages-Snapshots konnten nicht gelesen werden:", error);
        return {};
    }

}

function saveDailySnapshots(snapshots){

    localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(snapshots));

}

function enforceMaxDays(snapshots){

    const dates = Object.keys(snapshots).sort();

    if(dates.length <= MAX_DAYS){
        return snapshots;
    }

    const toRemove = dates.slice(0, dates.length - MAX_DAYS);

    toRemove.forEach(date => {
        delete snapshots[date];
    });

    return snapshots;

}

/**
 * Speichert einen Tages-Snapshot. Gibt true zurück, wenn der
 * Snapshot tatsächlich (neu) übernommen wurde, false wenn ein
 * aktuellerer Import für den Tag bereits vorlag.
 */
function updateDailySnapshot(date, counter, totals, fileName){

    const snapshots = loadDailySnapshots();

    const existing = snapshots[date];

    if(existing && existing.counter > counter){
        return false;
    }

    snapshots[date] = {
        counter: counter,
        totals: totals,
        fileName: fileName,
        importedAt: new Date().toISOString()
    };

    const trimmed = enforceMaxDays(snapshots);

    saveDailySnapshots(trimmed);

    return true;

}

/* ----------------------------------------------------------
   Chart: Follower-Entwicklung (Personen, pro Tag)
---------------------------------------------------------- */

function renderFollowerChart(){

    const container = document.getElementById("csvFollowerChart");

    if(!container){
        return;
    }

    const snapshots = loadDailySnapshots();
    const dates = Object.keys(snapshots).sort();

    if(dates.length < 2){

        container.innerHTML = '<p class="planner-empty">Mindestens 2 Tages-Snapshots nötig, um den täglichen Zuwachs zu berechnen. Jede X-Export-Datei enthält die komplette Historie bis zu diesem Tag, daher braucht es einen Vergleichstag.</p>';
        return;

    }

    // Jede Datei enthält die kumulierte Historie bis zu diesem Tag
    // (bei jungen Accounts sogar seit Account-Gründung). Der echte
    // Tageszuwachs ergibt sich daher aus der Differenz zweier
    // aufeinanderfolgender Tages-Summen, nicht aus dem Rohwert selbst.
    const deltas = [];

    for(let i = 1; i < dates.length; i++){

        const today = snapshots[dates[i]].totals.newFollowers;
        const yesterday = snapshots[dates[i - 1]].totals.newFollowers;
        const value = today - yesterday;

        const percent = yesterday > 0
            ? (value / yesterday) * 100
            : (value === 0 ? 0 : 100);

        deltas.push({
            date: dates[i],
            value: value,
            percent: percent
        });

    }

    const maxValue = Math.max(1, ...deltas.map(d => Math.abs(d.value)));
    const trackHeight = 128; // Platz für Label oberhalb der Balken lassen

    container.innerHTML = "";

    deltas.forEach(delta => {

        const percentHeight = Math.max(3, Math.round((Math.abs(delta.value) / maxValue) * 100));

        const wrap = document.createElement("div");
        wrap.className = "analytics-bar-item";

        const label = document.createElement("span");
        label.className = "analytics-bar-label" + (delta.value < 0 ? " analytics-bar-label-neg" : "");
        label.textContent = (delta.percent >= 0 ? "+" : "") + delta.percent.toFixed(1) + "%";

        const bar = document.createElement("div");
        bar.className = "analytics-bar " +
            (delta.value >= 0 ? "analytics-bar-follower" : "analytics-bar-negative");
        bar.style.height = Math.round((percentHeight / 100) * trackHeight) + "px";
        bar.title = delta.date + ": " + (delta.value >= 0 ? "+" : "") + delta.value + " neue Follower (" + label.textContent + ")";

        wrap.appendChild(label);
        wrap.appendChild(bar);
        container.appendChild(wrap);

    });

}

/* ----------------------------------------------------------
   Chart: Veränderung zum Vortag (%)
---------------------------------------------------------- */

function renderPercentChangeChart(metricKey){

    const container = document.getElementById("csvPercentChart");

    if(!container){
        return;
    }

    const snapshots = loadDailySnapshots();
    const dates = Object.keys(snapshots).sort();

    if(dates.length < 2){

        container.innerHTML = '<p class="planner-empty">Mindestens 2 Tages-Snapshots nötig, um eine Veränderung zu berechnen.</p>';
        return;

    }

    const changes = [];

    for(let i = 1; i < dates.length; i++){

        const today = snapshots[dates[i]].totals[metricKey] || 0;
        const yesterday = snapshots[dates[i - 1]].totals[metricKey] || 0;

        let percent;

        if(yesterday === 0){
            percent = today === 0 ? 0 : 100;
        }
        else{
            percent = ((today - yesterday) / yesterday) * 100;
        }

        changes.push({ date: dates[i], percent: percent });

    }

    const maxAbs = Math.max(1, ...changes.map(c => Math.abs(c.percent)));
    const trackHeight = 128; // Platz für Label oberhalb der Balken lassen

    container.innerHTML = "";

    changes.forEach(change => {

        const percentHeight = Math.max(3, Math.round((Math.abs(change.percent) / maxAbs) * 100));

        const wrap = document.createElement("div");
        wrap.className = "analytics-bar-item";

        const label = document.createElement("span");
        label.className = "analytics-bar-label" + (change.percent < 0 ? " analytics-bar-label-neg" : "");
        label.textContent = (change.percent >= 0 ? "+" : "") + change.percent.toFixed(1) + "%";

        const bar = document.createElement("div");
        bar.className = "analytics-bar " +
            (change.percent >= 0 ? "analytics-bar-positive" : "analytics-bar-negative");
        bar.style.height = Math.round((percentHeight / 100) * trackHeight) + "px";
        bar.title = change.date + ": " + label.textContent;

        wrap.appendChild(label);
        wrap.appendChild(bar);
        container.appendChild(wrap);

    });

}

function renderDaysStoredInfo(){

    const el = document.getElementById("csvDaysStored");

    if(!el){
        return;
    }

    const snapshots = loadDailySnapshots();
    const count = Object.keys(snapshots).length;

    el.textContent = count + " von " + MAX_DAYS + " Tagen gespeichert.";

}

function handleCsvFile(file){

    const statusEl = document.getElementById("csvImportStatus");

    const fileMeta = parseFilenameMeta(file.name);

    const reader = new FileReader();

    reader.onload = () => {

        try{

            const parsed = parseXAnalyticsCsv(reader.result);

            if(parsed.length === 0){

                if(statusEl){
                    statusEl.textContent = "Keine gültigen Zeilen in der CSV gefunden.";
                }

                return;

            }

            // Gesamt-Pool für "Top Posts" (dedupliziert über Post-ID)
            const existing = loadStoredCsvPosts();
            const merged = mergeCsvPosts(existing, parsed);

            saveCsvPosts(merged);

            // Archivierte Posts mit CSV abgleichen -> publishedAt setzen
            const publishedMatches = matchPublishedDates(merged);

            // Tages-Snapshot für Jahresverlauf (Follower- und Prozent-Charts)
            let snapshotInfo = "";

            if(fileMeta.date){

                const totals = computeFileTotals(parsed);

                const wasUpdated = updateDailySnapshot(
                    fileMeta.date,
                    fileMeta.counter,
                    totals,
                    file.name
                );

                snapshotInfo = wasUpdated
                    ? " Tages-Snapshot für " + fileMeta.date + " gespeichert."
                    : " Für " + fileMeta.date + " liegt bereits ein neuerer Import vor, Snapshot nicht überschrieben.";

            }
            else{

                snapshotInfo = " Kein Datum im Dateinamen erkannt, kein Tages-Snapshot gespeichert.";

            }

            if(statusEl){
                statusEl.textContent =
                    parsed.length + " Posts importiert (gesamt gespeichert: " + merged.length + ")." +
                    snapshotInfo +
                    (publishedMatches > 0
                        ? " " + publishedMatches + " Post(s) in der History als veröffentlicht markiert. ✅"
                        : "");
            }

            renderCsvAnalytics();

            // Dashboard-Kachel "Reply-Anteil" ist Teil von dashboard.js -
            // nach frischem CSV-Import neu berechnen, falls vorhanden.
            if(typeof window.renderReplyQuota === "function"){
                window.renderReplyQuota();
            }
            if(typeof window.renderPostingTimePerformanceHints === "function"){
                window.renderPostingTimePerformanceHints();
            }
            if(typeof window.renderDashboardWeekdayPerformance === "function"){
                window.renderDashboardWeekdayPerformance();
            }

        }
        catch(error){

            console.error("Fehler beim Verarbeiten der CSV:", error);

            if(statusEl){
                statusEl.textContent = "Fehler beim Einlesen der CSV: " + error.message;
            }

        }

    };

    reader.onerror = () => {

        if(statusEl){
            statusEl.textContent = "Datei konnte nicht gelesen werden.";
        }

    };

    reader.readAsText(file, "UTF-8");

}

/* ----------------------------------------------------------
   Rendering: Summary-Karten
---------------------------------------------------------- */

function renderCsvSummary(posts){

    const container = document.getElementById("csvSummary");

    if(!container){
        return;
    }

    if(posts.length === 0){

        container.innerHTML = '<p class="planner-empty">Noch keine CSV importiert. Klicke oben auf "X CSV importieren".</p>';
        return;

    }

    const totals = posts.reduce((sum, post) => {

        sum.impressions += post.impressions;
        sum.likes += post.likes;
        sum.interactions += post.interactions;
        sum.newFollowers += post.newFollowers;

        return sum;

    }, { impressions: 0, likes: 0, interactions: 0, newFollowers: 0 });

    container.innerHTML = `
        <div class="card">
            <h4>Importierte Posts</h4>
            <p>${posts.length}</p>
        </div>
        <div class="card">
            <h4>Impressions gesamt</h4>
            <p>${totals.impressions.toLocaleString("de-DE")}</p>
        </div>
        <div class="card">
            <h4>Neue Follower gesamt</h4>
            <p>${totals.newFollowers.toLocaleString("de-DE")}</p>
        </div>
        <div class="card">
            <h4>Interaktionen gesamt</h4>
            <p>${totals.interactions.toLocaleString("de-DE")}</p>
        </div>
    `;

}

/* ----------------------------------------------------------
   Rendering: Top Posts nach Impressions
---------------------------------------------------------- */

function renderCsvTopPosts(posts, sortMode, limit, repliesMode){

    const container = document.getElementById("csvTopPosts");

    if(!container){
        return;
    }

    if(posts.length === 0){

        container.innerHTML = '<p class="planner-empty">Keine Daten vorhanden.</p>';
        return;

    }

    // Antworten (@...) optional ausblenden - standardmäßig nur Content-Posts
    let basePosts = posts;

    if(repliesMode !== "show"){
        basePosts = posts.filter(p => !(p.text || "").trim().startsWith("@"));
    }

    if(basePosts.length === 0){

        container.innerHTML = '<p class="planner-empty">Keine Content-Posts vorhanden (nur Antworten).</p>';
        return;

    }

    const mode = sortMode || "impressions";

    let sorted;

    if(mode === "date"){

        sorted = [...basePosts].sort((a, b) => new Date(b.date) - new Date(a.date));

    }
    else{

        sorted = [...basePosts].sort((a, b) => b.impressions - a.impressions);

    }

    // limit === "all" (oder ungültig) -> alle Posts zeigen
    const count = (limit === "all" || !limit)
        ? sorted.length
        : parseInt(limit, 10) || 10;

    const top = sorted.slice(0, count);

    const maxImpressions = Math.max(1, ...top.map(post => post.impressions));

    container.innerHTML = "";

    top.forEach(post => {

        const percent = Math.round((post.impressions / maxImpressions) * 100);

        const shortText = post.text.length > 70
            ? post.text.slice(0, 70) + "…"
            : post.text;

        const row = document.createElement("div");
        row.className = "analytics-row analytics-row-post";

        const label = document.createElement("div");
        label.className = "analytics-row-label";
        label.textContent = post.date + " — " + shortText;

        row.innerHTML = `
            <div class="analytics-row-bar">
                <div class="analytics-row-fill" style="width:${percent}%;"></div>
            </div>
            <div class="analytics-row-count">${post.impressions.toLocaleString("de-DE")} Impressions</div>
        `;

        row.prepend(label);

        container.appendChild(row);

    });

}

/* ----------------------------------------------------------
   Rate-basierte Top-Listen (Save-Rate, Share-Rate)
   Nutzt bisher ungenutzte CSV-Spalten (Bookmarks, Shares).
---------------------------------------------------------- */

function renderRateList(containerId, metricKey, unitLabel, minImpressions, showReplan){

    const container = document.getElementById(containerId);

    if(!container){
        return;
    }

    const posts = loadStoredCsvPosts();
    const content = posts.filter(p => !(p.text || "").trim().startsWith("@"));

    // Nur Posts mit genug Reichweite (sonst verzerren Mini-Posts die Rate)
    const eligible = content
        .filter(p => p.impressions >= (minImpressions || 500))
        .map(p => ({
            post: p,
            rate: (p[metricKey] || 0) / p.impressions * 1000
        }))
        .filter(item => item.rate > 0);

    if(eligible.length === 0){

        container.innerHTML = '<p class="planner-empty">Noch keine Daten – CSV importieren.</p>';
        return;

    }

    eligible.sort((a, b) => b.rate - a.rate);

    const top = eligible.slice(0, 8);
    const maxRate = Math.max(1, ...top.map(item => item.rate));

    container.innerHTML = "";

    top.forEach(item => {

        const post = item.post;
        const percent = Math.round((item.rate / maxRate) * 100);

        const shortText = post.text.length > 65
            ? post.text.slice(0, 65) + "…"
            : post.text;

        const row = document.createElement("div");
        row.className = "analytics-row analytics-row-post";

        const label = document.createElement("div");
        label.className = "analytics-row-label";
        label.textContent = post.date + " — " + shortText;

        const replanButton = showReplan
            ? '<button class="evergreen-replan-btn" data-text="' +
                encodeURIComponent(post.text) + '">🔄 nochmal einplanen</button>'
            : "";

        row.innerHTML =
            '<div class="analytics-row-bar">' +
                '<div class="analytics-row-fill" style="width:' + percent + '%;"></div>' +
            '</div>' +
            '<div class="analytics-row-count">' + item.rate.toFixed(1) + " " + unitLabel + '</div>' +
            replanButton;

        row.prepend(label);

        container.appendChild(row);

    });

    // Replan-Buttons verkabeln
    if(showReplan){

        container.querySelectorAll(".evergreen-replan-btn").forEach(btn => {

            btn.addEventListener("click", () => {

                const text = decodeURIComponent(btn.dataset.text || "");

                if(window.planner && typeof window.planner.parkPost === "function"){

                    // Erste Zeile als Song/Titel nehmen
                    const firstLine = text.split("\n")[0];

                    window.planner.parkPost({
                        category: "Musikvideo",
                        text: text,
                        song: firstLine,
                        todo: [],
                        parkNote: "Evergreen-Wiederholung (lief schon mal gut)"
                    });

                    btn.textContent = "✓ im Planner";
                    btn.disabled = true;

                }

            });

        });

    }

}

function renderEvergreenPosts(){
    // Save-Rate = Bookmarks pro 1000 Impressions, mit "nochmal einplanen"
    renderRateList("csvEvergreenPosts", "bookmarks", "Saves/1k", 500, true);
}

function renderViralPosts(){
    // Share-Rate = Shares ("Mal geteilt") pro 1000 Impressions, ohne Replan-Button
    renderRateList("csvViralPosts", "shares", "Shares/1k", 500, false);
}

/* ----------------------------------------------------------
   Top Künstler / Engagement-Score
   Gruppiert CSV-Posts nach erstem Wort des Texts (Künstler/Song),
   berechnet Engagement-Score = (Likes + Interaktionen) / Impressions * 1000.
---------------------------------------------------------- */

function renderTopArtists(){

    const container = document.getElementById("csvTopArtists");
    if(!container){ return; }

    const posts = loadStoredCsvPosts();
    const content = posts.filter(p =>
        !(p.text || "").trim().startsWith("@") && p.impressions >= 200
    );

    if(content.length === 0){
        container.innerHTML = '<p class="planner-empty">Noch keine Daten – CSV importieren.</p>';
        return;
    }

    // Künstler aus der ersten Textzeile extrahieren
    // Format: "𝗧𝗶𝘁𝗲𝗹 - 𝗞𝘂̈𝗻𝘀𝘁𝗹𝗲𝗿 (Jahr)" → Künstler nach " - "
    function extractArtist(text){
        const firstLine = (text || "").split("\n")[0];
        // Unicode-Fett normalisieren
        let normal = "";
        for(const char of firstLine){
            const code = char.codePointAt(0);
            if(code >= 0x1D5D4 && code <= 0x1D5ED){ normal += String.fromCharCode(0x41 + (code - 0x1D5D4)); }
            else if(code >= 0x1D5EE && code <= 0x1D607){ normal += String.fromCharCode(0x61 + (code - 0x1D5EE)); }
            else if(code >= 0x1D7EC && code <= 0x1D7F5){ normal += String.fromCharCode(0x30 + (code - 0x1D7EC)); }
            else{ normal += char; }
        }
        // URLs, Hashtags und Emojis am Anfang entfernen
        normal = normal
            .replace(/https?:\/\/\S+/g, "")
            .replace(/#\S+/g, "")
            .replace(/[\u{1F300}-\u{1FFFF}]/gu, "")
            .trim();

        // Muster: "Titel - Künstler (Jahr)" → Jahres-Klammer finden
        // dann rückwärts den letzten " - " vor dem Jahr suchen
        const yearMatch = normal.match(/\s*\((\d{4})\)\s*/);

        if(yearMatch){
            const beforeYear = normal.slice(0, yearMatch.index).trim();
            const lastDash = beforeYear.lastIndexOf(" - ");
            if(lastDash !== -1){
                const candidate = beforeYear.slice(lastDash + 3).trim();
                const wordCount = candidate.split(/\s+/).length;
                // Nur 1-3 Wörter akzeptieren – echte Künstlernamen sind selten länger.
                // "Phil Collins" (2) ✓, "Depeche Mode" (2) ✓, "Men Without Hats" (3) ✓
                // "In The Air Tonight" (4) ✗, "Never Let Me Down Again" (5) ✗
                if(wordCount >= 1 && wordCount <= 3 && candidate.length >= 2 && candidate.length <= 35){
                    return candidate;
                }
            }
        }
        return null;
    }

    // Gruppieren nach Künstler
    const artistMap = new Map();

    content.forEach(post => {
        const artist = extractArtist(post.text);
        if(!artist || artist.length < 2){ return; }

        if(!artistMap.has(artist)){
            artistMap.set(artist, { posts: 0, likes: 0, interactions: 0, impressions: 0 });
        }
        const a = artistMap.get(artist);
        a.posts++;
        a.likes += (post.likes || 0);
        a.interactions += (post.interactions || 0);
        a.impressions += post.impressions;
    });

    // Engagement-Score: (Likes + Interaktionen) / Impressions * 1000
    const ranked = Array.from(artistMap.entries())
        .filter(([, d]) => d.posts >= 1 && d.impressions > 0)
        .map(([name, d]) => ({
            name,
            posts: d.posts,
            score: (d.likes + d.interactions) / d.impressions * 1000
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 15);

    if(ranked.length === 0){
        container.innerHTML = '<p class="planner-empty">Nicht genug Daten für Künstler-Auswertung.</p>';
        return;
    }

    const maxScore = Math.max(1, ...ranked.map(a => a.score));
    container.innerHTML = "";

    ranked.forEach(item => {

        const percent = Math.round((item.score / maxScore) * 100);

        const row = document.createElement("div");
        row.className = "analytics-row";

        const label = document.createElement("div");
        label.className = "analytics-row-label";
        label.textContent = item.name + (item.posts > 1 ? " (" + item.posts + " Posts)" : "");

        row.innerHTML =
            '<div class="analytics-row-bar">' +
                '<div class="analytics-row-fill" style="width:' + percent + '%;"></div>' +
            '</div>' +
            '<div class="analytics-row-count">' + item.score.toFixed(1) + ' Eng/1k</div>';

        row.prepend(label);
        container.appendChild(row);

    });

}

/* ----------------------------------------------------------
   Format-Vergleich: erkennt Content-Formate am Text und
   vergleicht Reichweite, Save-Rate, Share-Rate, Profil-Sog.
---------------------------------------------------------- */

/* ----------------------------------------------------------
   Top Reposts (Weiterleitungen – stärker als Shares)
---------------------------------------------------------- */

function renderTopReposts(){

    const container = document.getElementById("csvTopReposts");
    if(!container){ return; }

    const posts = loadStoredCsvPosts();
    const content = posts.filter(p => !(p.text || "").trim().startsWith("@"));

    if(content.length === 0){
        container.innerHTML = '<p class="planner-empty">Noch keine Daten.</p>';
        return;
    }

    const sorted = [...content]
        .sort((a, b) => (b.reposts || 0) - (a.reposts || 0))
        .filter(p => (p.reposts || 0) > 0)
        .slice(0, 10);

    if(sorted.length === 0){
        container.innerHTML = '<p class="planner-empty">Keine Repost-Daten in der CSV.</p>';
        return;
    }

    const max = Math.max(1, ...sorted.map(p => p.reposts || 0));
    container.innerHTML = "";

    sorted.forEach(p => {
        const pct = Math.round((p.reposts || 0) / max * 100);
        const short = (p.text || "").slice(0, 55) + ((p.text || "").length > 55 ? "…" : "");
        const row = document.createElement("div");
        row.className = "analytics-row analytics-row-post";
        const label = document.createElement("div");
        label.className = "analytics-row-label";
        label.textContent = (p.date || "") + " — " + short;
        row.innerHTML =
            '<div class="analytics-row-bar"><div class="analytics-row-fill" style="width:' + pct + '%;"></div></div>' +
            '<div class="analytics-row-count">' + (p.reposts || 0) + ' RP</div>';
        row.prepend(label);
        container.appendChild(row);
    });

}

/* ----------------------------------------------------------
   Top Detailerweiterungen (wer liest den ganzen Text)
---------------------------------------------------------- */

function renderTopDetailClicks(){

    const container = document.getElementById("csvTopDetail");
    if(!container){ return; }

    const posts = loadStoredCsvPosts();
    const content = posts.filter(p => !(p.text || "").trim().startsWith("@"));

    if(content.length === 0){
        container.innerHTML = '<p class="planner-empty">Noch keine Daten.</p>';
        return;
    }

    const sorted = [...content]
        .sort((a, b) => (b.detailExpands || 0) - (a.detailExpands || 0))
        .filter(p => (p.detailExpands || 0) > 0)
        .slice(0, 10);

    if(sorted.length === 0){
        container.innerHTML = '<p class="planner-empty">Keine Detail-Klick-Daten in der CSV.</p>';
        return;
    }

    const max = Math.max(1, ...sorted.map(p => p.detailExpands || 0));
    container.innerHTML = "";

    sorted.forEach(p => {
        const pct = Math.round((p.detailExpands || 0) / max * 100);
        const short = (p.text || "").slice(0, 55) + ((p.text || "").length > 55 ? "…" : "");
        const row = document.createElement("div");
        row.className = "analytics-row analytics-row-post";
        const label = document.createElement("div");
        label.className = "analytics-row-label";
        label.textContent = (p.date || "") + " — " + short;
        row.innerHTML =
            '<div class="analytics-row-bar"><div class="analytics-row-fill" style="width:' + pct + '%;"></div></div>' +
            '<div class="analytics-row-count">' + (p.detailExpands || 0) + ' 🔍</div>';
        row.prepend(label);
        container.appendChild(row);
    });

}

/* ----------------------------------------------------------
   Wochentag-Tabelle: Impressions, Engagement, Saves, Shares
---------------------------------------------------------- */

function renderWeekdayTable(){

    const container = document.getElementById("csvWeekdayTable");
    if(!container){ return; }

    const posts = loadStoredCsvPosts();
    const content = posts.filter(p => !(p.text || "").trim().startsWith("@"));

    if(content.length === 0){
        container.innerHTML = '<p class="planner-empty">Noch keine Daten – CSV importieren.</p>';
        return;
    }

    const days = ["Mo","Di","Mi","Do","Fr","Sa","So"];
    const byDay = [1,2,3,4,5,6,0].map((jsDay, i) => {
        const ps = content.filter(p => {
            try{ return new Date(p.date).getDay() === jsDay; }
            catch(e){ return false; }
        });
        if(ps.length === 0){ return null; }
        const avgImpr  = ps.reduce((s,p) => s + (p.impressions || 0), 0) / ps.length;
        const avgEng   = ps.reduce((s,p) => s + ((p.likes || 0) + (p.interactions || 0)), 0) / ps.length;
        const avgSaves = ps.reduce((s,p) => s + (p.bookmarks || 0), 0) / ps.length;
        const avgShare = ps.reduce((s,p) => s + ((p.shares || 0) + (p.reposts || 0)), 0) / ps.length;
        return { day: days[i], count: ps.length, avgImpr, avgEng, avgSaves, avgShare };
    }).filter(Boolean);

    if(byDay.length === 0){
        container.innerHTML = '<p class="planner-empty">Keine Datumsdaten verfügbar.</p>';
        return;
    }

    const maxImpr = Math.max(...byDay.map(d => d.avgImpr));

    let html = '<table class="weekday-table">';
    html += '<tr><th>Tag</th><th>Posts</th><th>Ø Impr.</th><th>Ø Eng.</th><th>Ø Saves</th><th>Ø Reposts+Shares</th></tr>';

    byDay.forEach(d => {
        const barPct = Math.round(d.avgImpr / maxImpr * 100);
        const isBest = d.avgImpr === maxImpr;
        html += '<tr' + (isBest ? ' class="weekday-best"' : '') + '>' +
            '<td><strong>' + d.day + '</strong></td>' +
            '<td>' + d.count + '</td>' +
            '<td>' +
                '<div class="weekday-bar-wrap">' +
                    '<div class="weekday-bar" style="width:' + barPct + '%"></div>' +
                    '<span>' + Math.round(d.avgImpr).toLocaleString("de-DE") + '</span>' +
                '</div>' +
            '</td>' +
            '<td>' + Math.round(d.avgEng) + '</td>' +
            '<td>' + d.avgSaves.toFixed(1) + '</td>' +
            '<td>' + d.avgShare.toFixed(1) + '</td>' +
            '</tr>';
    });

    html += '</table>';
    container.innerHTML = html;

}

function renderFormatComparison(){

    const container = document.getElementById("csvFormatComparison");

    if(!container){
        return;
    }

    const posts = loadStoredCsvPosts();
    const content = posts.filter(p => !(p.text || "").trim().startsWith("@"));

    if(content.length === 0){

        container.innerHTML = '<p class="planner-empty">Noch keine Daten – CSV importieren.</p>';
        return;

    }

    const formats = [
        { name: "💡 Did You Know", test: p => /did you know/i.test(p.text) },
        { name: "📖 Story behind", test: p => /story behind/i.test(p.text) },
        { name: "📼 On This Day", test: p => /on this day|choice of the day/i.test(p.text) },
        { name: "🧠 Quiz", test: p => /quiz|nerd/i.test(p.text) },
        { name: "🧩 Picture Puzzle", test: p => /picture puzzle/i.test(p.text) }
    ];

    const rows = [];

    formats.forEach(fmt => {

        const matching = content.filter(fmt.test);

        if(matching.length === 0){
            return;
        }

        const impr = matching.reduce((s, p) => s + p.impressions, 0);
        const book = matching.reduce((s, p) => s + (p.bookmarks || 0), 0);
        const shares = matching.reduce((s, p) => s + (p.shares || 0), 0);
        const avgImpr = Math.round(impr / matching.length);
        const saveRate = (book / impr * 1000).toFixed(1);
        const shareRate = (shares / impr * 1000).toFixed(1);

        rows.push({
            name: fmt.name,
            count: matching.length,
            avgImpr: avgImpr,
            saveRate: saveRate,
            shareRate: shareRate
        });

    });

    if(rows.length === 0){

        container.innerHTML = '<p class="planner-empty">Keine bekannten Formate erkannt.</p>';
        return;

    }

    // Nach Ø Impressions sortieren
    rows.sort((a, b) => b.avgImpr - a.avgImpr);

    let html = '<table class="format-table">';
    html += '<tr>' +
        '<th>Format</th>' +
        '<th>Posts</th>' +
        '<th>Ø Impr.</th>' +
        '<th>Saves/1k</th>' +
        '<th>Shares/1k</th>' +
        '</tr>';

    rows.forEach(r => {
        html += '<tr>' +
            '<td>' + r.name + '</td>' +
            '<td>' + r.count + '</td>' +
            '<td>' + r.avgImpr.toLocaleString("de-DE") + '</td>' +
            '<td>' + r.saveRate + '</td>' +
            '<td>' + r.shareRate + '</td>' +
            '</tr>';
    });

    html += '</table>';

    container.innerHTML = html;

}

function renderCsvAnalytics(){

    const posts = loadStoredCsvPosts();

    renderCsvSummary(posts);

    const sortSelect = document.getElementById("csvTopPostsSort");
    const limitSelect = document.getElementById("csvTopPostsLimit");
    const repliesSelect = document.getElementById("csvTopPostsReplies");

    // Default auf "10" setzen falls noch kein Wert gewählt
    if(limitSelect && !limitSelect.dataset.userSet){
        limitSelect.value = "10";
    }

    renderCsvTopPosts(
        posts,
        sortSelect ? sortSelect.value : "impressions",
        limitSelect ? limitSelect.value : "10",
        repliesSelect ? repliesSelect.value : "hide"
    );

    renderEvergreenPosts();
    renderViralPosts();
    renderTopArtists();
    renderTopReposts();
    renderTopDetailClicks();
    renderWeekdayTable();
    renderFormatComparison();

    renderFollowerChart();
    renderDaysStoredInfo();
    renderAccountStandCards();
    renderFollowerTotalChart();

    const metricSelect = document.getElementById("csvPercentMetric");
    renderPercentChangeChart(metricSelect ? metricSelect.value : "impressions");

}

/* ----------------------------------------------------------
   Bootstrap: Button/Input verkabeln
---------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {

    const importButton = document.getElementById("importCsvButton");
    const fileInput = document.getElementById("csvFileInput");

    if(importButton && fileInput){

        importButton.addEventListener("click", () => {
            fileInput.click();
        });

        fileInput.addEventListener("change", () => {

            if(fileInput.files && fileInput.files[0]){
                handleCsvFile(fileInput.files[0]);
            }

            fileInput.value = "";

        });

    }

    // Drag & Drop: CSV direkt ins Fenster ziehen
    const dropZone = document.getElementById("csvDropZone");

    if(dropZone){

        // Standard-Verhalten des Browsers (Datei öffnen) unterbinden
        ["dragenter", "dragover"].forEach(evtName => {

            dropZone.addEventListener(evtName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.add("csv-drop-zone-active");
            });

        });

        ["dragleave", "drop"].forEach(evtName => {

            dropZone.addEventListener(evtName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.remove("csv-drop-zone-active");
            });

        });

        dropZone.addEventListener("drop", (e) => {

            const files = e.dataTransfer ? e.dataTransfer.files : null;

            if(files && files.length > 0){

                const file = files[0];
                const name = (file.name || "").toLowerCase();

                // Nur CSV-Dateien akzeptieren
                if(name.endsWith(".csv") || file.type === "text/csv" || file.type === "text/plain"){
                    handleCsvFile(file);
                }
                else{

                    const statusEl = document.getElementById("csvImportStatus");
                    if(statusEl){
                        statusEl.textContent = "Bitte eine .csv-Datei ablegen.";
                    }

                }

            }

        });

    }

    const metricSelect = document.getElementById("csvPercentMetric");

    if(metricSelect){

        metricSelect.addEventListener("change", () => {
            renderPercentChangeChart(metricSelect.value);
        });

    }

    const topPostsSortSelect = document.getElementById("csvTopPostsSort");
    const topPostsLimitSelect = document.getElementById("csvTopPostsLimit");
    const topPostsRepliesSelect = document.getElementById("csvTopPostsReplies");

    function refreshTopPosts(){

        const posts = loadStoredCsvPosts();
        renderCsvTopPosts(
            posts,
            topPostsSortSelect ? topPostsSortSelect.value : "impressions",
            topPostsLimitSelect ? topPostsLimitSelect.value : "10",
            topPostsRepliesSelect ? topPostsRepliesSelect.value : "hide"
        );

    }

    if(topPostsSortSelect){
        topPostsSortSelect.addEventListener("change", refreshTopPosts);
    }

    if(topPostsLimitSelect){
        topPostsLimitSelect.addEventListener("change", () => {
            topPostsLimitSelect.dataset.userSet = "1";
            refreshTopPosts();
        });
    }

    if(topPostsLimitSelect){
        topPostsLimitSelect.addEventListener("change", refreshTopPosts);
    }

    if(topPostsRepliesSelect){
        topPostsRepliesSelect.addEventListener("change", refreshTopPosts);
    }

    initAccountStandButton();

    const existing = loadStoredCsvPosts();
    const statusEl = document.getElementById("csvImportStatus");

    if(existing.length > 0 && statusEl){
        statusEl.textContent = existing.length + " Posts aus vorherigem Import geladen.";
    }

    renderCsvAnalytics();

});

