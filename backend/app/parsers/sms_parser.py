import re
from typing import Optional, Dict, Any
from decimal import Decimal
import hashlib

# Key phrases indicating transactions
TX_KEYWORDS = [
    r"debited", r"credited", r"debit", r"credit", r"transferred",
    r"withdrawn", r"deposited", r"sent", r"received", r"recd", r"spent",
    r"\bdr\.?\b", r"\bcr\.?\b"
]

# Key phrases indicating OTPs/Spam that must be ignored
SPAM_KEYWORDS = [
    r"otp", r"one time password", r"verification code", r"login code", r"verification link",
    r"security code", r"coupon", r"offer", r"discount", r"win Rs", r"avail", r"congratulations"
]

def generate_message_hash(body: str) -> str:
    """Generate a SHA-256 hash of the SMS body for duplicate detection."""
    clean_body = "".join(body.split()).lower()
    return hashlib.sha256(clean_body.encode("utf-8")).hexdigest()

def is_financial_sms(body: str) -> bool:
    """Determine if an SMS is a valid financial transaction and not spam/OTP."""
    body_lower = body.lower()
    
    # 1. Must contain at least one financial keyword
    has_tx_keyword = any(re.search(kw, body_lower) for kw in TX_KEYWORDS)
    if not has_tx_keyword:
        return False
        
    # 2. Must NOT contain any spam/OTP keyword
    is_spam = any(re.search(kw, body_lower) for kw in SPAM_KEYWORDS)
    if is_spam:
        return False
        
    # 3. Must contain some indicator of money (e.g. Rs, Rs., INR, INR., ₹)
    has_currency = any(kw in body_lower or "₹" in body for kw in ["rs", "inr", "usd"])
    if not has_currency:
        return False
        
    return True

