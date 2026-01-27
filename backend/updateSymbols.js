import fs from "fs";
import https from "https";
import csv from "csv-parser";
import "dotenv/config";

const CSV_URL = process.env.CSVURL;   // Google Sheet CSV export link
const OUTPUT_FILE = "symbols.json";

if (!CSV_URL) {
  throw new Error("CSVURL env variable missing");
}


// ================= FETCH CSV STREAM =================

function fetchCSV(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {

      // Follow redirects (Google Sheets uses them)
      if ([301, 302, 307, 308].includes(res.statusCode)) {
        return fetchCSV(res.headers.location)
          .then(resolve)
          .catch(reject);
      }

      if (res.statusCode !== 200) {
        reject(new Error(`CSV fetch failed: ${res.statusCode}`));
        return;
      }

      resolve(res);

    }).on("error", reject);
  });
}


// ================= MAIN =================

async function run() {

  console.log("Fetching sheet CSV...");

  const stream = await fetchCSV(CSV_URL);

  const symbols = [];

  stream
    .pipe(csv())
    .on("data", (row) => {

      const symbol = row.tradingsymbol?.trim();
      const exchange = row.exchange?.trim();
      const name = row.name?.trim();
      const token = row.instrument_token?.trim();

      if (!symbol || !exchange || !token) return;

      symbols.push({
        symbol,
        exchange,
        name,
        token
      });
    })
    .on("end", () => {

      if (symbols.length === 0) {
        throw new Error("No symbols parsed — check sheet headers");
      }

      // Sort nicely (by exchange then symbol)
      symbols.sort((a, b) => {
        if (a.exchange !== b.exchange) {
          return a.exchange.localeCompare(b.exchange);
        }
        return a.symbol.localeCompare(b.symbol);
      });

      fs.writeFileSync(
        OUTPUT_FILE,
        JSON.stringify(symbols, null, 2)
      );

      console.log(`symbols.json updated (${symbols.length} entries)`);

      process.exit(0);
    })
    .on("error", (err) => {
      console.error(err);
      process.exit(1);
    });
}

run();
