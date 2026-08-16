from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.transaction import MobileTransactionCreate, TransactionOut
from app.services.transaction_service import process_incoming_transaction
from typing import List

router = APIRouter(prefix="/mobile", tags=["mobile"])

from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.parsers.sms_parser import parse_sms

class RawSmsPayload(BaseModel):
    sender: Optional[str] = None
    body: str
    date: Optional[int] = None

@router.post("/ingest", response_model=Optional[TransactionOut])
def ingest_raw_sms(
    payload: RawSmsPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Parses a raw SMS string using sms_parser.py and ingests the transaction.
    """
    parsed = parse_sms(payload.body, payload.sender)
    if not parsed:
        return None
        
    ts = datetime.fromtimestamp(payload.date / 1000.0) if payload.date else datetime.utcnow()
    
    mobile_payload = MobileTransactionCreate(
        amount=parsed["amount"],
        currency=parsed["currency"],
        direction=parsed["direction"],
        payment_method=parsed["payment_method"],
        merchant_name=parsed["merchant_name"],
        upi_id=parsed["upi_id"],
        sender=parsed["sender"],
        receiver=parsed["receiver"],
        account_last4=parsed["account_last4"],
        bank_name=parsed["bank_name"],
        raw_message_hash=parsed["raw_message_hash"],
        timestamp=ts,
        description=parsed["description"]
    )
    
    return process_incoming_transaction(db, current_user.id, mobile_payload)

@router.post("/transaction", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def sync_single_transaction(
    payload: MobileTransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ingests and processes a single transaction SMS payload detected on-device.
    Idempotent.
    """
    try:
        tx = process_incoming_transaction(db, current_user.id, payload)
        return tx
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process transaction: {str(e)}"
        )

@router.post("/sync", response_model=List[TransactionOut], status_code=status.HTTP_201_CREATED)
def sync_batch_transactions(
    payloads: List[MobileTransactionCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Synchronizes a batch of queued offline transactions from the Android client.
    Ensures duplicate safety and order of events.
    """
    synchronized_txs = []
    sorted_payloads = sorted(payloads, key=lambda x: x.timestamp)
    
    for payload in sorted_payloads:
        try:
            tx = process_incoming_transaction(db, current_user.id, payload)
            synchronized_txs.append(tx)
        except Exception as e:
            print(f"Skipping bad transaction in batch: {e}")
            continue
            
    return synchronized_txs
