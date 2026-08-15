from abc import ABC, abstractmethod
from typing import Dict, Any, List

class BaseAIProvider(ABC):
    @abstractmethod
    def generate_json(self, prompt: str, system_prompt: str, json_schema: Any) -> Dict[str, Any]:
        """
        Sends a request to the AI model and expects a strict JSON response
        matching the provided Pydantic schema structure.
        """
        pass

    @abstractmethod
    def chat(self, messages: List[Dict[str, str]], tools: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Chat completion with optional function tool-calling capabilities.
        """
        pass
