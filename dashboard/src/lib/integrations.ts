export interface Integration { id: string; title: string; description: string; code: string }

// Repris de l'ancien dashboard (70-connect.js). Remplacer YOUR_* par la clé et l'URL.
// Le snippet HTTP d'origine pointait vers /api/spans (route inexistante) et n'avait pas de corps : corrigé ici.
export const INTEGRATIONS: Integration[] = [
  {
    "id": "python",
    "title": "Python SDK",
    "description": "Native AgentGuard instrumentation. Wrap LLM calls with guard_llm_call and side-effecting tools with guard_tool_call.",
    "code": "pip install agentguard\n\nfrom agentguard_sdk import AgentGuard\n\nguard = AgentGuard(\n    collector_url=\"https://YOUR_AGENTGUARD_HOST\",\n    api_key=\"YOUR_AGENTGUARD_API_KEY\",\n    agent_id=\"my-agent\",\n)\n\n@guard.guard_llm_call\ndef call_model(prompt, model=\"gpt-5\"):\n    from openai import OpenAI\n    return OpenAI().responses.create(model=model, input=prompt)"
  },
  {
    "id": "mcp",
    "title": "MCP",
    "description": "Use an AgentGuard MCP adapter at the execution boundary.",
    "code": "export AGENTGUARD_API_KEY=\"YOUR_AGENTGUARD_API_KEY\"\nexport AGENTGUARD_COLLECTOR_URL=\"https://YOUR_AGENTGUARD_HOST\""
  },
  {
    "id": "http",
    "title": "HTTP Gateway",
    "description": "Language-agnostic ingestion: send one span per LLM call or tool call.",
    "code": "curl -X POST \"https://YOUR_AGENTGUARD_HOST/span\" \\\n  -H \"Content-Type: application/json\" \\\n  -H \"X-API-Key: YOUR_AGENTGUARD_API_KEY\" \\\n  -d '{\n    \"trace_id\": \"run-001\",\n    \"span_id\": \"step-001\",\n    \"span_type\": \"tool_call\",\n    \"timestamp\": 1760000000,\n    \"latency_ms\": 120,\n    \"input_data\": {\"tool\": \"read_file\", \"params\": {\"path\": \"report.csv\"}},\n    \"output_data\": {\"ok\": true},\n    \"security_checks\": [],\n    \"blocked\": false\n  }'"
  },
  {
    "id": "composio",
    "title": "Composio",
    "description": "Use AgentGuard immediately before Composio executes a tool.",
    "code": "from agentguard_sdk import AgentGuard\nguard = AgentGuard(collector_url=\"https://YOUR_AGENTGUARD_HOST\", api_key=\"YOUR_AGENTGUARD_API_KEY\", agent_id=\"composio-agent\")"
  },
  {
    "id": "openai",
    "title": "OpenAI",
    "description": "AgentGuard wraps the OpenAI call path.",
    "code": "from agentguard_sdk import AgentGuard\nfrom openai import OpenAI\nguard = AgentGuard(collector_url=\"https://YOUR_AGENTGUARD_HOST\", api_key=\"YOUR_AGENTGUARD_API_KEY\", agent_id=\"openai-agent\")"
  },
  {
    "id": "anthropic",
    "title": "Anthropic",
    "description": "Protect Claude requests with the same AgentGuard runtime boundary.",
    "code": "from agentguard_sdk import AgentGuard\nfrom anthropic import Anthropic\nguard = AgentGuard(collector_url=\"https://YOUR_AGENTGUARD_HOST\", api_key=\"YOUR_AGENTGUARD_API_KEY\", agent_id=\"claude-agent\")"
  },
  {
    "id": "langgraph",
    "title": "LangGraph",
    "description": "Framework integration through node and tool wrappers.",
    "code": "from agentguard_sdk import AgentGuard\nguard = AgentGuard(collector_url=\"https://YOUR_AGENTGUARD_HOST\", api_key=\"YOUR_AGENTGUARD_API_KEY\", agent_id=\"langgraph-agent\")"
  },
  {
    "id": "crewai",
    "title": "CrewAI",
    "description": "Framework integration through guarded task tools.",
    "code": "from agentguard_sdk import AgentGuard\nguard = AgentGuard(collector_url=\"https://YOUR_AGENTGUARD_HOST\", api_key=\"YOUR_AGENTGUARD_API_KEY\", agent_id=\"crewai-agent\")"
  }
]
