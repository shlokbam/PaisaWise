from typing import Optional
from app.ai.providers.base import BaseAIProvider
from app.ai.providers.groq_provider import GroqProvider
from app.ai.providers.mistral_provider import MistralProvider
from app.core.config import settings
from app.models.user import User

def get_ai_provider(user: Optional[User] = None) -> BaseAIProvider:
    """Factory to retrieve the active AI Provider based on user configuration and system settings."""
    if user:
        if user.groq_api_key and user.groq_api_key.strip():
            return GroqProvider(api_key=user.groq_api_key.strip())
        elif user.mistral_api_key and user.mistral_api_key.strip():
            return MistralProvider(api_key=user.mistral_api_key.strip())

    if settings.GROQ_API_KEY and settings.GROQ_API_KEY.strip():
        return GroqProvider(api_key=settings.GROQ_API_KEY.strip())
    elif settings.MISTRAL_API_KEY and settings.MISTRAL_API_KEY.strip():
        return MistralProvider(api_key=settings.MISTRAL_API_KEY.strip())

    provider_name = settings.AI_PROVIDER.lower()
    if provider_name == "mistral":
        return MistralProvider()
    else:
        return GroqProvider()

__all__ = ["BaseAIProvider", "GroqProvider", "MistralProvider", "get_ai_provider"]
