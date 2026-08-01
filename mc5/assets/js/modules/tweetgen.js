/*
====================================================

 We ❤️ 80s Mission Control 5.1

 TWEET GENERATOR MODULE

 Erzeugt Tweet-Text mit festen Hashtags aus
 Songtitel, Interpret und Jahr.

====================================================
*/

const FIXED_HASHTAGS = "#80s #80er #Retro #WeLove80s";

// Merkt sich, zu welchem Planner-Post der aktuelle Tweet gehört
// (gesetzt, wenn der Tweet Generator über "Weiter" aus dem Planner
// geöffnet wurde) - nötig, um nach dem Kopieren archivieren zu können.
let currentPlannerPostId = null;

const CONTENT_TYPE_LABELS = {
    didyouknow: "💡 Did You Know?",
    story: "📖 Story behind..."
};

/**
 * Wandelt normalen Text in Unicode-Fettschrift um (𝗔𝗕𝗖 / 𝗮𝗯𝗰 / 𝟬𝟭𝟮).
 * Diese Zeichen werden auf X/Twitter fett dargestellt, da die Plattform
 * kein echtes Formatierungs-Markup unterstützt. Zeichen ohne Fett-Variante
 * (z.B. Bindestriche, Klammern, Umlaute) bleiben unverändert.
 */
function toBoldUnicode(text){

    let result = "";

    for(const char of text){

        const code = char.codePointAt(0);

        // A-Z -> Mathematical Sans-Serif Bold (U+1D5D4 ff.)
        if(code >= 0x41 && code <= 0x5A){
            result += String.fromCodePoint(0x1D5D4 + (code - 0x41));
        }
        // a-z -> (U+1D5EE ff.)
        else if(code >= 0x61 && code <= 0x7A){
            result += String.fromCodePoint(0x1D5EE + (code - 0x61));
        }
        // 0-9 -> (U+1D7EC ff.)
        else if(code >= 0x30 && code <= 0x39){
            result += String.fromCodePoint(0x1D7EC + (code - 0x30));
        }
        else{
            result += char;
        }

    }

    return result;

}

function buildTweetText(title, artist, year, contentType, researchText){

    const parts = [];

    if(title && artist){
        parts.push(title + " - " + artist);
    }
    else if(title){
        parts.push(title);
    }
    else if(artist){
        parts.push(artist);
    }

    if(year){
        parts.push("(" + year + ")");
    }

    const mainLine = parts.join(" ");

    // Erste Zeile fett + direkt darunter die Hashtags
    const blocks = [];

    if(mainLine){
        blocks.push(toBoldUnicode(mainLine) + "\n" + FIXED_HASHTAGS);
    }
    else{
        blocks.push(FIXED_HASHTAGS);
    }

    // Danach erst der Zusatzinhalt (Did You Know / Story)
    if(contentType && contentType !== "none" && researchText && researchText.trim() !== ""){

        const label = CONTENT_TYPE_LABELS[contentType] || "";

        blocks.push((label ? label + "\n" : "") + researchText.trim());

    }

    return blocks.join("\n\n");

}

function generateTweetFromFields(){

    const title = document.getElementById("tweetgenTitle").value.trim();
    const artist = document.getElementById("tweetgenArtist").value.trim();
    const year = document.getElementById("tweetgenYear").value.trim();
    const contentType = document.getElementById("tweetgenContentType").value;
    const researchText = document.getElementById("tweetgenResearchText").value;

    const output = document.getElementById("tweetgenOutput");

    if(!title && !artist){

        if(output){
            output.value = "Bitte mindestens Titel oder Künstler/Show eintragen.";
        }

        return;

    }

    const tweet = buildTweetText(title, artist, year, contentType, researchText);

    if(output){
        output.value = tweet;
    }

}

function updateResearchVisibility(){

    const contentType = document.getElementById("tweetgenContentType").value;
    const wrap = document.getElementById("tweetgenResearchWrap");

    if(wrap){
        wrap.style.display = contentType === "none" ? "none" : "block";
    }

    updateAIPromptDefault();

}

