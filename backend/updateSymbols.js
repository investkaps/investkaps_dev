import "dotenv/config";
import fs from "fs";
import https from "https";
import csv from "csv-parser";

const CSV_URL = process.env.CSVURL;

if (!CSV_URL) {
  throw new Error("CSVURL environment variable is missing");
}

/**
 * Stream CSV directly from Google Sheets
 */
function streamCSV(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "text/csv,*/*"
      }
    };

    https.get(url, options, (res) => {

      // Follow redirects
      if ([301, 302, 307, 308].includes(res.statusCode)) {
        const nextUrl = res.headers.location;
        if (!nextUrl) return reject(new Error("Redirect without location"));
        return streamCSV(nextUrl).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        return reject(
          new Error(`CSV fetch failed with status ${res.statusCode}`)
        );
      }

      const items = [];

      res
        .pipe(csv())
        .on("data", (row) => {

          const symbol = row.tradingsymbol?.trim();
          const exchange = row.exchange?.trim();
          const name = row.name?.trim();

          if (symbol && exchange && name) {
            items.push({ exchange, symbol, name });
          }
        })
        .on("end", () => {

          if (items.length === 0) {
            return reject(
              new Error("No rows found (check column names)")
            );
          }

          // Remove duplicates
          const unique = new Map();

          for (const item of items) {
            unique.set(`${item.exchange}:${item.symbol}`, item);
          }

          const result = [...unique.values()].sort((a, b) =>
            a.symbol.localeCompare(b.symbol)
          );

          fs.writeFileSync(
            "symbols.json",
            JSON.stringify(result, null, 2)
          );

          console.log(`symbols.json updated (${result.length} items)`);

          resolve();
        })
        .on("error", reject);

    }).on("error", reject);
  });
}

async function run() {
  try {
    await streamCSV(CSV_URL);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
