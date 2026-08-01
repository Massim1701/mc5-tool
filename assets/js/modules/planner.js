/*
====================================================

 We ❤️ 80s Mission Control 5.1

 PLANNER MODULE

 Content Planung für X / Twitter

====================================================
*/

class ContentPlanner {

    constructor(){

        this.posts = [];
        this.archive = [];

        // Ampel-System: Neu (Gelb) -> In Bearbeitung (Blau) -> Fertig (Grün)
        this.status = [
            "Neu",
            "In Bearbeitung",
            "Fertig"
        ];

        this.currentFilter = "all";

        console.log("Planner Modul gestartet");

    }

    /* ==========================================================
       LADEN
    ========================================================== */

    async load(){

        console.log("Planner Daten laden (Server)");

        try{

            const response = await fetch("data/planner.json");

            if(!response.ok){
                throw new Error("planner.json fehlt");
            }

            this.posts = await response.json();

            console.log("Planner geladen:", this.posts);

            this.render();

        }

        catch(error){

            console.warn("Kein Server-Planner gefunden, nutze lokale Daten:", error.message);

        }

    }

    loadLocal(){

        const saved = localStorage.getItem("missionPlanner");

        if(saved){
            this.posts = JSON.parse(saved);
        }

        const savedArchive = localStorage.getItem("missionArchive");

        if(savedArchive){
            this.archive = JSON.parse(savedArchive);
        }

    }

    saveLocal(){

        localStorage.setItem(
            "missionPlanner",
            JSON.stringify(this.posts)
        );

    }

    saveArchive(){

        localStorage.setItem(
            "missionArchive",
            JSON.stringify(this.archive)
        );

    }

    /* ==========================================================
       POSTS VERWALTEN
    ========================================================== */

    addPost(post){

        this.posts.push({
            id: Date.now(),
            createdAt: new Date().toISOString(),
            date: post.date || "",
            time: post.time || "",
            category: post.category || "Musikvideo",
            status: post.status || "Neu",
            text: post.text || "",
            song: post.song || "",
            requestedBy: post.requestedBy || "",
            songTitle: post.songTitle || "",
            artist: post.artist || "",
            year: post.year || "",
            todo: post.todo || [],
            parkNote: post.parkNote || ""
        });

        this.saveLocal();
        this.render();

    }

    /**
     * Parkt einen im Creative Studio erstellten Tweet zurück in den
     * Planner - als halbfertigen Eintrag mit Status "In Bearbeitung"
     * und Hinweisen, was noch fehlt (todo-Liste + Notiz).
     */
    parkPost(data){

        this.posts.push({
            id: Date.now(),
            createdAt: new Date().toISOString(),
            date: data.date || "",
            time: data.time || "",
            category: data.category || "Musikvideo",
            status: "In Bearbeitung",
            text: data.text || "",
            song: data.song || "",
            requestedBy: data.requestedBy || "",
            songTitle: data.songTitle || "",
            artist: data.artist || "",
            year: data.year || "",
            todo: Array.isArray(data.todo) ? data.todo : [],
            parkNote: data.parkNote || ""
        });

        this.saveLocal();
        this.render();

    }

    deletePost(id){

        this.posts = this.posts.filter(post => post.id !== id);

        this.saveLocal();
        this.render();

    }

    /**
     * Entfernt einen Post aus dem aktiven Planner und verschiebt
     * ihn ins Archiv (z.B. nachdem der Tweet kopiert und gepostet
     * wurde) - verhindert Doppelpostings.
     */
    archivePost(id, scheduledFor){

        const post = this.posts.find(p => p.id === id);

        if(!post){
            return;
        }

        this.posts = this.posts.filter(p => p.id !== id);

        this.archive.push({
            ...post,
            archivedAt: new Date().toISOString(),
            scheduledFor: scheduledFor || null,
            publishedAt: null
        });

        this.saveLocal();
        this.saveArchive();
        this.render();
        this.renderArchive();

        if(typeof window.renderDashboardHistory === "function"){
            window.renderDashboardHistory();
        }

    }

    restoreFromArchive(id){

        const post = this.archive.find(p => p.id === id);

        if(!post){
            return;
        }

        this.archive = this.archive.filter(p => p.id !== id);

        const { archivedAt, ...restored } = post;

        this.posts.push(restored);

        this.saveLocal();
        this.saveArchive();
        this.render();
        this.renderArchive();

        if(typeof window.renderDashboardHistory === "function"){
            window.renderDashboardHistory();
        }

    }

    setFilter(status){

        this.currentFilter = status || "all";
        this.render();

    }

    /**
     * Schaltet die Ampel einen Schritt weiter (Neu -> In Bearbeitung -> Fertig).
     * Ist der Post bereits auf "Fertig" und wird trotzdem auf "Weiter"
     * geklickt, öffnet sich stattdessen der Tweet Generator mit den
     * Song-Daten dieses Posts.
     */
    advanceStatus(id){

        const post = this.posts.find(p => p.id === id);

        if(!post){
            return;
        }

        const currentIndex = this.status.indexOf(post.status);

        if(currentIndex === -1 || currentIndex >= this.status.length - 1){

            // Bereits "Fertig" -> Tweet Generator öffnen statt weiterzuschalten
            if(typeof window.openTweetGenerator === "function"){
                window.openTweetGenerator(post);
            }

            return;

        }

        post.status = this.status[currentIndex + 1];

        this.saveLocal();
        this.render();

    }

