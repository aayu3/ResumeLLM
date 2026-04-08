import { serve } from "@hono/node-server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import app from "./routes.js";
import { createMcpServer } from "./mcp.js";

const PORT = Number(process.env.PORT ?? 8787);

// ── REST server ───────────────────────────────────────────────────────────────
serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`[api] REST server listening on http://localhost:${PORT}`);
  console.log(`[api]   POST /api/gap-analysis`);
  console.log(`[api]   POST /api/optimize`);
  console.log(`[api]   POST /mcp  (MCP Streamable HTTP)`);
  console.log(`[api]   GET /health  (Health check)`);
});

// ── MCP server (Streamable HTTP, mounted at /mcp) ─────────────────────────────
const mcpServer = createMcpServer();

app.post("/mcp", async (c) => {
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await mcpServer.connect(transport);
  const response = await transport.handleRequest(c.req.raw);
  return response;
});
