/*
====================================================

 We ❤️ 80s Mission Control — CONTENT MODULE

====================================================
*/

const CONTENT_HASHTAGS = "#80s #80er #Retro #WeLove80s";

function contentToBold(text){
    let result = "";
    for(const char of text){
        const code = char.codePointAt(0);
        if(code >= 0x41 && code <= 0x5A){ result += String.fromCodePoint(0x1D5D4 + (code - 0x41)); }
        else if(code >= 0x61 && code <= 0x7A){ result += String.fromCodePoint(0x1D5EE + (code - 0x61)); }
        else if(code >= 0x30 && code <= 0x39){ result += String.fromCodePoint(0x1D7EC + (code - 0x30)); }
        else{ result += char; }
    }
    return result;
}

const CONTENT_FORMAT_LABELS = {
    didyouknow: "💡 Did You Know?",
    story:      "📖 Behind the Story",
    funfact:    "🤯 Fun Fact",
    todayago:   "📅 Today, 40 Years Ago",
     choiceoftheday: "Choice of the Day"
};

const CHOICE_OF_THE_DAY_DEFAULT =
     "CHOICE OF THE DAY\n\n" +
     "Your pick, your song.\n" +
     "Late 70s, 80s, or best of 90s - doesn't matter.\n" +
     "Which track absolutely needs to be in our timeline?\n\n" +
     "Drop it in the comments - best picks get featured this week.\n\n" +
     "#70s #80s #90s #WeLove80s";

function contentBuildTweet(title, artist, year, format, researchText){
     if(format === "choiceoftheday" && (!researchText || researchText.trim() === "")){
              return CHOICE_OF_THE_DAY_DEFAULT;
     }
    const parts = [];
    if(title && artist){ parts.push(title + " - " + artist); }
    else if(title){ parts.push(title); }
    else if(artist){ parts.push(artist); }
    if(year){ parts.push("(" + year + ")"); }
    const mainLine = parts.join(" ");
    let tweet = mainLine ? contentToBold(mainLine) + "\n" + CONTENT_HASHTAGS : CONTENT_HASHTAGS;
    if(researchText && researchText.trim() !== ""){
        const label = CONTENT_FORMAT_LABELS[format] || "";
        tweet += label ? "\n" + label + " " + researchText.trim() : "\n" + researchText.trim();
    }
    return tweet;
}

function contentBuildPrompt(topic, format, title, artist, year){
    const subject = [title, artist, year ? "(" + year + ")" : ""].filter(Boolean).join(" ");
    const topicWord = {
        "Musik":     "the 80s song/artist",
        "Movie":     "the 80s movie",
        "TV Series": "the 80s TV series",
        "LP":        "the 80s album"
    }[topic] || "the 80s topic";
    const base = "Write in English, max 2 sentences, engaging and factual for a retro 80s fan account. ";
    if(format === "didyouknow"){
        return base + "Give me ONE surprising 'Did you know?' fact about " + topicWord + " " + subject + ". Start directly with the fact, no preamble.";
    }
    if(format === "story"){
        return base + "Tell the short story/background behind " + topicWord + " " + subject + ". Start directly, no preamble.";
    }
    if(format === "funfact"){
        return base + "Give me ONE fun, quirky fact about " + topicWord + " " + subject + ". Start directly, no preamble.";
    }
    if(format === "todayago"){
        return base + "Write a short 'Today, 40 years ago' post about " + topicWord + " " + subject + ". What happened on this day in music/entertainment history? Start directly, no preamble.";
    }
    return base + "Write one engaging sentence about " + topicWord + " " + subject + ".";
     if(format === "choiceoftheday"){
              return "Write in English, max 3 sentences, playful and inviting for a retro music fan account. Write a 'Choice of the Day' call-to-action inviting followers to name their own favorite song from late 70s, 80s, or 90s in the comments, no genre or era restriction. Mention the best picks get featured. Start directly, no preamble.";
     }
}

function contentGetGeminiKey(){
    return localStorage.getItem("missionGeminiAPIKey") || "";
}