    statusColorClass(status){

        switch(status){

            case "Neu":
                return "ampel-gelb";

            case "In Bearbeitung":
                return "ampel-blau";

            case "Fertig":
                return "ampel-gruen";

            default:
                return "ampel-gelb";

        }

    }

    /* ==========================================================
       RENDER
    ========================================================== */

    render(){

        const container = document.getElementById("plannerContainer");

        if(!container){
            console.warn("Planner Container fehlt");
            return;
        }

        container.innerHTML = "";

        const visiblePosts = this.currentFilter === "all"
            ? this.posts
            : this.posts.filter(post => post.status === this.currentFilter);

        if(visiblePosts.length === 0){

            const empty = document.createElement("p");
            empty.className = "planner-empty";
            empty.textContent = "Keine Posts in dieser Ansicht. Klicke auf \"+ Neuer Post\", um einen anzulegen.";
            container.appendChild(empty);
            return;

        }

        visiblePosts.forEach(post => {

            const card = document.createElement("div");
            card.className = "planner-card";

            const songBlock = post.song
                ? `
                <div class="planner-song">
                    🎵 ${this.escapeHtml(post.song)}
                </div>
                <div class="planner-requester">
                    Angefragt von: ${this.escapeHtml(post.requestedBy || "unbekannt")}
                </div>
                `
                : "";

            const isFinished = post.status === "Fertig";
            const nextLabel = isFinished ? "Weiter → Tweet Generator" : "Weiter →";

            // "Was fehlt noch"-Block für geparkte Posts
            const todoLabels = {
                video: "🎬 Video fehlt",
                text: "✏️ Text überarbeiten",
                timing: "⏰ Besserer Zeitpunkt"
            };

            let parkBlock = "";

            const hasTodo = Array.isArray(post.todo) && post.todo.length > 0;
            const hasNote = post.parkNote && post.parkNote.trim() !== "";

            if(hasTodo || hasNote){

                const todoItems = hasTodo
                    ? post.todo.map(t => '<span class="planner-todo-tag">' +
                        this.escapeHtml(todoLabels[t] || t) + '</span>').join("")
                    : "";

                const noteItem = hasNote
                    ? '<div class="planner-todo-note">📝 ' + this.escapeHtml(post.parkNote) + '</div>'
                    : "";

                parkBlock =
                    '<div class="planner-todo-block">' +
                        '<div class="planner-todo-title">Noch zu tun:</div>' +
                        todoItems +
                        noteItem +
                    '</div>';

            }

            card.innerHTML = `
                <div class="planner-header">
                    <span>${this.escapeHtml(post.category)}</span>
                    <span class="planner-ampel">
                        <span class="ampel-dot ${this.statusColorClass(post.status)}"></span>
                        ${this.escapeHtml(post.status)}
                    </span>
                </div>
                <div class="planner-date">
                    ${this.escapeHtml(post.date)} ${this.escapeHtml(post.time)}
                </div>
                ${songBlock}
                <div class="planner-text">
                    ${this.escapeHtml(post.text)}
                </div>
                ${parkBlock}
                <div class="planner-actions">
                    <button class="planner-next" data-id="${post.id}">${nextLabel}</button>
                    <button class="planner-delete" data-id="${post.id}">Löschen</button>
                </div>
            `;

            container.appendChild(card);

        });

        container.querySelectorAll(".planner-delete").forEach(btn => {

            btn.addEventListener("click", () => {

                const id = Number(btn.dataset.id);
                this.deletePost(id);

            });

        });

        container.querySelectorAll(".planner-next").forEach(btn => {

            btn.addEventListener("click", () => {

                const id = Number(btn.dataset.id);
                this.advanceStatus(id);

            });

        });

    }

    escapeHtml(value){

        const div = document.createElement("div");
        div.textContent = value == null ? "" : String(value);
        return div.innerHTML;

    }

    renderArchive(){

        const container = document.getElementById("plannerArchiveList");

        if(!container){
            return;
        }

        container.innerHTML = "";

        if(this.archive.length === 0){

            const empty = document.createElement("p");
            empty.className = "planner-empty";
            empty.textContent = "Noch nichts archiviert.";
            container.appendChild(empty);
            return;

        }

        // Neueste zuerst
        const sorted = [...this.archive].sort((a, b) =>
            new Date(b.archivedAt) - new Date(a.archivedAt)
        );

        sorted.forEach(post => {

            const card = document.createElement("div");
            card.className = "planner-card planner-card-archived";

            const songBlock = post.song
                ? `<div class="planner-song">🎵 ${this.escapeHtml(post.song)}</div>`
                : "";

            card.innerHTML = `
                <div class="planner-header">
                    <span>${this.escapeHtml(post.category)}</span>
                    <span class="planner-ampel">
                        <span class="ampel-dot ampel-gruen"></span>
                        Archiviert
                    </span>
                </div>
                <div class="planner-date">
                    ${this.escapeHtml(post.date)} ${this.escapeHtml(post.time)}
                </div>
                ${songBlock}
                <div class="planner-text">
                    ${this.escapeHtml(post.text)}
                </div>
                <div class="planner-actions">
                    <button class="planner-restore" data-id="${post.id}">↩ Wiederherstellen</button>
                </div>
            `;

            container.appendChild(card);

        });

        container.querySelectorAll(".planner-restore").forEach(btn => {

            btn.addEventListener("click", () => {

                const id = Number(btn.dataset.id);
                this.restoreFromArchive(id);

            });

        });

    }

}

/* ==========================================================
   GLOBAL
========================================================== */

window.ContentPlanner = ContentPlanner;
window.planner = new ContentPlanner();
