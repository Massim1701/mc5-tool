/*
====================================================

 We ❤️ 80s Mission Control 5.1

 app.js
 Navigation, Bootstrap, Planner-Anbindung

====================================================
*/

/* ==========================================================
   SEITEN-NAVIGATION
========================================================== */

function loadTab(pageId){

    const pages = document.querySelectorAll(".page");

    pages.forEach(page => {

        if(page.id === pageId){
            page.classList.add("active-page");
        } else {
            page.classList.remove("active-page");
        }

    });

    document.querySelectorAll(".main-nav button").forEach(button => {

        if(button.dataset.page === pageId){
            button.classList.add("nav-active");
        } else {
            button.classList.remove("nav-active");
        }

    });

    if(pageId === "analytics" && typeof window.renderAnalytics === "function"){

        window.renderAnalytics();

    }

    if(pageId === "archive" && typeof window.renderArchiveList === "function"){

        window.renderArchiveList();

    }

}

function initNavigation(){

    document.querySelectorAll(".main-nav button[data-page]").forEach(button => {

        button.addEventListener("click", () => {

            loadTab(button.dataset.page);

        });

    });

}

/* ==========================================================
   PLANNER: NEUER POST (Modal-Formular)
========================================================== */

function initPlannerModal(){

    const addButton = document.getElementById("addPlannerPost");
    const overlay = document.getElementById("plannerModalOverlay");
    const cancelButton = document.getElementById("modalCancelButton");
    const saveButton = document.getElementById("modalSaveButton");
    const typeSelect = document.getElementById("modalType");
    const labelSelect = document.getElementById("modalLabel");
    const categorySelect = document.getElementById("modalCategory");

    if(!addButton || !overlay){
        return;
    }

    function openModal(){

        // Formular auf Standardwerte zurücksetzen
        document.getElementById("modalType").value = "song";
        document.getElementById("modalSongTitle").value = "";
        document.getElementById("modalArtist").value = "";
        document.getElementById("modalYear").value = "";
        document.getElementById("modalRequestedBy").value = "";
        document.getElementById("modalLabel").value = "Song of the Day";
        document.getElementById("modalLabelCustom").value = "";
        document.getElementById("modalCategory").value = "Musikvideo";
        document.getElementById("modalCategoryCustom").value = "";
        document.getElementById("modalText").value = "";
        document.getElementById("modalDate").value = new Date().toISOString().slice(0, 10);
        document.getElementById("modalTime").value = "18:00";
        document.getElementById("modalStatus").value = "Neu";

        updateModalVisibility();

        overlay.style.display = "flex";

    }

    function closeModal(){
        overlay.style.display = "none";
    }

    function updateModalVisibility(){

        const isSong = typeSelect.value === "song";

        document.getElementById("modalSongFields").style.display = isSong ? "block" : "none";
        document.getElementById("modalIdeaFields").style.display = isSong ? "none" : "block";

        document.getElementById("modalLabelCustomWrap").style.display =
            (isSong && labelSelect.value === "custom") ? "block" : "none";

        document.getElementById("modalCategoryCustomWrap").style.display =
            (!isSong && categorySelect.value === "custom") ? "block" : "none";

    }

    addButton.addEventListener("click", openModal);
    cancelButton.addEventListener("click", closeModal);

    overlay.addEventListener("click", (event) => {

        if(event.target === overlay){
            closeModal();
        }

    });

    typeSelect.addEventListener("change", updateModalVisibility);
    labelSelect.addEventListener("change", updateModalVisibility);
    categorySelect.addEventListener("change", updateModalVisibility);

    saveButton.addEventListener("click", () => {

        const date = document.getElementById("modalDate").value;
        const time = document.getElementById("modalTime").value;
        const status = document.getElementById("modalStatus").value;

        if(typeSelect.value === "song"){

            const songTitle = document.getElementById("modalSongTitle").value.trim();
            const artist = document.getElementById("modalArtist").value.trim();
            const year = document.getElementById("modalYear").value.trim();
            const requestedBy = document.getElementById("modalRequestedBy").value.trim();

            if(songTitle === ""){
                window.alert("Bitte einen Songtitel eintragen.");
                return;
            }

            const label = labelSelect.value === "custom"
                ? (document.getElementById("modalLabelCustom").value.trim() || "Song of the Day")
                : labelSelect.value;

            const songDisplay = songTitle + (artist ? " - " + artist : "");

            window.planner.addPost({
                date: date,
                time: time,
                category: "Song-Wunsch",
                status: status,
                text: label + ": " + songDisplay + (year ? " (" + year + ")" : "") +
                    (requestedBy ? " — angefragt von " + requestedBy : ""),
                song: songDisplay,
                requestedBy: requestedBy,
                songTitle: songTitle,
                artist: artist,
                year: year
            });

        }
        else{

            const category = categorySelect.value === "custom"
                ? (document.getElementById("modalCategoryCustom").value.trim() || "Sonstiges")
                : categorySelect.value;

            const text = document.getElementById("modalText").value.trim();

            window.planner.addPost({
                date: date,
                time: time,
                category: category,
                status: status,
                text: text
            });

        }

        closeModal();

    });

}

