from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.transaction import MobileTransactionCreate, TransactionOut
from app.services.transaction_service import process_incoming_transaction
from typing import List

router = APIRouter(prefix="/mobile", tags=["mobile"])

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
    # Process sequentially to preserve linking (e.g. debits before refunds)
    # Sort by timestamp ascending
    sorted_payloads = sorted(payloads, key=lambda x: x.timestamp)
    
    for payload in sorted_payloads:
        try:
            tx = process_incoming_transaction(db, current_user.id, payload)
            synchronized_txs.append(tx)
        except Exception as e:
            # We skip faulty records to avoid halting the entire queue,
            # but in a real-world app we could return partial status.
            print(f"Skipping bad transaction in batch: {e}")
            continue
            
    return synchronized_txs
