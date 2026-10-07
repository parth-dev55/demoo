# AgriGPT – Conversational AI Engine Architecture

This document explains the architecture and implementation strategy for AgriGPT's AI Engine, which acts as the intelligent core of the operating system.

## 1. Core Concepts

AgriGPT is powered by an **Agentic Framework** leveraging advanced large language models. Instead of a hardcoded state machine, the AI acts as an autonomous agent capable of reasoning, planning, and executing actions via external tools.

### Intent Detection & Reasoning
*   **ReAct Pattern:** The agent uses the Reason-and-Act (ReAct) methodology. When a user asks "Compare soybean and wheat profit", the AI reasons: *I need to fetch the current market prices for soybean and wheat, then I need to fetch the projected yield data for the user's region, and then I need to compare them.*
*   **Contextual Awareness:** The AI automatically detects implicit intent based on context (e.g., recognizing that "my farm" refers to the user's location stored in their profile).

### Tool Calling (Function Calling)
The AI is provided with a registry of tools. It does not execute the tools directly; instead, it outputs a structured JSON request (Function Call) asking the backend to execute the tool on its behalf.
*   **Supported Tools:** `get_weather`, `get_market_prices`, `detect_disease`, `predict_yield`, `search_marketplace`, `get_farm_analytics`, `find_gov_schemes`.
*   **Execution Loop:** 
    1. AI decides a tool is needed and suspends generation.
    2. Backend executes the requested function (e.g., querying the Weather API).
    3. Backend returns the tool's output back to the AI.
    4. AI resumes generation, synthesizing the tool's output into a conversational response.

### Memory & Context Management
*   **Short-Term Memory (Conversation History):** The immediate chat history is passed with every request, allowing the AI to understand follow-up questions (e.g., "What about next week?").
*   **Long-Term Memory:** User preferences, farm details, and past significant interactions are stored in Firestore. When a session starts, this context is injected into the System Prompt.
*   **Context Window Optimization:** To prevent exceeding token limits, older messages are summarized, while critical facts are extracted and stored in the user's Long-Term Memory profile.

## 2. Advanced AI Capabilities

### Retrieval-Augmented Generation (RAG)
For knowledge-intensive tasks (e.g., agricultural best practices, pesticide guidelines, government schemes), AgriGPT uses RAG.
*   **Vector Database:** Documents are chunked, embedded using an embedding model, and stored in a vector database (e.g., Pinecone or Vertex AI Vector Search).
*   **Retrieval Tool:** The AI can call a `search_knowledge_base` tool to perform semantic search, retrieving relevant context before answering, ensuring high accuracy and reducing hallucinations.

### Multi-step Planning
For complex requests ("Plan my crop cycle for the next 6 months"), the AI breaks the task into smaller sub-tasks, executing multiple tools sequentially (e.g., first getting soil data, then historical weather, then crop recommendations) before presenting the final plan.

### Streaming Responses
To ensure a snappy user experience, responses are streamed back to the client via Server-Sent Events (SSE) or WebSockets. Visual components (JSON blocks) are buffered and rendered dynamically as they arrive.

### Error Handling & Graceful Degradation
*   **Tool Failures:** If an external API (e.g., Weather) is down, the tool returns an error to the AI. The AI is prompted to gracefully handle this: *"I'm currently unable to fetch real-time weather, but based on historical averages..."*
*   **Ambiguity:** If the user's request is unclear ("Buy seeds"), the AI will not arbitrarily guess; it will ask clarifying questions ("Which type of seeds are you looking for, and in what quantity?").

## 3. Prompt Engineering Strategy

The system prompt is designed to enforce persona, response structure, and tool usage constraints:
1.  **Persona:** "You are AgriGPT, a highly capable Agriculture Copilot..."
2.  **Constraints:** "Never invent market prices. Always use the `get_market_prices` tool."
3.  **Formatting:** Instructions on how to output specific UI blocks (Charts, Weather Cards) using markdown JSON tags to trigger frontend rendering.
