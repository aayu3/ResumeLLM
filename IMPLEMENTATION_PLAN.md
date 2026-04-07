Development & Mocking Roadmap
This plan outlines how to build and test the application without incurring cloud costs or managing complex Docker containers.

Phase 1: Local Foundation & Inference
Setup: Initialize Turborepo with pnpm.

LLM Mocking: Use Ollama as the primary local mock. Configure packages/core to point to http://localhost:11434/v1 during development.

Goal: Ensure the core logic can successfully "Gap Analyze" a resume against a JD using a local 8B or 70B model.

Phase 2: The "Middle Layer" Emulator
Tooling: Use Wrangler Dev (Cloudflare) or Azure Functions Core Tools.

Action: Run the API locally. It should receive a resume from the frontend (or a curl request), attach the provided API key, and return an optimized Markdown string.

Mocking Transport: Use MCP Inspector (npx @modelcontextprotocol/inspector) to visually test tool calls without opening Claude Code.

Phase 3: Frontend & Manual UX
Editor: Implement Tiptap with "Suggestion" marks.

Testing: Use Mock Service Worker (MSW) or a local LLMock server to simulate "streaming" responses from the LLM. This allows you to polish the UI's "Accept/Reject" animations without waiting for real LLM inference.

Phase 4: Agent Bridge (MCP)
Integration: Connect the local API to Claude Code using the sse transport.

Verification: Ensure Claude can read a local file and trigger the optimize_resume tool via your local server.

```mermaid
graph TD
    %% --- The Developer & Orchestrator ---
    subgraph DevMachine [Your Workstation]
        DevOps["<b>Developer</b><br/>Runs 'pnpm dev'"]
        Turbo["<b>Turborepo</b><br/>Monorepo Orchestrator"]
    end

    %% --- The Browser/Client Layer ---
    subgraph BrowserLayer [Client Layer Browser]
        WebApp["<b>React App</b><br/>Vite Dev Server<br/>localhost:3000"]
        Tiptap["<b>Tiptap Editor</b><br/>Manual editing & suggestions"]
        
        McpInspector["<b>MCP Inspector</b><br/>Browser UI for testing MCP tools"]
    end

    %% --- The Server/Emulator Layer (The "Middle Layer") ---
    subgraph ServerLayer [Middle Layer Emulators]
        BackendEmulator["<b>Hono API</b><br/>Running in Wrangler (CF) or<br/>Azure Functions Core Tools<br/>localhost:8787"]
        
        subgraph MonorepoCode [Project Code]
            CoreLogic["<b>packages/core</b><br/>System Prompts,<br/>Zod Schemas,<br/>Diff Logic"]
        end
    end

    %% --- The Inference Layer (RTX 5090) ---
    subgraph InferenceLayer [Local Inference]
        OllamaServer["<b>Ollama (Local LLM)</b><br/>Serving Llama 3 70B / Qwen 1.5<br/>localhost:11434"]
        RTX5090["<b style='color:green'>Local NPU/GPU</b><br/>GPU Hardware Acceleration"]
    end

    %% --- Core Connections ---
    DevOps --> Turbo
    Turbo -->|Starts| WebApp
    Turbo -->|Starts| BackendEmulator
    Turbo -->|Runs| McpInspector

    %% --- Manual Web Flow ---
    WebApp -->|1. REST Call fetch| BackendEmulator
    BackendEmulator -->|2. Imports| CoreLogic
    CoreLogic -->|3. OpenAI-compatible API| OllamaServer
    OllamaServer -->|4. CUDA Kernels| RTX5090

    %% --- Agentic MCP Flow (Testing) ---
    McpInspector -->|1. SSE connection| BackendEmulator
    BackendEmulator -->|2. Map to MCP Tool| CoreLogic
    CoreLogic -->|3. Call Ollama| OllamaServer

    %% --- Styling ---
    classDef browser fill:#e1f5fe,stroke:#01579b,stroke-width:2px;
    classDef server fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px;
    classDef gpu fill:#fff3e0,stroke:#e65100,stroke-width:2px;
    classDef code fill:#f3e5f5,stroke:#4a148c,stroke-width:1px,stroke-dasharray: 5 5;
    classDef infra fill:#f5f5f5,stroke:#212121,stroke-width:1px;

    class WebApp,Tiptap,McpInspector browser;
    class BackendEmulator server;
    class OllamaServer,RTX5090 gpu;
    class CoreLogic code;
    class DevOps,Turbo infra;
```