function updateAIPromptDefault(){

    const contentType = document.getElementById("tweetgenContentType").value;
    const promptField = document.getElementById("tweetgenAIPrompt");

    if(!promptField || contentType === "none"){
        return;
    }

    const title = document.getElementById("tweetgenTitle").value.trim();
    const artist = document.getElementById("tweetgenArtist").value.trim();
    const year = document.getElementById("tweetgenYear").value.trim();

    const topicDescription = [title, artist ? "(" + artist + ")" : "", year ? "(" + year + ")" : ""]
        .filter(Boolean)
        .join(" ");

    let defaultPrompt;

    if(contentType === "didyouknow"){

        defaultPrompt = "Give me one short, verifiably true \"Did you know?\" fact about " +
            topicDescription + " (an 80s song, artist, TV show or movie). Maximum 200 characters, " +
            "in English, suitable for a tweet. Output only the fact, no introduction.";

    }
    else{

        defaultPrompt = "Tell me briefly and entertainingly the background story or an interesting " +
            "anecdote about " + topicDescription + " (an 80s song, artist, TV show or movie). " +
            "Maximum 250 characters, in English, suitable for a tweet. Output only the text, no introduction.";

    }

    // Nur automatisch befüllen, wenn das Feld noch leer ist oder sich das Thema geändert hat
    promptField.value = defaultPrompt;

}

function getGeminiKey(){

    return localStorage.getItem("missionGeminiAPIKey") || "";

}

async function askGemini(){

    const statusEl = document.getElementById("tweetgenAIStatus");
    const promptField = document.getElementById("tweetgenAIPrompt");
    const researchField = document.getElementById("tweetgenResearchText");
    const askButton = document.getElementById("tweetgenAskAIButton");

    const apiKey = getGeminiKey();

    if(!apiKey){

        if(statusEl){
            statusEl.textContent = "Kein Gemini API-Key hinterlegt. Bitte in Settings eintragen.";
        }

        return;

    }

    const prompt = promptField ? promptField.value.trim() : "";

    if(!prompt){

        if(statusEl){
            statusEl.textContent = "Bitte einen Prompt eingeben.";
        }

        return;

    }

    if(statusEl){
        statusEl.textContent = "Frage Gemini...";
    }

    if(askButton){
        askButton.disabled = true;
    }

    try{

        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",
            {

                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": apiKey
                },

                body: JSON.stringify({
                    contents: [
                        { parts: [{ text: prompt }] }
                    ]
                })

            }
        );

        if(!response.ok){

            const errorData = await response.json().catch(() => null);

            throw new Error(
                (errorData && errorData.error && errorData.error.message) ||
                ("HTTP " + response.status)
            );

        }

        const data = await response.json();

        const reply = data.candidates &&
            data.candidates[0] &&
            data.candidates[0].content &&
            data.candidates[0].content.parts &&
            data.candidates[0].content.parts[0] &&
            data.candidates[0].content.parts[0].text
            ? data.candidates[0].content.parts[0].text.trim()
            : "";

        if(!reply){
            throw new Error("Leere Antwort erhalten.");
        }

        if(researchField){
            researchField.value = reply;
        }

        if(statusEl){
            statusEl.textContent = "Antwort erhalten.";
        }

    }
    catch(error){

        console.error("Gemini Fehler:", error);

        if(statusEl){
            statusEl.textContent = "Fehler: " + error.message;
        }

    }
    finally{

        if(askButton){
            askButton.disabled = false;
        }

    }

}

/**
 * Wird vom Planner aufgerufen, wenn ein fertiger Post auf
 * "Weiter" geklickt wird. Wechselt zu AI Studio und befüllt
 * den Tweet Generator mit den Song-Daten des Posts.
 */
function resetTweetGenerator(){

    currentPlannerPostId = null;

    const ids = [
        "tweetgenTitle", "tweetgenArtist", "tweetgenYear",
        "tweetgenAIPrompt", "tweetgenResearchText", "tweetgenOutput"
    ];

    ids.forEach(id => {
        const el = document.getElementById(id);
        if(el){
            el.value = "";
        }
    });

    const contentTypeSelect = document.getElementById("tweetgenContentType");
    if(contentTypeSelect){
        contentTypeSelect.value = "none";
    }

    ["tweetgenAIStatus", "tweetgenCopyStatus"].forEach(id => {
        const el = document.getElementById(id);
        if(el){
            el.textContent = "";
        }
    });

    ["tweetgenArchiveButton", "tweetgenFinishButton"].forEach(id => {
        const el = document.getElementById(id);
        if(el){
            el.style.display = "none";
        }
    });

    updateResearchVisibility();

}

