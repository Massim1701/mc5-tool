/* ==========================================================
   GOOGLE DRIVE SYNC

   Direkte Anbindung ans Google Drive des Nutzers über Google
   Identity Services (GIS). Läuft nur, wenn die Seite über eine
   echte https://-Adresse aufgerufen wird (GitHub Pages), nicht
   über file:// - Google erlaubt OAuth im Browser nur für
   registrierte https-Ursprünge.

   Scope: drive.file - die App sieht NUR Dateien, die sie selbst
   angelegt hat, nicht den Rest des Google Drive.
========================================================== */

const DRIVE_CLIENT_ID = "553220051745-9p3vcfmf1k01klobb4gm478ib0q4skgl.apps.googleusercontent.com";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const DRIVE_FOLDER_NAME = "Mission Control Sync";
const DRIVE_FILE_NAME = "mission-control-latest.json";

const DRIVE_TOKEN_KEY = "missionDriveToken";
const DRIVE_TOKEN_EXPIRY_KEY = "missionDriveTokenExpiry";
const DRIVE_FOLDER_ID_KEY = "missionDriveFolderId";
const DRIVE_FILE_ID_KEY = "missionDriveFileId";

let driveTokenClient = null;

function getStoredAccessToken(){
    const token = localStorage.getItem(DRIVE_TOKEN_KEY);
    const expiry = Number(localStorage.getItem(DRIVE_TOKEN_EXPIRY_KEY) || 0);
    if(token && Date.now() < expiry){
        return token;
    }
    return null;
}

function storeAccessToken(token, expiresInSeconds){
    localStorage.setItem(DRIVE_TOKEN_KEY, token);
    localStorage.setItem(DRIVE_TOKEN_EXPIRY_KEY, String(Date.now() + (expiresInSeconds * 1000) - 60000));
}

function setDriveStatus(text){
    const el = document.getElementById("driveSyncStatus");
    if(el){ el.textContent = text; }
}

function updateDriveConnectionUI(){
    const connectButton = document.getElementById("driveConnectButton");
    const syncButton = document.getElementById("driveSyncButton");
    const connected = !!getStoredAccessToken();

    if(connectButton){
        connectButton.textContent = connected ? "✅ Mit Google Drive verbunden" : "🔗 Mit Google Drive verbinden";
    }
    if(syncButton){
        syncButton.disabled = !connected;
    }
}

/* --------------------------------------------------------
   Google Identity Services: Token anfordern
-------------------------------------------------------- */

function ensureTokenClient(callback){

    if(typeof google === "undefined" || !google.accounts || !google.accounts.oauth2){
        setDriveStatus("Google-Anmeldedienst konnte nicht geladen werden. Läuft die Seite über https://?");
        return;
    }

    if(!driveTokenClient){
        driveTokenClient = google.accounts.oauth2.initTokenClient({
            client_id: DRIVE_CLIENT_ID,
            scope: DRIVE_SCOPE,
            callback: (response) => {
                if(response && response.access_token){
                    storeAccessToken(response.access_token, response.expires_in || 3600);
                    updateDriveConnectionUI();
                    if(callback){ callback(response.access_token); }
                }
                else{
                    setDriveStatus("Verbindung fehlgeschlagen - bitte nochmal versuchen.");
                }
            }
        });
    }

    driveTokenClient.requestAccessToken({ prompt: getStoredAccessToken() ? "" : "consent" });

}

/* --------------------------------------------------------
   Drive API: Ordner finden/anlegen, Datei finden/hochladen
-------------------------------------------------------- */

async function driveApiFetch(url, token, options){
    const response = await fetch(url, {
        ...options,
        headers: {
            ...(options && options.headers ? options.headers : {}),
            "Authorization": "Bearer " + token
        }
    });
    if(!response.ok){
        const errText = await response.text();
        throw new Error("Drive API Fehler (" + response.status + "): " + errText);
    }
    return response.json();
}

