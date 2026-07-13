
import "dotenv/config";
import { MemWal } from "@mysten-incubation/memwal";
import { generateText, isStepCount } from "ai";
import { tool } from "@ai-sdk/provider-utils";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";
import * as readline from "readline/promises";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config validation ──────────────────────────────────────────────

const required = (key: string): string => {
  const val = process.env[key];
  if (!val) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
  return val;
};

const openrouter = createOpenRouter({
  apiKey: required("OPENROUTER_API_KEY"),
});

const serverUrl = required("MEMWAL_SERVER_URL");
if (/staging/i.test(serverUrl)) {
  console.error(
    "⚠️  MEMWAL_SERVER_URL looks like a staging/testnet URL. Rugmind requires mainnet.\n" +
      "   Set it to https://relayer.memory.walrus.xyz for mainnet.",
  );
  process.exit(1);
}

// ── MemWal client ──────────────────────────────────────────────────

const memwal = MemWal.create({
  key: required("MEMWAL_PRIVATE_KEY"),
  accountId: required("MEMWAL_ACCOUNT_ID"),
  serverUrl,
  namespace: "rugmind",
});

// ── System prompt ──────────────────────────────────────────────────

const systemPrompt = readFileSync(
  join(__dirname, "prompt", "rugmind.prompt.md"),
  "utf-8",
);

// ── Retry helper ───────────────────────────────────────────────────

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (err: any) {
      if (i >= retries) throw err;
      const msg = err?.cause?.code || err?.message || "";
      if (/EAI_AGAIN|ENOTFOUND|ETIMEDOUT/.test(msg)) {
        console.log(`  ⚠️  Network issue (${msg}), retrying in 3s...`);
        await new Promise((r) => setTimeout(r, 3000));
      } else {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }
}

// ── Tool definitions ───────────────────────────────────────────────

const tools = {
  flag_wallet: tool({
    description:
      "Store a scam/rug flag for a specific wallet address. " +
      "Use when the user reports a wallet as suspicious, a rug-pull, honeypot, or scam.",
    inputSchema: z.object({
      address: z.string().describe("The wallet address to flag"),
      flag: z
        .string()
        .describe(
          "Detailed flag text: what happened, type of scam, source of info, date if known",
        ),
    }),
    execute: async ({ address, flag }) => {
      const ns = `wallet:${address}`;
      const text = `[FLAG] ${address} — ${flag}`;
      try {
        const job = await withRetry(() => memwal.remember(text, ns));
        const confirmation = await memwal.waitForRememberJob(job.job_id);
        const blobId = confirmation.blob_id ?? "(pending)";
        console.log(`\n📝 Written: ${ns} → blob ${blobId}`);
        return { status: "stored", namespace: ns, blob_id: blobId };
      } catch (err: any) {
        console.error(`\n❌ flag_wallet failed for ${ns}:`);
        console.error(`   Message: ${err.message}`);
        console.error(`   Cause: ${err.cause?.message || err.cause?.code || "none"}`);
        console.error(`   Full:`, err);
        return { status: "error", namespace: ns, error: err.message };
      }
    },
  }),

  check_wallet: tool({
    description:
      "Check whether a wallet address has any stored scam/rug flags. " +
      "Use BEFORE answering any question about a wallet's safety.",
    inputSchema: z.object({
      address: z.string().describe("The wallet address to check"),
      query: z
        .string()
        .describe(
          "Search query — e.g. 'scam', 'rug pull', or the address itself",
        ),
    }),
    execute: async ({ address, query }) => {
      const ns = `wallet:${address}`;
      try {
        const result = await withRetry(() =>
          memwal.recall({ query, namespace: ns, limit: 10 }),
        );
        console.log(`\n🔎 Recalled: ${ns}`);
        const memories = result.results.map((r: any) => ({
          text: r.text,
          blob_id: r.blob_id ?? "unknown",
        }));
        if (memories.length) {
          memories.forEach((m: any) =>
            console.log(`   - "${m.text}" (blob: ${m.blob_id})`),
          );
        } else {
          console.log("   (no flags found)");
        }
        return { namespace: ns, flags: memories };
      } catch (err: any) {
        console.error(`\n❌ check_wallet failed for ${ns}:`);
        console.error(`   Message: ${err.message}`);
        console.error(`   Cause: ${err.cause?.message || err.cause?.code || "none"}`);
        console.error(`   Full:`, err);
        return { namespace: ns, flags: [], error: err.message };
      }
    },
  }),

  flag_circle: tool({
    description:
      "Store a flag in a shared circle namespace. Circles are opt-in groups " +
      "where trusted users pool their wallet flags. Only create/write to a circle " +
      "when the user explicitly requests it.",
    inputSchema: z.object({
      circle: z.string().describe("Circle name (e.g. 'defi-watchers')"),
      flag: z
        .string()
        .describe("The flag text including wallet address and details"),
    }),
    execute: async ({ circle, flag }) => {
      const ns = `circle:${circle}`;
      try {
        const job = await withRetry(() => memwal.remember(flag, ns));
        const confirmation = await memwal.waitForRememberJob(job.job_id);
        const blobId = confirmation.blob_id ?? "(pending)";
        console.log(`\n📝 Written: ${ns} → blob ${blobId}`);
        return { status: "stored", namespace: ns, blob_id: blobId };
      } catch (err: any) {
        console.error(`\n❌ flag_circle failed for ${ns}:`);
        console.error(`   Message: ${err.message}`);
        console.error(`   Cause: ${err.cause?.message || err.cause?.code || "none"}`);
        console.error(`   Full:`, err);
        return { status: "error", namespace: ns, error: err.message };
      }
    },
  }),

  check_circle: tool({
    description:
      "Check a shared circle for any wallet flags. " +
      "Use when the user asks about circle intel or wants to see what a group has flagged.",
    inputSchema: z.object({
      circle: z.string().describe("Circle name"),
      query: z.string().describe("Search query"),
    }),
    execute: async ({ circle, query }) => {
      const ns = `circle:${circle}`;
      try {
        const result = await withRetry(() =>
          memwal.recall({ query, namespace: ns, limit: 10 }),
        );
        console.log(`\n🔎 Recalled: ${ns}`);
        const memories = result.results.map((r: any) => ({
          text: r.text,
          blob_id: r.blob_id ?? "unknown",
        }));
        if (memories.length) {
          memories.forEach((m: any) =>
            console.log(`   - "${m.text}" (blob: ${m.blob_id})`),
          );
        } else {
          console.log("   (no flags found)");
        }
        return { namespace: ns, flags: memories };
      } catch (err: any) {
        console.error(`\n❌ check_circle failed for ${ns}:`);
        console.error(`   Message: ${err.message}`);
        console.error(`   Cause: ${err.cause?.message || err.cause?.code || "none"}`);
        console.error(`   Full:`, err);
        return { namespace: ns, flags: [], error: err.message };
      }
    },
  }),

  analyze_bulk: tool({
    description:
      "Bulk-analyze a block of text (e.g. pasted from a block explorer, a thread, " +
      "or a watchlist) to extract wallet addresses and scam indicators, then store " +
      "each extracted fact. Use for batch imports of wallet flags.",
    inputSchema: z.object({
      text: z.string().describe("The raw text to analyze for wallet flags"),
      address: z
        .string()
        .describe("The primary wallet address this analysis is about"),
    }),
    execute: async ({ text, address }) => {
      const ns = `wallet:${address}`;
      try {
        const result = await withRetry(() => memwal.analyze(text, ns));
        console.log(`\n🔬 Analyzed and stored in: ${ns}`);
        console.log(`   Result: ${JSON.stringify(result)}`);
        return { status: "analyzed", namespace: ns, result };
      } catch (err: any) {
        console.error(`\n❌ analyze_bulk failed for ${ns}:`);
        console.error(`   Message: ${err.message}`);
        console.error(`   Cause: ${err.cause?.message || err.cause?.code || "none"}`);
        console.error(`   Full:`, err);
        return { status: "error", namespace: ns, error: err.message };
      }
    },
  }),
};

