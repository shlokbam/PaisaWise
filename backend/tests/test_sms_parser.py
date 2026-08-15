import sys
import os
from decimal import Decimal

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.parsers.sms_parser import parse_sms, is_financial_sms

def test_debit_sms():
    sms = "Rs.450 debited from A/c XX1234 through UPI to ZOMATO"
    parsed = parse_sms(sms, "VM-HDFCBK")
    assert parsed is not None
    assert parsed["amount"] == Decimal("450")
    assert parsed["direction"] == "DEBIT"
    assert parsed["merchant_name"] == "ZOMATO"
    assert parsed["account_last4"] == "1234"
    assert parsed["bank_name"] == "HDFC"
    assert parsed["payment_method"] == "UPI"

def test_credit_sms():
    sms = "Rs 20000.00 credited to A/c XX1234 from RAMESH KUMAR"
    parsed = parse_sms(sms, "MD-SBIBNK")
    assert parsed is not None
    assert parsed["amount"] == Decimal("20000")
    assert parsed["direction"] == "CREDIT"
    assert parsed["sender"] == "RAMESH KUMAR"
    assert parsed["account_last4"] == "1234"
    assert parsed["bank_name"] == "SBI"

def test_otp_ignored():
    sms = "Your OTP for HDFC Bank txn of Rs. 450 is 987654. Do not share it."
    assert is_financial_sms(sms) is False
    assert parse_sms(sms) is None

def test_promo_ignored():
    sms = "Get 50% discount on Zomato food orders today! Use code FOOD50. Max Rs 150 off."
    assert is_financial_sms(sms) is False
    assert parse_sms(sms) is None
