export interface Integration { id: string; title: string; description: string; code: string }

// Les outils sont appelés avec des arguments nommés : le SDK publié (0.6.0) perd les arguments positionnels.
// Snippets vérifiés contre le paquet publié (pip install cerbere-ag) : nom du paquet, imports,
// variables d'environnement MCP et route HTTP (/span). Seuls Python SDK et HTTP ont été exécutés
// de bout en bout ; les exemples de frameworks suivent le même motif sans avoir été lancés avec
// les bibliothèques tierces. Remplacer YOUR_* par la clé et l'URL.
export const INTEGRATIONS: Integration[] = [
  {
    "id": "python",
    "title": "Python SDK",
    "description": "Native instrumentation. Wrap each model call and each tool that has side effects.",
    "code": "pip install cerbere-ag\n\nfrom agentguard import AgentGuard, SecurityException\n\nguard = AgentGuard(\n    collector_url=\"https://YOUR_AGENTGUARD_HOST\",\n    api_key=\"YOUR_AGENTGUARD_API_KEY\",\n    agent_id=\"my-agent\",\n)\n\n# Protect every tool that acts on the outside world\n@guard.guard_tool_call(\"send_email\")\ndef send_email(to, subject, body):\n    ...  # your existing code\n\n# Protect every model call\n@guard.guard_llm_call\ndef call_model(messages, model=\"gpt-4o\"):\n    from openai import OpenAI\n    return OpenAI().chat.completions.create(model=model, messages=messages)\n\n# Optional: tell Cerbere which data is sensitive so it can follow it\n# guard.track_input(file_contents, source=\"file\")\n\ntry:\n    send_email(to=\"customer@example.com\", subject=\"Your refund\", body=\"Done\")\nexcept SecurityException as err:\n    print(\"Blocked:\", err)"
  },
  {
    "id": "mcp",
    "title": "MCP",
    "description": "Add the Cerbere MCP server to any MCP client (Claude Desktop, Cursor, Claude Code...).",
    "code": "pip install cerbere-ag-mcp\n\n# In your MCP client configuration:\n{\n  \"mcpServers\": {\n    \"cerbereag\": {\n      \"command\": \"cerbere-ag-mcp\",\n      \"env\": {\n        \"AGENTGUARD_MCP_COLLECTOR_URL\": \"https://YOUR_AGENTGUARD_HOST\",\n        \"AGENTGUARD_API_KEY\": \"YOUR_AGENTGUARD_API_KEY\",\n        \"AGENTGUARD_AGENT_ID\": \"my-agent\"\n      }\n    }\n  }\n}"
  },
  {
    "id": "http",
    "title": "HTTP Gateway",
    "description": "Language-agnostic ingestion: send one span per LLM call or tool call.",
    "code": "curl -X POST \"https://YOUR_AGENTGUARD_HOST/span\" \\\n  -H \"Content-Type: application/json\" \\\n  -H \"X-API-Key: YOUR_AGENTGUARD_API_KEY\" \\\n  -d '{\n    \"trace_id\": \"run-001\",\n    \"span_id\": \"step-001\",\n    \"span_type\": \"tool_call\",\n    \"timestamp\": 1760000000,\n    \"latency_ms\": 120,\n    \"input_data\": {\"tool\": \"read_file\", \"params\": {\"path\": \"report.csv\"}},\n    \"output_data\": {\"ok\": true},\n    \"security_checks\": [],\n    \"blocked\": false\n  }'"
  },
  {
    "id": "openai",
    "title": "OpenAI",
    "description": "Guard the function that calls OpenAI.",
    "code": "pip install cerbere-ag openai\n\nfrom agentguard import AgentGuard\nfrom openai import OpenAI\n\nguard = AgentGuard(\n    collector_url=\"https://YOUR_AGENTGUARD_HOST\",\n    api_key=\"YOUR_AGENTGUARD_API_KEY\",\n    agent_id=\"openai-agent\",\n)\nclient = OpenAI()\n\n@guard.guard_llm_call\ndef chat(messages, model=\"gpt-4o\"):\n    return client.chat.completions.create(model=model, messages=messages)\n\nreply = chat(messages=[{\"role\": \"user\", \"content\": \"Hello\"}])"
  },
  {
    "id": "anthropic",
    "title": "Anthropic",
    "description": "Guard the function that calls Claude.",
    "code": "pip install cerbere-ag anthropic\n\nfrom agentguard import AgentGuard\nfrom anthropic import Anthropic\n\nguard = AgentGuard(\n    collector_url=\"https://YOUR_AGENTGUARD_HOST\",\n    api_key=\"YOUR_AGENTGUARD_API_KEY\",\n    agent_id=\"claude-agent\",\n)\nclient = Anthropic()\n\n@guard.guard_llm_call\ndef chat(messages, model=\"YOUR_CLAUDE_MODEL\"):\n    return client.messages.create(model=model, max_tokens=1024, messages=messages)\n\nreply = chat(messages=[{\"role\": \"user\", \"content\": \"Hello\"}])"
  },
  {
    "id": "langgraph",
    "title": "LangGraph",
    "description": "Guard the tool function, then register it with LangGraph as usual.",
    "code": "pip install cerbere-ag langgraph\n\nfrom agentguard import AgentGuard\n\nguard = AgentGuard(\n    collector_url=\"https://YOUR_AGENTGUARD_HOST\",\n    api_key=\"YOUR_AGENTGUARD_API_KEY\",\n    agent_id=\"langgraph-agent\",\n)\n\n@guard.guard_tool_call(\"lookup_order\")\ndef lookup_order(order_id: str) -> str:\n    ...  # your existing tool code\n\n# Register lookup_order as a tool in your graph exactly as you do today."
  },
  {
    "id": "crewai",
    "title": "CrewAI",
    "description": "Guard the tool function, then give it to your CrewAI agent as usual.",
    "code": "pip install cerbere-ag crewai\n\nfrom agentguard import AgentGuard\n\nguard = AgentGuard(\n    collector_url=\"https://YOUR_AGENTGUARD_HOST\",\n    api_key=\"YOUR_AGENTGUARD_API_KEY\",\n    agent_id=\"crewai-agent\",\n)\n\n@guard.guard_tool_call(\"search_customers\")\ndef search_customers(query: str) -> str:\n    ...  # your existing tool code\n\n# Wrap or register search_customers as a CrewAI tool exactly as you do today."
  },
  {
    "id": "composio",
    "title": "Composio",
    "description": "Guard the function that executes a Composio action.",
    "code": "pip install cerbere-ag composio\n\nfrom agentguard import AgentGuard\n\nguard = AgentGuard(\n    collector_url=\"https://YOUR_AGENTGUARD_HOST\",\n    api_key=\"YOUR_AGENTGUARD_API_KEY\",\n    agent_id=\"composio-agent\",\n)\n\n@guard.guard_tool_call(\"composio_action\")\ndef run_action(action_name, params):\n    ...  # your existing Composio execution code"
  }
]
