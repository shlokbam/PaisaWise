import httpx
import json
from typing import Dict, Any, List
from app.ai.providers.base import BaseAIProvider
from app.core.config import settings

class GroqProvider(BaseAIProvider):
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        self.model = settings.AI_MODEL or "mixtral-8x7b-32768"
        self.api_url = "https://api.groq.com/openai/v1/chat/completions"

    def _get_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    def generate_json(self, prompt: str, system_prompt: str, json_schema: Any) -> Dict[str, Any]:
        if not self.api_key:
            # Fallback mock for local testing without API key
            print("WARNING: GROQ_API_KEY not configured. Returning mock classification.")
            return {
                "ownership": "PERSONAL",
                "transaction_type": "EXPENSE",
                "category": "SHOPPING",
                "subcategory": "SHOPPING_OTHER",
                "include_in_personal_expenses": True,
                "confidence": 0.85,
                "reason": "MOCKED: Groq key not configured."
            }

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1
        }

        try:
            with httpx.Client(timeout=15.0) as client:
                resp = client.post(self.api_url, headers=self._get_headers(), json=payload)
                resp.raise_for_status()
                result = resp.json()
                content = result["choices"][0]["message"]["content"]
                return json.loads(content)
        except Exception as e:
            print(f"Error calling Groq API: {e}")
            raise RuntimeError(f"Groq classification failed: {str(e)}")

    def chat(self, messages: List[Dict[str, str]], tools: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        if not self.api_key:
            print("WARNING: GROQ_API_KEY not configured. Returning mock chat response.")
            return {
                "role": "assistant",
                "content": "Hi! Groq API is not configured. Please set the GROQ_API_KEY environment variable. Here is mock response: You spent ₹17,850 on personal expenses this month.",
                "tool_calls": None
            }

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.5
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        try:
            with httpx.Client(timeout=30.0) as client:
                resp = client.post(self.api_url, headers=self._get_headers(), json=payload)
                resp.raise_for_status()
                result = resp.json()
                choice_message = result["choices"][0]["message"]
                
                tool_calls = choice_message.get("tool_calls")
                return {
                    "role": "assistant",
                    "content": choice_message.get("content"),
                    "tool_calls": tool_calls
                }
        except Exception as e:
            print(f"Error in Groq chat: {e}")
            return {
                "role": "assistant",
                "content": f"Sorry, I encountered an error communicating with the AI backend: {str(e)}",
                "tool_calls": None
            }
        
    def is_configured(self) -> bool:
        return bool(self.api_key)
