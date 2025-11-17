import fs from "fs";
import { google } from "googleapis";

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const FOLDER_ID = process.env.FOLDER_ID; // Google Drive folder

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, "urn:ietf:wg:oauth:2.0:oob");
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const drive = google.drive({ version: "v3", auth: oauth2Client });
const youtube = google.youtube({ version: "v3", auth: oauth2Client });

async function main() {
  // 1. List file di Google Drive
  const list = await drive.files.list({
    q: `'${FOLDER_ID}' in parents and mimeType contains 'video/'`,
    fields: "files(id,name)"
  });

  if (!list.data.files.length) {
    console.log("No videos to upload");
    return;
  }

  const file = list.data.files[0];
  console.log("Uploading:", file.name);

  // 2. Download file ke /tmp
  const tempPath = `/tmp/${file.name}`;
  await new Promise(resolve => {
    drive.files.get({ fileId: file.id, alt: "media" }, { responseType: "stream" })
      .then(res => res.data.pipe(fs.createWriteStream(tempPath).on("finish", resolve)));
  });

  // 3. Upload ke YouTube
  const title = `Motivasi Hari Ini: ${file.name.replace(".mp4","")}`;
  const description = "Video harian.\n#motivation #quotes #fyp";
  const tags = ["motivation","quotes","fyp","harian","daily"];

  const res = await youtube.videos.insert({
    part: "snippet,status",
    requestBody: {
      snippet: { title, description, tags },
      status: { privacyStatus: "public" }
    },
    media: { body: fs.createReadStream(tempPath) }
  });

  console.log("Uploaded:", res.data.id);

  // 4. Pindah file ke folder uploaded (opsional)
  console.log("Done");
}

main().catch(console.error);
