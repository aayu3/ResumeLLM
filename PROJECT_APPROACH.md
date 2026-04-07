Architecture & Core Philosophy
This project uses a Monorepo-First strategy to manage a cross-platform AI application. By using Turborepo, we ensure that the optimization logic remains identical whether it's triggered by the web UI or an external agent (Claude Code).

1. Workspace Structure
packages/core: The "Source of Truth." Contains Zod schemas, prompt templates, and LLM orchestration logic.

apps/web: React/Vite frontend. Features a Tiptap-based editor for manual resume tweaking.

apps/api: The "Middle Layer." A Hono-based API that serves as both a REST backend for the web app and an MCP Server for AI agents.

2. Security: The Stateless Relay Pattern
To maintain zero infrastructure costs and maximum user privacy, we do not store API keys:

Web Flow: The UI captures the user's key and sends it in the Authorization header of every request. The API "relays" this to the LLM.

Agent Flow: Claude Code passes the key via environment variables defined in the user's local claude_desktop_config.json.

Local Flow: If the user has an RTX 5090, the app defaults to Ollama (localhost:11434), requiring no API keys.