# PROMPTS.md

This file documents the AI prompts used during development of this project.

## Prompt 1: Missing runtime components
- Goal: Check if the project had missing setup pieces.
- Prompt used:
  - "Does the project lack of components to run?"
- Outcome:
  - Found missing client setup and missing Cloudflare resource setup path.

## Prompt 2: Client scaffolding and dependency debugging
- Goal: Set up frontend and resolve dependency issues.
- Prompts used:
  - "Okay, go ahead."
  - "Successfully run the 'vite'. but the browser shows ..."
- Outcome:
  - Added Vite React client config.
  - Fixed React version mismatch with `agents` dependency.
  - Fixed `useAgent` API usage issues.

## Prompt 3: Git hygiene and tooling setup
- Goal: Make repository clean and editor-friendly.
- Prompts used:
  - "update the gitignore, there are so many diff, it tracks node_modules I guess."
  - "add a biome to this repo + config"
- Outcome:
  - Added `.gitignore` to ignore `node_modules`, build artifacts, Wrangler files, logs, and env files.
  - Added Biome configuration and scripts.

## Prompt 4: Architecture clarification
- Goal: Explain DO persistence and identity behavior.
- Prompts used:
  - "How does the agents package provide persistence without me giving it a token?"
  - "Please explain the Durable Object storage mechanism and how identity is determined without browser login."
- Outcome:
  - Clarified that persistence is in Durable Object state and instance identity is based on Agent instance naming/routing.

## Prompt 5: README improvements
- Goal: Document architecture and usage.
- Prompts used:
  - "Please add a diagram and write it into README.md."
- Outcome:
  - Added request flow diagram and local dev setup instructions.

## Prompt 6: End-to-end debugging
- Goal: Make chat round-trip stable.
- Prompts used:
  - "The Send button is always disabled on the frontend."
  - "After sending one message, it returns 'Connection is not ready'."
  - "Can we change to a more efficient debugging approach?"
- Outcome:
  - Added Vite proxy for `/agents` websocket routing.
  - Stabilized `useAgent` option references.
  - Added frontend timeout and clearer status handling.
  - Fixed backend `onMessage` signature to current Agents SDK.
  - Replaced invalid SDK calls (`getState`, `sendToClient`) with current equivalents.

## Prompt 7: UX polish for demo
- Goal: Improve demo usability and controllability.
- Prompts used:
  - "Set a default input text of 'Why is the sky blue' for debugging."
  - "Please add a reset button."
- Outcome:
  - Added default input text for quick testing.
  - Added reset action to clear conversation state.

## Prompt 8: Repository naming and submission readiness
- Goal: Align project naming and submission checklist.
- Prompts used:
  - "Suggest another project name."
  - "Rename it again and include the words 'cloudflare ai'."
- Outcome:
  - Updated project/app naming across package configs, wrangler config, README, and UI.