// ── Chat loop ──────────────────────────────────────────────────────

const model = process.env.RUGMIND_MODEL ?? "poolside/laguna-m.1:free";

async function main() {
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║       RUGMIND — Wallet Scam Memory Agent     ║");
  console.log("║   Powered by Walrus Memory (mainnet)         ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  // Startup connectivity check
  try {
    const res = await fetch(`${serverUrl}/version`, {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      console.log("✅ Connected to Walrus Memory (mainnet)");
    } else {
      console.log(`⚠️  Walrus Memory responded with status ${res.status} — memory may be degraded`);
    }
  } catch {
    console.log("⚠️  Cannot reach Walrus Memory server — memory operations will fail until network recovers");
  }

  console.log('Type "exit" to quit.\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Collect multi-line pastes: buffer lines that arrive within a short
  // window and deliver them as a single string.
  function readMultiline(): Promise<string> {
    return new Promise((resolve) => {
      process.stdout.write("you> ");
      const lines: string[] = [];
      let timer: ReturnType<typeof setTimeout> | null = null;

      const flush = () => {
        rl.removeListener("line", onLine);
        resolve(lines.join("\n"));
      };

      const onLine = (line: string) => {
        lines.push(line);
        if (timer) clearTimeout(timer);
        timer = setTimeout(flush, 80);
      };

      rl.on("line", onLine);
    });
  }

  const messages: { role: "user" | "assistant"; content: string }[] = [];

  while (true) {
    const input = await readMultiline();
    const trimmed = input.trim();
    if (!trimmed) continue;
    if (trimmed.toLowerCase() === "exit") break;

    messages.push({ role: "user", content: trimmed });

    try {
      const result = await generateText({
        model: openrouter(model),
        system: systemPrompt,
        messages,
        tools,
        stopWhen: isStepCount(5),
      });

      for (const step of result.steps) {
        for (const tc of step.toolCalls) {
          console.log(`  [tool] ${tc.toolName}(${JSON.stringify(tc.input)})`);
        }
      }

      const reply = result.text || "(no response)";
      console.log(`\nrugmind> ${reply}\n`);

      messages.push({ role: "assistant", content: reply });
    } catch (err: any) {
      console.error(`\n❌ Error: ${err.message}\n`);
    }
  }

  rl.close();
  console.log("\nGoodbye. Stay safe out there. 🛡️\n");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
