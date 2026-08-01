/*
====================================================

 We ❤️ 80s Mission Control — ARCHIVE MODULE

 Zeigt alle geposteten Tweets, markiert als
 LIVE oder ZEITVERSETZT, mit Datum/Uhrzeit.

====================================================
*/

function archiveEscapeHtml(value){
    const div = document.createElement("div");
    div.textContent = value == null ? "" : String(value);
    return div.innerHTML;
}

function archiveFormatDateTime(isoString){
    if(!isoString){ return null; }
    const d = new Date(isoString);
    if(isNaN(d)){ return null; }
    return d.toLocaleDateString("de-DE", {
        day: "2-digit", month: "2-digit", year: "numeric"
    }) + " " + d.toLocaleTimeString("de-DE", {
        hour: "2-digit", minute: "2-digit"
    }) + " Uhr";
}

function renderArchiveList(){

    const container = document.getElementById("archiveList");
    const countEl = document.getElementById("archiveCount");

    if(!container){ return; }

    let archive = [];
    try{
        const saved = localStorage.getItem("missionArchive");
        archive = saved ? JSON.parse(saved) : [];
    }
    catch(e){ archive = []; }

    // Suchfilter
    const searchInput = document.getElementById("archiveSearchInput");
    const query = searchInput ? searchInput.value.trim().toLowerCase() : "";

    let filtered = archive;
    if(query !== ""){
        filtered = archive.filter(post => {
            const haystack = (
                (post.text || "") + " " + (post.song || "") + " " + (post.category || "")
            ).toLowerCase();
            return haystack.indexOf(query) !== -1;
        });
    }

    // Neueste zuerst
    const sorted = [...filtered].sort((a, b) => {
        const da = a.archivedAt ? new Date(a.archivedAt) : 0;
        const db = b.archivedAt ? new Date(b.archivedAt) : 0;
        return db - da;
    });

    if(countEl){
        countEl.textContent = query !== ""
            ? sorted.length + " von " + archive.length + " Einträgen"
            : sorted.length + (sorted.length === 1 ? " Eintrag" : " Einträge");
    }

    container.innerHTML = "";

    if(sorted.length === 0){
        container.innerHTML = '<p class="planner-empty">' +
            (query !== "" ? 'Keine Treffer für "' + archiveEscapeHtml(query) + '".'
                          : 'Noch nichts gepostet. Erstelle deinen ersten Tweet auf der Content-Seite.') +
            '</p>';
        return;
    }

    sorted.forEach(post => {

        const card = document.createElement("div");
        card.className = "planner-card planner-card-archived";

        // Live oder Zeitversetzt?
        const isLive = post.postMode === "live";
        const isScheduled = post.postMode === "scheduled";

        let badge = "";
        if(isLive){
            badge = '<span class="archive-badge archive-badge-live">🔴 Live gepostet</span>';
        }
        else if(isScheduled){
            badge = '<span class="archive-badge archive-badge-scheduled">🕐 Zeitversetzt</span>';
        }
        else{
            // Altbestand ohne postMode
            badge = '<span class="archive-badge">📦 Archiviert</span>';
        }

        // Zeitleiste
        const timeline = [];
        const createdLabel = archiveFormatDateTime(post.createdAt);
        const scheduledLabel = archiveFormatDateTime(post.scheduledFor);
        const publishedLabel = archiveFormatDateTime(post.publishedAt);

        if(createdLabel){
            timeline.push("📝 Erstellt: " + createdLabel);
        }
        if(isScheduled && scheduledLabel){
            timeline.push("🕐 Geplant für: " + scheduledLabel);
        }
        if(publishedLabel){
            timeline.push("✅ Veröffentlicht: " + publishedLabel);
        }
        else if(isScheduled){
            timeline.push("⏳ Veröffentlicht: wartet auf CSV-Abgleich 🎈");
        }

        const timelineBlock = timeline.length > 0
            ? '<div class="history-timeline">' +
                timeline.map(t => '<div class="history-timeline-row">' + archiveEscapeHtml(t) + '</div>').join("") +
              '</div>'
            : "";

        const songBlock = post.song
            ? '<div class="planner-song">🎵 ' + archiveEscapeHtml(post.song) + '</div>'
            : "";

        const categoryLabel = post.category ? archiveEscapeHtml(post.category) : "Post";

        card.innerHTML =
            '<div class="planner-header">' +
                '<span>' + categoryLabel + '</span>' +
                badge +
            '</div>' +
            songBlock +
            '<div class="planner-text">' + archiveEscapeHtml(post.text || "") + '</div>' +
            timelineBlock +
            '<div class="planner-actions">' +
                '<button class="archive-delete" data-id="' + post.id + '">Löschen</button>' +
            '</div>';

        container.appendChild(card);

    });

    // Löschen-Buttons
    container.querySelectorAll(".archive-delete").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = Number(btn.dataset.id);
            archiveDeletePost(id);
        });
    });

}

function archiveDeletePost(id){

    let archive = [];
    try{
        const saved = localStorage.getItem("missionArchive");
        archive = saved ? JSON.parse(saved) : [];
    }
    catch(e){ return; }

    archive = archive.filter(p => p.id !== id);
    localStorage.setItem("missionArchive", JSON.stringify(archive));

    if(window.planner){
        window.planner.archive = archive;
    }

    renderArchiveList();

    if(typeof window.renderDashboardHistory === "function"){
        window.renderDashboardHistory();
    }

}

document.addEventListener("DOMContentLoaded", () => {

    renderArchiveList();

    const searchInput = document.getElementById("archiveSearchInput");
    if(searchInput){
        searchInput.addEventListener("input", renderArchiveList);
    }

});

// Global verfügbar machen
window.renderArchiveList = renderArchiveList;
