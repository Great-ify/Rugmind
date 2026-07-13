# Rugmind — Walrus Memory Prompt Jam Submission

## Problem Statement

Crypto users lack persistent, verifiable memory of scam and rug-pull wallet addresses. When a wallet is flagged by one user, that knowledge dies with the session. Rugmind gives every user a CLI agent backed by Walrus Memory that remembers wallet flags across sessions, shares them through opt-in circles, and writes every flag to Walrus mainnet so the data is independently verifiable.

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


## Tech Stack

- TypeScript / Node.js
- Walrus Memory SDK (`@mysten-incubation/memwal`) — mainnet
- LLM via OpenRouter (Vercel AI SDK) for the chat loop
- dotenv for configuration

## The Prompt

Full text: [`rugmind.prompt.md`](./rugmind.prompt.md)

## Proof of Usage

- **Account ID:** `0xc41b5c949159146b7a0a74d973bcd61c5cb5f946b66bfe610b894277a6138f39`

- **Verified blobs on mainnet:**
  - `Y6q3iSYG1v5E7UNnFEpohzWn_k2nfsE0YW_FRSlCOds` — [Verify on Walruscan](https://walruscan.com/mainnet/blob/Y6q3iSYG1v5E7UNnFEpohzWn_k2nfsE0YW_FRSlCOds)
- **Sample flag stored:** `[FLAG] 0xAAAA9999BBBB8888CCCC7777DDDD6666EEEE5555 — rug pull - Project FakeYield vanished with 50k USDC in July 2026`


- **Explorer (account object):** [View on Walrus Memory Explorer](https://memory.walrus.xyz/accounts/0xc41b5c949159146b7a0a74d973bcd61c5cb5f946b66bfe610b894277a6138f39)


## Agent Verification

- **MEMWAL_AGENT_ID:** `a20a6c4d9567dc3eed25f92e4ea2a5b502e3ab450b0d5996e862b698634759eb`
- **On-chain object:** https://suiscan.xyz/mainnet/object/0xc41b5c949159146b7a0a74d973bcd61c5cb5f946b66bfe610b894277a6138f39