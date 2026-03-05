# Git-Mon World: Agent Instructions

## Project Overview
A persistent, 16-bit multiplayer world where GitHub contributions build the environment.
- **Visual Style:** GBA-style (Pokémon Ruby/Sapphire/Emerald aesthetic).
- **Stack:** Next.js (App Router), Phaser 3 (Game Engine), Socket.io (Multiplayer), Supabase (Persistence).

## Tech Standards
- Use **Phaser 3** for the game loop, rendered inside a React component.
- Use **Tailwind CSS** for the non-game UI (overlays, chat, trainer cards).
- All game assets must be placed in `/public/assets/`.
- Use **Socket.io** for real-time player positioning.

## Git Workflow
- Use **Conventional Commits** for every change.
- Format: `type: description` (e.g., `feat: add player movement`, `chore: init project`).
- Always run `npm run lint` before pushing.

## OpenCode Specifics
- **Primary Agent:** `build` (for implementation).
- **Subagent:** `@general` (for researching Phaser 3 physics or Web3 integrations).
- **Permission:** Allow `bash` for running dev servers and `gh` for repository management.
