"""
Example LangChain agent with a weather tool. LangSmith tracing is enabled via env.

Set in .env (or export):
  LANGSMITH_TRACING=true
  LANGSMITH_ENDPOINT=https://api.smith.langchain.com
  LANGSMITH_API_KEY=<your-key>
  LANGSMITH_PROJECT=pr-ordinary-witness-91  # or any project name
  OPENAI_API_KEY=<your-openai-key>

Run this module to invoke the agent once and see traces in LangSmith:
  cd backend && python -m app.agents.weather_agent
"""

import os

from dotenv import load_dotenv

load_dotenv()


def get_weather(city: str) -> str:
    """Get weather for a given city."""
    return f"It's always sunny in {city}!"


def _build_agent():
    from langchain.agents import create_agent

    model = os.getenv("LANGCHAIN_AGENT_MODEL", "openai:gpt-4o-mini")
    return create_agent(
        model=model,
        tools=[get_weather],
        system_prompt="You are a helpful assistant",
    )


# Lazy-initialized so env is loaded and optional deps only required when used
agent = None


def _get_agent():
    global agent
    if agent is None:
        agent = _build_agent()
    return agent


def run_agent(user_message: str = "What is the weather in San Francisco?"):
    """Invoke the agent with the given message. Traces go to LangSmith if enabled."""
    graph = _get_agent()
    result = graph.invoke(
        {"messages": [{"role": "user", "content": user_message}]}
    )
    return result


if __name__ == "__main__":
    run_agent()
