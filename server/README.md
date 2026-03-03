# PlayerSync Server

This lightweight Socket.io server accepts player position updates and broadcasts them to connected clients. It's intended to run alongside the Next.js frontend during local development.

Usage
- `npm run game-server` (requires `ts-node` in devDependencies)

Endpoints / Events
- `players:init` (server -> client): initial list of connected players
- `player:joined` (server -> client): notification that a socket joined
- `player:update` (client -> server): send { x, y, timestamp }
- `player:update` (server -> clients): broadcasted player state
- `player:left` (server -> clients): notification that a socket left

Notes
- This server is intentionally minimal and not authoritative — consider adding validation, rooms, and rate limiting for production.
