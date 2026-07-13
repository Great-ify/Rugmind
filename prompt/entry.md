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
- Claude (Anthropic) via Vercel AI SDK for the chat loop
- dotenv for configuration

## The Prompt

Full text: [`rugmind.prompt.md`](./rugmind.prompt.md)

## Proof of Usage

- **Agent ID:** `[fill in from memory.walrus.xyz dashboard]`
- **Blob count:** `[fill in from npx tsx list-memories.ts wallet]`
- **Sample verified blob:** `https://walruscan.com/mainnet/blob/[fill in blob ID]`
