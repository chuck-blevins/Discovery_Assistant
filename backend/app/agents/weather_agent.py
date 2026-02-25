"""
Example weather helper. No LangChain/LangGraph dependency.

Run this module for a quick demo:
  cd backend && python -m app.agents.weather_agent
"""


def get_weather(city: str) -> str:
    """Get weather for a given city."""
    return f"It's always sunny in {city}!"


def run_agent(user_message: str = "What is the weather in San Francisco?") -> str:
    """Demo: parse a simple 'weather in X' query and return get_weather(X). No LLM."""
    # Minimal heuristic for demo: treat last segment as city if message looks like a question
    city = "San Francisco"
    if "weather in " in user_message.lower():
        rest = user_message.lower().split("weather in ")[-1].strip()
        if rest:
            city = rest.rstrip("?").strip() or city
    return get_weather(city)


if __name__ == "__main__":
    print(run_agent())
