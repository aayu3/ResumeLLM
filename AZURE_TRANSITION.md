Enterprise Deployment Strategy
Once the Cloudflare prototype is stable, migrate to Azure to leverage enterprise-grade persistent connections and the Azure Functions MCP Extension.

1. Infrastructure Migration
Frontend: Move the React build to Azure Static Web Apps (SWA).

Backend: Migrate Hono routes to Azure Functions (Flex Consumption).

Transport: Swap standard SSE for the native Streamable HTTP support in the Azure MCP runtime.

2. Scaling to Hybrid Cloud
Managed Identities: Configure Azure Functions to use Managed Identities for Azure OpenAI access, removing the need for secrets in code.

Cosmos DB Integration: If users opt-in, move from localStorage to Azure Cosmos DB (Serverless) for encrypted cross-device sync.

3. Local-to-Cloud Toggle
Implement a "Hardware Detection" feature in the frontend:

If the app detects a response from localhost:11434, it offers an "Enthusiast Mode" (RTX 5090 Local Inference).

Otherwise, it defaults to "Cloud Mode" via the Azure-hosted API.

Execution Summary
Dev Command: pnpm dev (Runs Vite + Wrangler/Azure Emulator + Ollama).

Test Command: pnpm test (Runs Vitest with LLMock).

Inspect Command: pnpm inspect (Runs MCP Inspector for tool debugging).