/* ==========================================================
   PLANNER: FILTER
========================================================== */

function initPlannerFilter(){

    const filterSelect = document.getElementById("plannerFilter");

    if(!filterSelect){
        return;
    }

    filterSelect.addEventListener("change", () => {

        window.planner.setFilter(filterSelect.value);

    });

}

/* ==========================================================
   PLANNER: ARCHIV EIN-/AUSBLENDEN
========================================================== */

function initPlannerArchiveToggle(){

    const toggleButton = document.getElementById("togglePlannerArchive");
    const archiveList = document.getElementById("plannerArchiveList");

    if(!toggleButton || !archiveList){
        return;
    }

    toggleButton.addEventListener("click", () => {

        const isHidden = archiveList.style.display === "none";

        archiveList.style.display = isHidden ? "grid" : "none";
        toggleButton.textContent = isHidden ? "Ausblenden" : "Anzeigen";

        if(isHidden && window.planner){
            window.planner.renderArchive();
        }

    });

}

/* ==========================================================
   BACKUP: EXPORT / IMPORT ALLER MISSION-DATEN
========================================================== */

function initBackup(){

    const exportButton = document.getElementById("backupExportButton");
    const importButton = document.getElementById("backupImportButton");
    const fileInput = document.getElementById("backupFileInput");
    const statusEl = document.getElementById("backupStatus");

    // Alle mission*-Keys aus dem localStorage einsammeln
    function collectMissionData(){

        const data = {};

        for(let i = 0; i < localStorage.length; i++){

            const key = localStorage.key(i);

            if(key && key.indexOf("mission") === 0){
                data[key] = localStorage.getItem(key);
            }

        }

        return data;

    }

    if(exportButton){

        exportButton.addEventListener("click", () => {

            const data = collectMissionData();

            const backup = {
                app: "Mission Control 5.1",
                exportedAt: new Date().toISOString(),
                data: data
            };

            const json = JSON.stringify(backup, null, 2);
            const blob = new Blob([json], { type: "application/json" });
            const url = URL.createObjectURL(blob);

            const stamp = new Date().toISOString().slice(0, 10);
            const a = document.createElement("a");
            a.href = url;
            a.download = "mission-control-backup-" + stamp + ".json";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            if(statusEl){
                const count = Object.keys(data).length;
                statusEl.textContent = "Backup exportiert (" + count + " Datensätze).";
            }

        });

    }

    if(importButton && fileInput){

        importButton.addEventListener("click", () => {
            fileInput.click();
        });

        fileInput.addEventListener("change", () => {

            const file = fileInput.files && fileInput.files[0];

            if(!file){
                return;
            }

            const reader = new FileReader();

            reader.onload = () => {

                try{

                    const parsed = JSON.parse(reader.result);

                    if(!parsed.data || typeof parsed.data !== "object"){
                        throw new Error("Ungültiges Backup-Format");
                    }

                    // Sicherheitsabfrage
                    const confirmed = window.confirm(
                        "Backup einspielen? Deine aktuellen Daten werden dabei überschrieben."
                    );

                    if(!confirmed){
                        if(statusEl){
                            statusEl.textContent = "Import abgebrochen.";
                        }
                        return;
                    }

                    // Alle mission*-Keys aus dem Backup wiederherstellen
                    Object.entries(parsed.data).forEach(([key, value]) => {
                        if(key.indexOf("mission") === 0){
                            localStorage.setItem(key, value);
                        }
                    });

                    if(statusEl){
                        statusEl.textContent = "Backup eingespielt! Seite wird neu geladen...";
                    }

                    // Neu laden, damit alle Module die Daten übernehmen
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);

                }
                catch(error){

                    if(statusEl){
                        statusEl.textContent = "Fehler: Datei ist kein gültiges Backup.";
                    }

                }

            };

            reader.readAsText(file);
            fileInput.value = "";

        });

    }

}

