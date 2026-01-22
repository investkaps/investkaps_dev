import fs from "fs";
import https from "https";
import csv from "csv-parser";

const CSV_URL = process.env.CSV_URL;
const TEMP_FILE = "temp.csv";

if (!CSV_URL) {
  throw new Error("CSV_URL environment variable is missing");
}

/**
 * Download CSV from Google Sheets
 * - Follows ALL redirects (301, 302, 307, 308)
 * - Sends User-Agent (required by Google)
 */
function downloadCSV(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0", // important
        "Accept": "text/csv,*/*"
      }
    };

    https.get(url, options, (res) => {

      // Handle redirects
      if ([301, 302, 307, 308].includes(res.statusCode)) {
        const nextUrl = res.headers.location;
        if (!nextUrl) {
          return reject(new Error("Redirect without location header"));
        }
        return downloadCSV(nextUrl).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        return reject(
          new Error(`CSV download failed with status ${res.statusCode}`)
        );
      }

      const file = fs.createWriteStream(TEMP_FILE);
      res.pipe(file);

      file.on("finish", () => file.close(resolve));
      file.on("error", reject);

    }).on("error", reject);
  });
}

async function run() {
  await downloadCSV(CSV_URL);

  const symbols = new Set();

  fs.createReadStream(TEMP_FILE)
    .pipe(csv())
    .on("data", (row) => {
      if (row.tradingsymbol) {
        symbols.add(row.tradingsymbol.trim());
      }
    })
    .on("end", () => {
      fs.unlinkSync(TEMP_FILE);

      if (symbols.size === 0) {
        throw new Error("No tradingsymbol values found");
      }

      fs.writeFileSync(
        "symbols.json",
        JSON.stringify([...symbols].sort(), null, 2)
      );

      console.log(`symbols.json updated (${symbols.size} symbols)`);
    })
    .on("error", (err) => {
      throw err;
    });
}

run();