async function findOrCreateFolder(token){

    let folderId = localStorage.getItem(DRIVE_FOLDER_ID_KEY);
    if(folderId){
        return folderId;
    }

    const query = encodeURIComponent(
        "name = '" + DRIVE_FOLDER_NAME + "' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    );
    const searchResult = await driveApiFetch(
        "https://www.googleapis.com/drive/v3/files?q=" + query + "&fields=files(id,name)",
        token, { method: "GET" }
    );

    if(searchResult.files && searchResult.files.length > 0){
        folderId = searchResult.files[0].id;
    }
    else{
        const created = await driveApiFetch(
            "https://www.googleapis.com/drive/v3/files",
            token,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: DRIVE_FOLDER_NAME,
                    mimeType: "application/vnd.google-apps.folder"
                })
            }
        );
        folderId = created.id;
    }

    localStorage.setItem(DRIVE_FOLDER_ID_KEY, folderId);
    return folderId;

}

async function findExistingFileId(token, folderId){

    let fileId = localStorage.getItem(DRIVE_FILE_ID_KEY);
    if(fileId){
        return fileId;
    }

    const query = encodeURIComponent(
        "name = '" + DRIVE_FILE_NAME + "' and '" + folderId + "' in parents and trashed = false"
    );
    const searchResult = await driveApiFetch(
        "https://www.googleapis.com/drive/v3/files?q=" + query + "&fields=files(id,name)",
        token, { method: "GET" }
    );

    if(searchResult.files && searchResult.files.length > 0){
        fileId = searchResult.files[0].id;
        localStorage.setItem(DRIVE_FILE_ID_KEY, fileId);
        return fileId;
    }

    return null;

}

function collectMissionDataForDrive(){
    const data = {};
    for(let i = 0; i < localStorage.length; i++){
        const key = localStorage.key(i);
        if(key && key.indexOf("mission") === 0){
            data[key] = localStorage.getItem(key);
        }
    }
    return data;
}

async function uploadBackupToDrive(token){

    const folderId = await findOrCreateFolder(token);
    const existingFileId = await findExistingFileId(token, folderId);

    const backup = {
        app: "Mission Control 5.1",
        exportedAt: new Date().toISOString(),
        data: collectMissionDataForDrive()
    };

    const jsonBlob = new Blob([JSON.stringify(backup)], { type: "application/json" });

    const metadata = existingFileId
        ? { name: DRIVE_FILE_NAME }
        : { name: DRIVE_FILE_NAME, parents: [folderId] };

    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    form.append("file", jsonBlob);

    const url = existingFileId
        ? "https://www.googleapis.com/upload/drive/v3/files/" + existingFileId + "?uploadType=multipart"
        : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

    const response = await fetch(url, {
        method: existingFileId ? "PATCH" : "POST",
        headers: { "Authorization": "Bearer " + token },
        body: form
    });

    if(!response.ok){
        const errText = await response.text();
        throw new Error("Upload fehlgeschlagen (" + response.status + "): " + errText);
    }

    const result = await response.json();
    if(!existingFileId && result.id){
        localStorage.setItem(DRIVE_FILE_ID_KEY, result.id);
    }

    return result;

}

/* --------------------------------------------------------
   Bootstrap
-------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {

    const connectButton = document.getElementById("driveConnectButton");
    const syncButton = document.getElementById("driveSyncButton");

    updateDriveConnectionUI();

    if(connectButton){
        connectButton.addEventListener("click", () => {
            setDriveStatus("Verbindung wird angefragt...");
            ensureTokenClient();
        });
    }

    if(syncButton){
        syncButton.addEventListener("click", async () => {

            const token = getStoredAccessToken();
            if(!token){
                setDriveStatus("Erst mit Google Drive verbinden.");
                return;
            }

            setDriveStatus("Synchronisiere...");
            syncButton.disabled = true;

            try{
                await uploadBackupToDrive(token);
                const now = new Date();
                setDriveStatus("✅ Synchronisiert um " + now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr.");
            }
            catch(err){
                console.error(err);
                setDriveStatus("Fehler beim Synchronisieren - siehe Konsole (F12).");
            }
            finally{
                syncButton.disabled = false;
            }

        });
    }

});
