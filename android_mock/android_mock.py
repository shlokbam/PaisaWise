import os
import sys
import json
import httpx
from datetime import datetime
from typing import List, Dict, Any, Optional

# Add backend to path so we can import parser
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.parsers.sms_parser import parse_sms, is_financial_sms

QUEUE_FILE = "android_mock_queue.json"
API_BASE_URL = "http://127.0.0.1:8000/api/v1"

# Sample SMS representing a stream of incoming messages
SMS_STREAM = [
    # 1. Verification SMS (should be filtered out)
    {"sender": "AD-HDFCBK", "body": "Your OTP for HDFC Bank Transaction of Rs. 2,500 is 123456. Do not share this code."},
    
    # 2. Promotional SMS (should be filtered out)
    {"sender": "MD-ZOMATO", "body": "Satisfy your cravings today! Get 40% discount up to Rs 100 on Zomato food orders. Code: HUNGRY."},
    
    # 3. Personal transaction 1 - Chai
    {"sender": "VM-HDFCBK", "body": "Rs.40 debited from A/c XX1234 through UPI to CHAI POINT ref 62910"},
    
    # 4. Personal transaction 2 - Swiggy
    {"sender": "VM-HDFCBK", "body": "Your A/c XX1234 has been debited by Rs.180.00 for transfer to SWIGGY UPI VPA swiggy@upi"},
    
    # 5. Personal transaction 3 - Uber Auto
    {"sender": "MD-SBIBNK", "body": "Amt Sent Rs.220.00 from SBI A/c X5678 to UBER UPI Ref 88201"},
    
    # 6. Monthly Subscription - YouTube Premium
    {"sender": "VM-HDFCBK", "body": "Your A/c XX1234 is debited with INR 129.00 on 2026-08-15 for YOUTUBE PREMIUM subscription"},
    
    # 7. Low confidence transaction (needs review)
    {"sender": "VM-ICICIB", "body": "Dear Customer, txn of Rs 1250.00, Card ending in 9999 debited to XYZ ENTERPRISES on 15-08-26"},
    
    # 8. Family Investment (IPO)
    {"sender": "MD-SBIBNK", "body": "NSE IPO: Rs.15000.00 debited from SBI A/c XX5678 for Application ID 129481"},
    
    # 9. Income Credit (Rent)
    {"sender": "VM-HDFCBK", "body": "Rs.20000.00 credited to A/c XX1234 from RAMESH KUMAR ref rent Aug"},
    
    # 10. Self Transfer between user accounts
    {"sender": "MD-SBIBNK", "body": "A/c XX5678 debited by Rs.10000.00 for transfer to HDFC account xx1234"},
    
    # 11. Friend Settlement Credit
    {"sender": "VM-HDFCBK", "body": "Rs.500.00 credited to A/c XX1234 from AMIT SHARMA through UPI"}
]

def load_queue() -> List[Dict[str, Any]]:
    if os.path.exists(QUEUE_FILE):
        with open(QUEUE_FILE, "r") as f:
            return json.load(f)
    return []

def save_queue(queue: List[Dict[str, Any]]):
    with open(QUEUE_FILE, "w") as f:
        json.dump(queue, f, indent=2)

def authenticate_backend() -> Optional[str]:
    """Logs in to the backend using mock credentials to retrieve JWT token."""
    login_url = f"{API_BASE_URL}/auth/login-json"
    credentials = {"email": "shlok@paisawise.com", "password": "password"}
    try:
        resp = httpx.post(login_url, json=credentials)
        if resp.status_code == 200:
            return resp.json()["access_token"]
        else:
            print(f"Login failed: {resp.text}")
    except Exception as e:
        print(f"Failed to connect to backend: {e}")
    return None

def process_sms_stream():
    """Simulates Android local receiver parsing and queueing."""
    print("=== Android SMS Local Processing Simulator ===")
    print(f"Scanning stream of {len(SMS_STREAM)} messages...")
    
    queue = load_queue()
    added_count = 0
    filtered_count = 0
    
    for item in SMS_STREAM:
        body = item["body"]
        sender = item["sender"]
        
        # 1. Local Filtering (OTP / Spam)
        if not is_financial_sms(body):
            filtered_count += 1
            continue
            
        # 2. Local Parsing
        parsed = parse_sms(body, sender)
        if parsed:
            # Check duplicates in local queue
            if any(q["raw_message_hash"] == parsed["raw_message_hash"] for q in queue):
                continue
            # Convert Decimal to float for JSON serialization
            parsed["amount"] = float(parsed["amount"])
            
            # Add metadata
            parsed["timestamp"] = datetime.utcnow().isoformat()
            queue.append(parsed)
            added_count += 1
            
    save_queue(queue)
    print(f"Done. Filtered (OTP/Spam): {filtered_count}, Added to local Offline Queue: {added_count}")
    print(f"Current local queue size: {len(queue)}")

def sync_queue_to_backend():
    """Simulates Android SyncWorker batch syncing to central API."""
    queue = load_queue()
    if not queue:
        print("No transactions in local queue to synchronize.")
        return
        
    print("\n=== Synchronizing Offline Queue to PaisaWise Backend ===")
    token = authenticate_backend()
    if not token:
        print("Sync failed: Could not authenticate with backend dev server.")
        return
        
    headers = {"Authorization": f"Bearer {token}"}
    sync_url = f"{API_BASE_URL}/mobile/sync"
    
    # We send payloads in batch
    try:
        print(f"Sending {len(queue)} transactions to {sync_url}...")
        resp = httpx.post(sync_url, json=queue, headers=headers, timeout=15.0)
        if resp.status_code == 201:
            print("Synchronization complete!")
            # Empty local queue
            save_queue([])
            print(f"Cleared local queue. Sync results:")
            for tx in resp.json():
                inclusion = "INCLUDED" if tx['include_in_personal_expenses'] else "EXCLUDED"
                print(f" - {tx['merchant_name'] or tx['sender'] or 'Unknown'}: ₹{tx['amount']} ({tx['ownership']} {tx['transaction_type']} -> {inclusion}, Confidence: {int(float(tx['confidence'])*100)}%)")
        else:
            print(f"Sync failed with status code {resp.status_code}: {resp.text}")
    except Exception as e:
        print(f"Sync connection error: {e}")

if __name__ == "__main__":
    # Simulate receiving SMS
    process_sms_stream()
    
    # Ask if user wants to sync
    choice = input("\nDo you want to sync the offline queue with the backend? [Y/n]: ").strip().lower()
    if choice in ("", "y", "yes"):
        sync_queue_to_backend()
