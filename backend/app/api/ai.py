from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.ai.providers import get_ai_provider
from app.ai.tools import TOOLS_SCHEMA, call_tool_by_name
from pydantic import BaseModel
from typing import List, Dict, Optional, Any

router = APIRouter(prefix="/ai", tags=["ai"])

class ChatMessage(BaseModel):
    role: str # user, assistant, system
    content: str

class ChatPayload(BaseModel):
    message: str
    history: List[ChatMessage] = []

SYSTEM_INSTRUCTION = """
You are the PaisaWise AI Financial Assistant. Your name is PaisaWise AI.
You help the user understand where their money is actually going.

You are equipped with read-only tools to query the user's financial database:
- `get_monthly_summary()`
- `get_spending_by_category()`
- `get_spending_by_merchant()`
- `get_subscription_total()`
- `get_budget_status()`

IMPORTANT RULES & GUARDRAILS:
1. STRICT CONSTRAINT: You are ONLY allowed to answer questions related to personal finance, budgeting, spending, income, investments, transaction ledgers, subscriptions, or financial co-piloting.
2. If the user asks general programming, coding (e.g., Python code), general knowledge, writing, or any other query unrelated to personal finance or PaisaWise, you MUST politely refuse. Respond with: "I am sorry, but as the PaisaWise AI Financial Assistant, I can only assist you with questions related to your personal finances, budgets, spending, subscriptions, or ledger details. I cannot help with coding, general programming, or other unrelated topics."
3. Always call the database tools to retrieve actual data before explaining or summarizing user transactions.
4. Personal Spending only includes transactions where:
   ownership == PERSONAL AND transaction_type == EXPENSE AND include_in_personal_expenses == TRUE.
5. If the user asks a question like "Can I afford ₹5,000 headphones?", check the monthly summary and remaining budgets. Give a detailed explanation of their current position (spending, remaining budget, upcoming subscriptions) and suggest whether it fits. Never make transactions.
6. Keep your responses concise, clear, and professional. Use formatting (bullet points, bold text) for readability.
"""

@router.post("/chat")
def chat_assistant(
    payload: ChatPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Exposes conversational assistant.
    Resolves requests using the tool-calling cycle (execute tools locally -> return results to AI).
    """
    provider = get_ai_provider(current_user)
    
    # 1. Build messages history list
    messages = [{"role": "system", "content": SYSTEM_INSTRUCTION}]
    
    # Add history
    for msg in payload.history:
        messages.append({"role": msg.role, "content": msg.content})
        
    # Add current user message
    messages.append({"role": "user", "content": payload.message})
    
    # 2. Call AI Provider (Initial pass with tools schema)
    ai_response = provider.chat(messages=messages, tools=TOOLS_SCHEMA)
    
    # Check if tool calls exist
    if ai_response.get("tool_calls"):
        tool_calls = ai_response["tool_calls"]
        
        # Append the assistant's request for tool calls
        messages.append({
            "role": "assistant",
            "content": ai_response.get("content") or "",
            "tool_calls": tool_calls
        })
        
        # Execute each tool locally
        for tool_call in tool_calls:
            # support both dict and object style tool calls (depending on provider formatting)
            if isinstance(tool_call, dict):
                func_name = tool_call["function"]["name"]
                call_id = tool_call.get("id", "call_id")
            else:
                func_name = tool_call.function.name
                call_id = tool_call.id
                
            print(f"AI Assistant triggered tool: {func_name}")
            tool_result = call_tool_by_name(func_name, current_user.id, db)
            
            messages.append({
                "role": "tool",
                "tool_call_id": call_id,
                "name": func_name,
                "content": tool_result
            })
            
        # 3. Call AI Provider second time (with tool results) to formulate response
        final_response = provider.chat(messages=messages)
        return {"response": final_response.get("content")}
        
    return {"response": ai_response.get("content")}
