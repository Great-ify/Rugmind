# Rugmind

Persistent wallet due-diligence memory for AI agents, built on Walrus Memory.

Rugmind gives an AI agent the ability to remember scam and rug-pull patterns 
across sessions, so a wallet you flagged once is never treated as a stranger 
again — and neither are you the next time you consider trusting it.

## The Problem

Crypto users evaluate wallet trust from scratch every time they interact 
with a new address, even when the information to catch a scam already 
exists somewhere: a friend's warning, a Discord post, or their own memory 
of a deployer wallet that already rugged a project under a different name. 
Public blocklists don't fix this, because scammers simply check them and 
avoid anything listed.

## What It Does

Rugmind is a system prompt that turns any Walrus Memory-connected agent 
into a wallet due-diligence memory:

- **Recalls automatically** — the moment a wallet address appears anywhere 
  in conversation, the agent checks memory before responding to anything else
- **Writes automatically** — flags, funding-chain links, and trust signals 
  are logged the instant they're reported, without being asked
- **Bulk imports** — an old spreadsheet or notes list of flagged wallets can 
  be pasted in and imported in a single pass
- **Cluster analysis** — every new flag is checked against the full memory 
  namespace for hidden connections, like two "different" scam wallets 
  sharing the same funding source
- **Stays private by default** — flags only move into a shared, permissioned 
  circle namespace on explicit request, never automatically

Every flag is written to **Walrus mainnet** and returns a blob ID you can verify at `https://walruscan.com/mainnet/blob/<blob-id>`.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Terminal (you)                       │
│                        ^    │                            │
│                        │    v                            │
│  ┌──────────────── index.ts ───────────────────────┐    │
│  │                                                  │    │
│  │   readline loop <──> LLM (via OpenRouter)        │    │
│  │                        │                         │    │
│  │                  tool dispatch                    │    │
│  │           ┌────────┼────────┐                    │    │
│  │           v        v        v                    │    │
│  │      flag_wallet  check_*  analyze_bulk          │    │
│  │      flag_circle                                 │    │
│  │           │        │        │                    │    │
│  └───────────┼────────┼────────┼────────────────────┘    │
│              v        v        v                         │
│        ┌─────────────────────────────┐                   │
│        │   MemWal SDK (remember /    │                   │
│        │   recall / analyze)         │                   │
│        └────────────┬────────────────┘                   │
│                     v                                    │
│        ┌─────────────────────────────┐                   │
│        │   Walrus Mainnet            │                   │
│        │   (blob storage)            │                   │
│        └─────────────────────────────┘                   │
└─────────────────────────────────────────────────────────┘
```

**Data flow:** User message → LLM decides which tool(s) to call →
tool executes a real MemWal SDK operation → SDK writes/reads an encrypted
blob on Walrus mainnet via the relayer → blob ID and verification link are
printed to the terminal and returned to the LLM for its response.

**Namespaces:** Each wallet gets its own namespace (`wallet:{address}`) so
flags are scoped per-address. Shared circles (`circle:{name}`) are created
only on explicit opt-in.

**Files:**

| File | Role |
|------|------|
| `index.ts` | Chat loop, tool definitions, MemWal client init |
| `list-memories.ts` | Standalone dump of stored memories for verification |
| `prompt/rugmind.prompt.md` | System prompt loaded at runtime (not hardcoded) |
| `prompt/entry.md` | Submission writeup with proof-of-usage |
| `.mcp.json` | MCP server config for the MemWal stdio transport |

## Quick Start

```bash
# 1. Clone
git clone <repo-url> rugmind && cd rugmind

# 2. Install dependencies
npm install

# 3. Create .env from the example
cp .env.example .env
# Fill in your real keys:
#   MEMWAL_PRIVATE_KEY   — delegate key from https://memory.walrus.xyz
#   MEMWAL_ACCOUNT_ID    — account ID from the same dashboard
#   MEMWAL_SERVER_URL    — https://relayer.memory.walrus.xyz (mainnet)
#   OPENROUTER_API_KEY   — free key from https://openrouter.ai/keys

# 4. Run the agent
npm start
```

## Usage

Once running, chat naturally:

```
you> Flag 0x71C7656EC7ab88b098defB751B7401B5f6d8976F as a known rug-pull wallet
you> Check 0x71C7656EC7ab88b098defB751B7401B5f6d8976F
you> Create a circle called "defi-watchers" and flag 0xABC... there
you> Analyze this list of addresses from etherscan: 0x123..., 0x456..., 0x789...
```

Every write prints a blob ID and a verification link. Every recall shows what came back from Walrus Memory.

## Listing All Stored Memories

```bash
# List all wallet:* memories
npx tsx list-memories.ts wallet

# List all circle:* memories
npx tsx list-memories.ts circle

# List a specific namespace
npx tsx list-memories.ts wallet:0x71C7656EC7ab88b098defB751B7401B5f6d8976F
```

## Verifying a Blob

Copy any blob ID printed by the agent and open:

```
https://walruscan.com/mainnet/blob/<blob-id>
```

## License

MIT
