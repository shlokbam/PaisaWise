from app.ai.providers.base import BaseAIProvider
from app.ai.providers.groq_provider import GroqProvider
from app.ai.providers.mistral_provider import MistralProvider
from app.core.config import settings

def get_ai_provider() -> BaseAIProvider:
    """Factory to retrieve the active AI Provider based on settings."""
    provider_name = settings.AI_PROVIDER.lower()
    if provider_name == "mistral":
        return MistralProvider()
    else:
        # Default fallback to Groq
        return GroqProvider()

__all__ = ["BaseAIProvider", "GroqProvider", "MistralProvider", "get_ai_provider"]