async function contentAskGemini(){
    const statusEl  = document.getElementById("contentAIStatus");
    const promptField = document.getElementById("contentAIPrompt");
    const askButton = document.getElementById("contentAskAIButton");
    const apiKey = contentGetGeminiKey();
    if(!apiKey){
        if(statusEl){ statusEl.textContent = "Kein Gemini API-Key. Bitte in Settings eintragen."; }
        return;
    }
    let prompt = promptField ? promptField.value.trim() : "";
    if(!prompt){
        prompt = contentBuildPrompt(
            document.getElementById("contentTopic").value,
            document.getElementById("contentFormat").value,
            document.getElementById("contentTitle").value.trim(),
            document.getElementById("contentArtist").value.trim(),
            document.getElementById("contentYear").value.trim()
        );
        if(promptField){ promptField.value = prompt; }
    }
    if(statusEl){ statusEl.textContent = "Frage Gemini..."; }
    if(askButton){ askButton.disabled = true; }
    try{
        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",
            {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            }
        );
        if(!response.ok){
            const err = await response.json().catch(() => null);
            throw new Error((err && err.error && err.error.message) || ("HTTP " + response.status));
        }
        const data = await response.json();
        const reply = data.candidates &&
            data.candidates[0] &&
            data.candidates[0].content &&
            data.candidates[0].content.parts &&
            data.candidates[0].content.parts[0] &&
            data.candidates[0].content.parts[0].text
            ? data.candidates[0].content.parts[0].text.trim() : "";
        if(!reply){ throw new Error("Leere Antwort erhalten."); }
        const tweet = contentBuildTweet(
            document.getElementById("contentTitle").value.trim(),
            document.getElementById("contentArtist").value.trim(),
            document.getElementById("contentYear").value.trim(),
            document.getElementById("contentFormat").value,
            reply
        );
        document.getElementById("contentOutput").value = tweet;
        if(statusEl){ statusEl.textContent = "Antwort erhalten & in Vorschau eingefügt. ✅"; }
    }
    catch(error){
        console.error("Gemini Fehler:", error);
        if(statusEl){ statusEl.textContent = "Fehler: " + error.message; }
    }
    finally{
        if(askButton){ askButton.disabled = false; }
    }
}

function contentGenerate(){
    const title  = document.getElementById("contentTitle").value.trim();
    const artist = document.getElementById("contentArtist").value.trim();
    const year   = document.getElementById("contentYear").value.trim();
    const format = document.getElementById("contentFormat").value;
    document.getElementById("contentOutput").value = contentBuildTweet(title, artist, year, format, "");
}

function contentPostToArchive(mode, scheduledFor){
    const text     = document.getElementById("contentOutput").value.trim();
    const statusEl = document.getElementById("contentPostStatus");
    if(text === ""){
        if(statusEl){ statusEl.textContent = "Kein Tweet vorhanden – bitte erst Vorschau erzeugen."; }
        return false;
    }
    const title  = document.getElementById("contentTitle").value.trim();
    const artist = document.getElementById("contentArtist").value.trim();
    const topic  = document.getElementById("contentTopic").value;
    const song   = (title && artist) ? (title + " - " + artist) : (title || artist);
    const now    = new Date().toISOString();
    const post   = {
        id: Date.now(), createdAt: now, category: topic, text: text, song: song,
        postMode: mode,
        scheduledFor: mode === "scheduled" ? scheduledFor : null,
        publishedAt:  mode === "live" ? now : null,
        archivedAt: now
    };
    let archive = [];
    try{ const saved = localStorage.getItem("missionArchive"); archive = saved ? JSON.parse(saved) : []; }
    catch(e){ archive = []; }
    archive.push(post);
    localStorage.setItem("missionArchive", JSON.stringify(archive));
    if(window.planner){ window.planner.archive = archive; }
    contentResetFields();
    if(statusEl){
        statusEl.textContent = mode === "live"
            ? "✅ Als LIVE gepostet ins Archiv übernommen."
            : "🕐 Als ZEITVERSETZT geplant ins Archiv übernommen.";
    }
    if(typeof window.renderArchiveList === "function"){ window.renderArchiveList(); }
    if(typeof window.renderDashboardHistory === "function"){ window.renderDashboardHistory(); }
    return true;
}