function openTweetGenerator(post){

    if(typeof window.loadTab === "function"){
        window.loadTab("ai");
    }

    currentPlannerPostId = post.id;

    const titleField = document.getElementById("tweetgenTitle");
    const artistField = document.getElementById("tweetgenArtist");
    const yearField = document.getElementById("tweetgenYear");
    const contentTypeSelect = document.getElementById("tweetgenContentType");
    const researchField = document.getElementById("tweetgenResearchText");
    const aiStatusEl = document.getElementById("tweetgenAIStatus");
    const archiveButton = document.getElementById("tweetgenArchiveButton");

    if(titleField){
        titleField.value = post.songTitle || post.song || "";
    }

    if(artistField){
        artistField.value = post.artist || "";
    }

    if(yearField){
        yearField.value = post.year || "";
    }

    if(contentTypeSelect){
        contentTypeSelect.value = "none";
    }

    if(researchField){
        researchField.value = "";
    }

    if(aiStatusEl){
        aiStatusEl.textContent = "";
    }

    if(archiveButton){
        archiveButton.style.display = "none";
    }

    updateResearchVisibility();

    generateTweetFromFields();

}

window.openTweetGenerator = openTweetGenerator;

/* ----------------------------------------------------------
   Bootstrap
---------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {

    const generateButton = document.getElementById("tweetgenGenerateButton");
    const copyButton = document.getElementById("tweetgenCopyButton");
    const contentTypeSelect = document.getElementById("tweetgenContentType");
    const askAIButton = document.getElementById("tweetgenAskAIButton");
    const titleField = document.getElementById("tweetgenTitle");
    const artistField = document.getElementById("tweetgenArtist");
    const yearField = document.getElementById("tweetgenYear");

    if(generateButton){

        generateButton.addEventListener("click", generateTweetFromFields);

    }

    if(contentTypeSelect){

        contentTypeSelect.addEventListener("change", updateResearchVisibility);
        updateResearchVisibility();

    }

    // Prompt-Vorschlag aktualisieren, wenn sich Song-Daten ändern
    [titleField, artistField, yearField].forEach(field => {

        if(field){
            field.addEventListener("input", updateAIPromptDefault);
        }

    });

    if(askAIButton){
        askAIButton.addEventListener("click", askGemini);
    }

    /* -----------------------------
       Settings: Gemini API-Key
    ----------------------------- */

    const settingsKeyInput = document.getElementById("settingsGeminiKey");
    const settingsSaveButton = document.getElementById("settingsSaveKeyButton");
    const settingsKeyStatus = document.getElementById("settingsKeyStatus");

    if(settingsKeyInput){

        const existingKey = getGeminiKey();

        if(existingKey){
            settingsKeyInput.value = existingKey;
        }

    }

    if(settingsSaveButton){

        settingsSaveButton.addEventListener("click", () => {

            const key = settingsKeyInput ? settingsKeyInput.value.trim() : "";

            localStorage.setItem("missionGeminiAPIKey", key);

            if(settingsKeyStatus){
                settingsKeyStatus.textContent = key
                    ? "API-Key gespeichert."
                    : "API-Key entfernt.";
            }

        });

    }

    if(copyButton){

        copyButton.addEventListener("click", () => {

            const output = document.getElementById("tweetgenOutput");
            const statusEl = document.getElementById("tweetgenCopyStatus");

            if(!output || !output.value){

                if(statusEl){
                    statusEl.textContent = "Erst einen Tweet generieren.";
                }

                return;

            }

            const finish = (success) => {

                if(statusEl){
                    statusEl.textContent = success
                        ? "In Zwischenablage kopiert."
                        : "Kopieren fehlgeschlagen, bitte manuell markieren.";
                }

                const archiveButton = document.getElementById("tweetgenArchiveButton");

                if(archiveButton){

                    archiveButton.style.display =
                        (success && currentPlannerPostId !== null) ? "inline-block" : "none";

                }

                // Geplant-für-Feld nur zeigen, wenn ein Planner-Post archiviert werden kann
                const scheduleWrap = document.getElementById("tweetgenScheduleWrap");

                if(scheduleWrap){

                    scheduleWrap.style.display =
                        (success && currentPlannerPostId !== null) ? "block" : "none";

                }

                const finishButton = document.getElementById("tweetgenFinishButton");

                if(finishButton){

                    finishButton.style.display = success ? "inline-block" : "none";

                }

            };

            if(navigator.clipboard && navigator.clipboard.writeText){

                navigator.clipboard.writeText(output.value)
                    .then(() => finish(true))
                    .catch(() => {

                        // Fallback für ältere Browser / file://-Kontext
                        output.select();

                        try{
                            const success = document.execCommand("copy");
                            finish(success);
                        }
                        catch(error){
                            finish(false);
                        }

                    });

            }
            else{

                output.select();

                try{
                    const success = document.execCommand("copy");
                    finish(success);
                }
                catch(error){
                    finish(false);
                }

            }

        });

    }

    const archiveButton = document.getElementById("tweetgenArchiveButton");

    if(archiveButton){

        archiveButton.addEventListener("click", () => {

            if(currentPlannerPostId === null){
                return;
            }

            // Geplant-für-Zeitpunkt auslesen (optional)
            const scheduleInput = document.getElementById("tweetgenScheduleInput");
            const scheduledFor = (scheduleInput && scheduleInput.value)
                ? new Date(scheduleInput.value).toISOString()
                : null;

            if(window.planner && typeof window.planner.archivePost === "function"){
                window.planner.archivePost(currentPlannerPostId, scheduledFor);
            }

            const statusEl = document.getElementById("tweetgenCopyStatus");

            if(statusEl){
                statusEl.textContent = "Post archiviert - kein Doppelposting mehr möglich.";
            }

            currentPlannerPostId = null;
            archiveButton.style.display = "none";

            const scheduleWrap = document.getElementById("tweetgenScheduleWrap");
            if(scheduleWrap){
                scheduleWrap.style.display = "none";
            }
            if(scheduleInput){
                scheduleInput.value = "";
            }

        });

    }

    const finishButton = document.getElementById("tweetgenFinishButton");

    if(finishButton){

        finishButton.addEventListener("click", () => {

            resetTweetGenerator();

            if(typeof window.loadTab === "function"){
                window.loadTab("dashboard");
            }

        });

    }

    const parkButton = document.getElementById("tweetgenParkButton");

    if(parkButton){

        parkButton.addEventListener("click", () => {

            const titleEl = document.getElementById("tweetgenTitle");
            const artistEl = document.getElementById("tweetgenArtist");
            const yearEl = document.getElementById("tweetgenYear");
            const outputEl = document.getElementById("tweetgenOutput");

            const title = titleEl ? titleEl.value.trim() : "";
            const artist = artistEl ? artistEl.value.trim() : "";
            const year = yearEl ? yearEl.value.trim() : "";
            const text = outputEl ? outputEl.value.trim() : "";

            // "Was fehlt"-Checkboxen
            const todo = [];
            if(document.getElementById("parkNeedVideo") && document.getElementById("parkNeedVideo").checked){
                todo.push("video");
            }
            if(document.getElementById("parkNeedText") && document.getElementById("parkNeedText").checked){
                todo.push("text");
            }
            if(document.getElementById("parkNeedTiming") && document.getElementById("parkNeedTiming").checked){
                todo.push("timing");
            }

            const noteEl = document.getElementById("parkNote");
            const parkNote = noteEl ? noteEl.value.trim() : "";

            const statusEl = document.getElementById("tweetgenParkStatus");

            // Mindestens ein Inhalt nötig
            if(title === "" && artist === "" && text === ""){

                if(statusEl){
                    statusEl.textContent = "Nichts zum Parken – bitte erst einen Tweet erstellen.";
                }

                return;

            }

            const song = (title && artist) ? (title + " - " + artist) : (title || artist);

            if(window.planner && typeof window.planner.parkPost === "function"){

                window.planner.parkPost({
                    category: "Musikvideo",
                    text: text,
                    song: song,
                    songTitle: title,
                    artist: artist,
                    year: year,
                    todo: todo,
                    parkNote: parkNote
                });

            }

            if(statusEl){
                statusEl.textContent = "Zurück in den Planner geparkt (Status: In Bearbeitung).";
            }

            // Felder leeren und zum Planner wechseln
            resetTweetGenerator();

            const parkNoteReset = document.getElementById("parkNote");
            if(parkNoteReset){ parkNoteReset.value = ""; }
            ["parkNeedVideo", "parkNeedText", "parkNeedTiming"].forEach(id => {
                const cb = document.getElementById(id);
                if(cb){ cb.checked = false; }
            });

            if(typeof window.loadTab === "function"){
                window.loadTab("planner");
            }

        });

    }

});
