import "dotenv/config";
import { MemWal } from "@mysten-incubation/memwal";

async function main() {
  const prefix = process.argv[2]; // "wallet", "circle", or a full namespace like "wallet:0x..."
  if (!prefix) {
    console.log("Usage: npx tsx list-memories.ts <prefix>");
    console.log("  e.g. npx tsx list-memories.ts wallet");
    console.log("       npx tsx list-memories.ts circle");
    console.log("       npx tsx list-memories.ts wallet:0x71C...");
    process.exit(1);
  }

  const memwal = MemWal.create({
    key: process.env.MEMWAL_PRIVATE_KEY!,
    accountId: process.env.MEMWAL_ACCOUNT_ID!,
    serverUrl: process.env.MEMWAL_SERVER_URL,
    namespace: prefix,
  });

  // If a full namespace was given (contains ":"), query it directly.
  // Otherwise, use broad queries to surface memories across all sub-namespaces.
  const isExact = prefix.includes(":");
  const queries = isExact
    ? ["flag", "scam", "rug", "honeypot", "suspicious", "warning"]
    : [
        "flag",
        "scam",
        "rug pull",
        "honeypot",
        "suspicious",
        "warning",
        "wallet",
        "address",
        "drain",
        "phishing",
      ];

  const seen = new Set<string>();

  console.log(`\n=== Memories for namespace prefix: ${prefix} ===\n`);

  for (const q of queries) {
    try {
      const result = await memwal.recall({ query: q, limit: 50 });
      for (const r of result.results) {
        const blobId = (r as any).blob_id ?? "(no blob_id)";
        const key = `${r.text}::${blobId}`;
        if (seen.has(key)) continue;
        seen.add(key);

        console.log(`  Text:    ${r.text}`);
        console.log(`  Blob ID: ${blobId}`);
        console.log(`  ─────────────────────────────────────`);
      }
    } catch (err: any) {
      // namespace might not exist yet — that's fine
      if (!/not found/i.test(err.message)) {
        console.error(`  (query "${q}" failed: ${err.message})`);
      }
    }
  }

  console.log(`\nTotal unique memories found: ${seen.size}\n`);
}

main().catch((err) => console.error("ERROR:", err));