def parse_sms(body: str, sender_address: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Parses a transaction SMS and returns normalized transaction dictionary.
    Returns None if the message cannot be successfully parsed.
    """
    if not is_financial_sms(body):
        return None
        
    body_clean = body.replace("\n", " ").strip()
    body_lower = body_clean.lower()
    
    # 1. Parse Amount
    amount = None
    # Matches patterns like Rs. 500, Rs.500.00, INR 500, Rs 500, ₹ 500, rs.500
    amt_match = re.search(r"(?:rs\.?|inr|₹|rs)\s*([\d,]+\.?\d*)", body_lower)
    if amt_match:
        try:
            amt_str = amt_match.group(1).replace(",", "")
            amount = Decimal(amt_str)
        except Exception:
            pass
            
    if not amount:
        return None
        
    # 2. Parse Direction (DEBIT / CREDIT)
    direction = "DEBIT" # default fallback
    if re.search(r"dr\.?\s+from\s+a/c", body_lower) or re.search(r"debited", body_lower) or re.search(r"\bdr\.?\b", body_lower):
        direction = "DEBIT"
    elif any(word in body_lower for word in ["credited", "received", "recd", "deposited", "added to"]):
        direction = "CREDIT"
    elif any(word in body_lower for word in ["withdrawn", "sent", "transferred to", "spent"]):
        direction = "DEBIT"
        
    # 3. Parse Account (Last 4 digits)
    account_last4 = None
    # Matches A/c XX1234, Account XX1234, A/c X1234, Card ending in 9999, xx1234, xxxxxx9162
    acct_match = re.search(r"(?:a/c|acct|account|card|xx)\s*(?:x)*\s*(\d{4})", body_lower)
    if acct_match:
        account_last4 = acct_match.group(1)
        
    # 4. Parse Institution/Bank
    bank_name = "UNKNOWN"
    if sender_address:
        sender_upper = sender_address.upper()
        if "HDFCBK" in sender_upper or "HDFC" in sender_upper:
            bank_name = "HDFC"
        elif "SBIBNK" in sender_upper or "SBI" in sender_upper:
            bank_name = "SBI"
        elif "ICICIB" in sender_upper or "ICICI" in sender_upper:
            bank_name = "ICICI"
        elif "AXISBK" in sender_upper or "AXIS" in sender_upper:
            bank_name = "AXIS"
        elif "PNBSMS" in sender_upper or "PNB" in sender_upper:
            bank_name = "PNB"
        elif "BOB" in sender_upper or "BARODA" in sender_upper:
            bank_name = "BOB"
            
    if bank_name == "UNKNOWN":
        if "hdfc" in body_lower:
            bank_name = "HDFC"
        elif "sbi" in body_lower or "state bank" in body_lower:
            bank_name = "SBI"
        elif "icici" in body_lower:
            bank_name = "ICICI"
        elif "axis" in body_lower:
            bank_name = "AXIS"
        elif "bob" in body_lower or "baroda" in body_lower:
            bank_name = "BOB"
            
    # 5. Parse Payment Method (UPI, CARD, NETBANKING)
    payment_method = "UPI"
    if "card" in body_lower or "spent on" in body_lower or "swipe" in body_lower:
        payment_method = "CARD"
    elif "netbanking" in body_lower or "neft" in body_lower or "imps" in body_lower or "rtgs" in body_lower:
        payment_method = "NETBANKING"
    elif "cash" in body_lower:
        payment_method = "CASH"
        
    # 6. Parse Merchant / Party Name
    merchant_name = None
    upi_id = None
    sender = None
    receiver = None
    
    # Try to find UPI ID
    upi_match = re.search(r"([\w\.\-]+@[\w\-]+)", body_lower)
    if upi_match:
        upi_id = upi_match.group(1)
        
    # Check for "cr. to <merchant>" pattern (common in BOB / Kotak UPI SMS)
    cr_to_match = re.search(r"cr\.\s+to\s+([a-zA-Z0-9\.\_\-]+)", body_lower)
    if cr_to_match:
        extracted = cr_to_match.group(1)
        if "@" in extracted:
            merchant_raw = extracted.split("@")[0].split(".")[0]
        else:
            merchant_raw = extracted.split(".")[0]
        merchant_name = merchant_raw.capitalize()

    # If no merchant yet, attempt standard regexes
    if not merchant_name:
        if direction == "DEBIT":
            to_match = re.search(r"(?:to|at|vpa)\s+([a-zA-Z0-9\s\.\*]+?)(?:\s+ref|\s+on|\s+via|\s+through|\s+bal|\s+limit|\.|\s*$)", body_clean, re.IGNORECASE)
            if to_match:
                entity = to_match.group(1).strip()
                entity = re.sub(r'(?:Ref|RefNo|VPA|UPI|Ref\s+\d+|Bal|Balance|A/c).*$', '', entity, flags=re.IGNORECASE).strip()
                receiver = entity
                merchant_name = entity
        else:
            from_match = re.search(r"(?:from|by|at)\s+([a-zA-Z0-9\s\.\*]+?)(?:\s+ref|\s+on|\s+via|\s+through|\s+bal|\.|\s*$)", body_clean, re.IGNORECASE)
            if from_match:
                entity = from_match.group(1).strip()
                entity = re.sub(r'(?:Ref|RefNo|VPA|UPI|Ref\s+\d+|Bal|Balance|A/c).*$', '', entity, flags=re.IGNORECASE).strip()
                sender = entity
                merchant_name = entity

    # Clean up merchant name
    if merchant_name:
        merchant_name = re.sub(r'[\*\.\s]+$', '', merchant_name).strip()
        if "zepto" in merchant_name.lower():
            merchant_name = "Zepto"
        elif "swiggy" in merchant_name.lower():
            merchant_name = "Swiggy"
        elif "zomato" in merchant_name.lower():
            merchant_name = "Zomato"
        elif "uber" in merchant_name.lower():
            merchant_name = "Uber"
        elif "amazon" in merchant_name.lower():
            merchant_name = "Amazon"
            
    return {
        "amount": amount,
        "currency": "INR",
        "direction": direction,
        "payment_method": payment_method,
        "merchant_name": merchant_name,
        "upi_id": upi_id,
        "sender": sender,
        "receiver": receiver,
        "account_last4": account_last4,
        "bank_name": bank_name,
        "raw_message_hash": generate_message_hash(body),
        "description": body_clean
    }