function contentResetFields(){
    ["contentTitle","contentArtist","contentYear","contentAIPrompt","contentOutput"].forEach(id => {
        const el = document.getElementById(id);
        if(el){ el.value = ""; }
    });
    const wrap = document.getElementById("contentScheduleWrap");
    if(wrap){ wrap.style.display = "none"; }
    const inp = document.getElementById("contentScheduleInput");
    if(inp){ inp.value = ""; }
    const ai = document.getElementById("contentAIStatus");
    if(ai){ ai.textContent = ""; }
    const promptField = document.getElementById("contentAIPrompt");
    if(promptField){ delete promptField.dataset.touched; }
}

function initContentPage(){

    function refreshPrompt(){
        const promptField = document.getElementById("contentAIPrompt");
        if(!promptField || promptField.dataset.touched){ return; }
        promptField.value = contentBuildPrompt(
            document.getElementById("contentTopic").value,
            document.getElementById("contentFormat").value,
            document.getElementById("contentTitle").value.trim(),
            document.getElementById("contentArtist").value.trim(),
            document.getElementById("contentYear").value.trim()
        );
    }

    function updateWikimediaLink(){
        const link = document.getElementById("contentWikimediaButton");
        if(!link){ return; }
        const title  = document.getElementById("contentTitle")  ? document.getElementById("contentTitle").value.trim()  : "";
        const artist = document.getElementById("contentArtist") ? document.getElementById("contentArtist").value.trim() : "";
        const year   = document.getElementById("contentYear")   ? document.getElementById("contentYear").value.trim()   : "";
        const query  = [title, artist, year].filter(Boolean).join(" ");
        link.href = query
            ? "https://commons.wikimedia.org/w/index.php?search=" + encodeURIComponent(query) + "&title=Special:MediaSearch&type=image"
            : "https://commons.wikimedia.org/wiki/Special:MediaSearch";
    }

    ["contentTopic","contentFormat","contentTitle","contentArtist","contentYear"].forEach(id => {
        const el = document.getElementById(id);
        if(el){
            el.addEventListener("input",  refreshPrompt);
            el.addEventListener("change", refreshPrompt);
            if(["contentTitle","contentArtist","contentYear"].includes(id)){
                el.addEventListener("input", updateWikimediaLink);
            }
        }
    });

    const promptField = document.getElementById("contentAIPrompt");
    if(promptField){ promptField.addEventListener("input", () => { promptField.dataset.touched = "1"; }); }

    const askButton = document.getElementById("contentAskAIButton");
    if(askButton){ askButton.addEventListener("click", contentAskGemini); }

    const genButton = document.getElementById("contentGenerateButton");
    if(genButton){ genButton.addEventListener("click", contentGenerate); }

    const copyButton = document.getElementById("contentCopyButton");
    if(copyButton){
        copyButton.addEventListener("click", () => {
            const output   = document.getElementById("contentOutput");
            const statusEl = document.getElementById("contentCopyStatus");
            if(output && output.value.trim() !== ""){
                navigator.clipboard.writeText(output.value)
                    .then(()  => { if(statusEl){ statusEl.textContent = "In Zwischenablage kopiert. 📋"; } })
                    .catch(() => { output.select(); if(statusEl){ statusEl.textContent = "Bitte manuell kopieren (⌘+C)."; } });
            }
            else{ if(statusEl){ statusEl.textContent = "Kein Tweet zum Kopieren."; } }
        });
    }

    const liveButton = document.getElementById("contentLiveButton");
    if(liveButton){ liveButton.addEventListener("click", () => { contentPostToArchive("live", null); }); }

    const schedButton = document.getElementById("contentScheduledButton");
    if(schedButton){
        schedButton.addEventListener("click", () => {
            const wrap = document.getElementById("contentScheduleWrap");
            if(wrap){ wrap.style.display = wrap.style.display === "none" ? "flex" : "none"; }
        });
    }

    const schedConfirm = document.getElementById("contentScheduleConfirm");
    if(schedConfirm){
        schedConfirm.addEventListener("click", () => {
            const input    = document.getElementById("contentScheduleInput");
            const statusEl = document.getElementById("contentPostStatus");
            if(!input || !input.value){
                if(statusEl){ statusEl.textContent = "Bitte Datum & Uhrzeit wählen."; }
                return;
            }
            contentPostToArchive("scheduled", new Date(input.value).toISOString());
        });
    }

    updateWikimediaLink();
}

document.addEventListener("DOMContentLoaded", initContentPage);
window.renderArchiveList = window.renderArchiveList || null;