/* ==========================================================
   ANALYTICS: SEKTIONEN EINKLAPPBAR MACHEN
========================================================== */

function initAnalyticsCollapse(){

    const analyticsPage = document.getElementById("analytics");

    if(!analyticsPage){
        return;
    }

    const COLLAPSE_KEY = "missionAnalyticsCollapsed";

    // Gespeicherten Zustand laden (Liste eingeklappter Sektions-Indizes)
    let collapsed = [];
    try{
        const saved = localStorage.getItem(COLLAPSE_KEY);
        collapsed = saved ? JSON.parse(saved) : [];
    }
    catch(error){
        collapsed = [];
    }

    const sections = analyticsPage.querySelectorAll(".analytics-section");

    sections.forEach((section, index) => {

        // Die Überschrift finden (h4) - entweder direkt oder im chart-header
        const heading = section.querySelector("h4");

        if(!heading){
            return;
        }

        // Den "Host" bestimmen: das direkte Kind der Section, das die
        // Überschrift enthält (entweder der chart-header oder die h4 selbst)
        let headerHost = heading;
        Array.from(section.children).forEach(child => {
            if(child === heading || child.contains(heading)){
                headerHost = child;
            }
        });

        // Body-Elemente: alle direkten Section-Kinder nach dem Header-Host
        const bodyElements = [];
        let sawHeader = false;

        Array.from(section.children).forEach(child => {
            if(child === headerHost){
                sawHeader = true;
                return;
            }
            if(sawHeader){
                bodyElements.push(child);
            }
        });

        if(bodyElements.length === 0){
            return;
        }

        // Klick-Indikator an die Überschrift
        heading.style.cursor = "pointer";
        heading.classList.add("collapsible-heading");

        const arrow = document.createElement("span");
        arrow.className = "collapse-arrow";
        arrow.textContent = " ▾";
        heading.appendChild(arrow);

        // Zustand anwenden
        function applyState(isCollapsed){

            bodyElements.forEach(el => {
                el.style.display = isCollapsed ? "none" : "";
            });

            arrow.textContent = isCollapsed ? " ▸" : " ▾";

        }

        applyState(collapsed.indexOf(index) !== -1);

        // Klick-Handler auf die Überschrift
        headerHost.addEventListener("click", (e) => {

            // Klicks auf Buttons/Selects im Header nicht als Collapse werten
            if(e.target.closest("button, select, input, a")){
                return;
            }

            const isNowCollapsed = collapsed.indexOf(index) === -1;

            if(isNowCollapsed){
                collapsed.push(index);
            }
            else{
                collapsed = collapsed.filter(i => i !== index);
            }

            localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapsed));
            applyState(isNowCollapsed);

        });

    });

}

/* ==========================================================
   BOOTSTRAP
========================================================== */

document.addEventListener("DOMContentLoaded", () => {

    initNavigation();
    initBackup();
    initAnalyticsCollapse();

    // Planner-Objekt wird weiterhin als Archiv-Datenspeicher genutzt
    if(window.planner){

        window.planner.loadLocal();

    }

    loadTab("dashboard");

    console.log("Mission Control bereit.");

});
