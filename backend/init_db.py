import os
import sys
from datetime import datetime, date, time, timedelta
from decimal import Decimal

# Add parent directory to path so we can import app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import Base, engine, SessionLocal
from app.core.security import get_password_hash
from app.models.user import User
from app.models.account import Account
from app.models.category import Category, Subcategory
from app.models.merchant import Merchant
from app.models.transaction import Transaction, TransactionLink
from app.models.rule import Rule
from app.models.budget import Budget
from app.models.notification import Notification

def init_database():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if already seeded
        existing_user = db.query(User).filter_by(email="demo@paisawise.com").first()
        if existing_user:
            print("Database already seeded. Skipping seed process.")
            return

        print("Seeding database...")
        
        # 1. Create Default Categories and Subcategories
        default_categories = {
            "FOOD": ("Food & Dining", "#FF9F43", [
                ("Chai", "CHAI"),
                ("Snacks", "SNACKS"),
                ("Restaurant", "RESTAURANT"),
                ("Zomato", "ZOMATO"),
                ("Swiggy", "SWIGGY")
            ]),
            "GROCERIES": ("Groceries", "#4BDB81", [
                ("Grocery Store", "GROCERY_STORE"),
                ("Supermarket", "SUPERMARKET"),
                ("Household", "HOUSEHOLD")
            ]),
            "TRANSPORT": ("Transport", "#54A0FF", [
                ("Uber", "UBER"),
                ("Ola", "OLA"),
                ("Metro", "METRO"),
                ("Bus", "BUS"),
                ("Fuel", "FUEL")
            ]),
            "SHOPPING": ("Shopping", "#FF6B6B", [
                ("Amazon", "AMAZON"),
                ("Clothing", "CLOTHING"),
                ("Electronics", "ELECTRONICS"),
                ("Other", "SHOPPING_OTHER")
            ]),
            "ENTERTAINMENT": ("Entertainment", "#A855F7", [
                ("Movies", "MOVIES"),
                ("Games", "GAMES"),
                ("Events", "EVENTS"),
                ("Other", "ENT_OTHER")
            ]),
            "SUBSCRIPTIONS": ("Subscriptions", "#FF9FF3", [
                ("Netflix", "NETFLIX"),
                ("Spotify", "SPOTIFY"),
                ("YouTube", "YOUTUBE"),
                ("ChatGPT", "CHATGPT"),
                ("Software", "SOFTWARE"),
                ("Cloud", "CLOUD")
            ]),
            "SOCIAL": ("Social & Gifts", "#F19066", [
                ("Friends", "FRIENDS"),
                ("Parties", "PARTIES"),
                ("Gifts", "GIFTS"),
                ("Other", "SOCIAL_OTHER")
            ]),
            "BILLS": ("Bills & Utilities", "#0ABDE3", [
                ("Mobile", "MOBILE"),
                ("Internet", "INTERNET"),
                ("Electricity", "ELECTRICITY"),
                ("Other", "BILLS_OTHER")
            ]),
            "INVESTMENT": ("Financial & Investments", "#1DD1A1", [
                ("IPO", "IPO"),
                ("Stocks", "STOCKS"),
                ("Mutual Funds", "MUTUAL_FUNDS"),
                ("SIP", "SIP"),
                ("Investments", "INVESTMENT_OTHER")
            ]),
            "EDUCATION": ("Education", "#10AC84", []),
            "HEALTH": ("Health & Medical", "#EE5253", []),
            "TRAVEL": ("Travel", "#01CBC6", []),
            "PERSONAL": ("Personal Care", "#FDA7DF", []),
            "OTHER": ("Other Expenses", "#8395A7", [])
        }

        category_objs = {}
        subcategory_objs = {}

        for code, (name, color, subs) in default_categories.items():
            cat = Category(name=name, code=code, color=color, is_custom=False)
            db.add(cat)
            db.flush() # populates cat.id
            category_objs[code] = cat
            
            for sub_name, sub_code in subs:
                sub = Subcategory(category_id=cat.id, name=sub_name, code=sub_code)
                db.add(sub)
                db.flush()
                subcategory_objs[sub_code] = sub

        # 2. Create Default Merchants
        merchants_seed = [
            ("ZOMATO", "Zomato", "FOOD", "ZOMATO"),
            ("SWIGGY", "Swiggy", "FOOD", "SWIGGY"),
            ("UBER", "Uber", "TRANSPORT", "UBER"),
            ("OLA", "Ola", "TRANSPORT", "OLA"),
            ("NETFLIX", "Netflix", "SUBSCRIPTIONS", "NETFLIX"),
            ("SPOTIFY", "Spotify", "SUBSCRIPTIONS", "SPOTIFY"),
            ("CHATGPT", "ChatGPT", "SUBSCRIPTIONS", "CHATGPT"),
            ("CHAI POINT", "Chai Point", "FOOD", "CHAI"),
            ("AMAZON", "Amazon", "SHOPPING", "AMAZON")
        ]

        merchant_objs = {}
        for raw_name, clean_name, cat_code, sub_code in merchants_seed:
            cat = category_objs[cat_code]
            sub = subcategory_objs[sub_code]
            merch = Merchant(
                name=raw_name,
                clean_name=clean_name,
                default_category_id=cat.id,
                default_subcategory_id=sub.id
            )
            db.add(merch)
            db.flush()
            merchant_objs[raw_name] = merch

        # 3. Create Demo User
        user = User(
            email="demo@paisawise.com",
            hashed_password=get_password_hash("password"),
            first_name="Demo User"
        )
        db.add(user)
        db.flush()

        # 4. Create Bank Accounts
        hdfc = Account(
            user_id=user.id,
            name="HDFC bank A/C",
            account_type="BANK",
            last_four="1234",
            institution_name="HDFC",
            ownership_type="MY_ACCOUNT"
        )
        sbi = Account(
            user_id=user.id,
            name="SBI Savings A/C",
            account_type="BANK",
            last_four="5678",
            institution_name="SBI",
            ownership_type="MY_ACCOUNT"
        )
        icici = Account(
            user_id=user.id,
            name="ICICI Credit Card",
            account_type="CREDIT_CARD",
            last_four="9999",
            institution_name="ICICI",
            ownership_type="MY_ACCOUNT"
        )
        db.add_all([hdfc, sbi, icici])
        db.flush()

        # 5. Budgets
        overall_budget = Budget(
            user_id=user.id,
            category_id=None,
            amount=Decimal("20000.00"),
            period_start=date(2026, 8, 1),
            period_end=date(2026, 8, 31)
        )
        food_budget = Budget(
            user_id=user.id,
            category_id=category_objs["FOOD"].id,
            amount=Decimal("6000.00"),
            period_start=date(2026, 8, 1),
            period_end=date(2026, 8, 31)
        )
        transport_budget = Budget(
            user_id=user.id,
            category_id=category_objs["TRANSPORT"].id,
            amount=Decimal("4000.00"),
            period_start=date(2026, 8, 1),
            period_end=date(2026, 8, 31)
        )
        shopping_budget = Budget(
            user_id=user.id,
            category_id=category_objs["SHOPPING"].id,
            amount=Decimal("3000.00"),
            period_start=date(2026, 8, 1),
            period_end=date(2026, 8, 31)
        )
        sub_budget = Budget(
            user_id=user.id,
            category_id=category_objs["SUBSCRIPTIONS"].id,
            amount=Decimal("1500.00"),
            period_start=date(2026, 8, 1),
            period_end=date(2026, 8, 31)
        )
        db.add_all([overall_budget, food_budget, transport_budget, shopping_budget, sub_budget])
        db.flush()

        # 6. Default User Rules
        rules = [
            Rule(
                user_id=user.id,
                name="Netflix Rule",
                merchant_pattern="NETFLIX",
                set_ownership="PERSONAL",
                set_transaction_type="EXPENSE",
                set_category_id=category_objs["SUBSCRIPTIONS"].id,
                set_subcategory_id=subcategory_objs["NETFLIX"].id,
                set_include_in_personal_expenses=True,
                priority=10
            ),
            Rule(
                user_id=user.id,
                name="Spotify Rule",
                merchant_pattern="SPOTIFY",
                set_ownership="PERSONAL",
                set_transaction_type="EXPENSE",
                set_category_id=category_objs["SUBSCRIPTIONS"].id,
                set_subcategory_id=subcategory_objs["SPOTIFY"].id,
                set_include_in_personal_expenses=True,
                priority=10
            ),
            Rule(
                user_id=user.id,
                name="Chai Point Rule",
                merchant_pattern="CHAI POINT",
                set_ownership="PERSONAL",
                set_transaction_type="EXPENSE",
                set_category_id=category_objs["FOOD"].id,
                set_subcategory_id=subcategory_objs["CHAI"].id,
                set_include_in_personal_expenses=True,
                priority=10
            ),
            Rule(
                user_id=user.id,
                name="Uber Auto Rule",
                merchant_pattern="UBER",
                set_ownership="PERSONAL",
                set_transaction_type="EXPENSE",
                set_category_id=category_objs["TRANSPORT"].id,
                set_subcategory_id=subcategory_objs["UBER"].id,
                set_include_in_personal_expenses=True,
                priority=10
            )
        ]
        db.add_all(rules)
        db.flush()

        # 7. Fake Transactions (Seed Data)
        today = date(2026, 8, 15)
        yesterday = date(2026, 8, 14)
        three_days_ago = date(2026, 8, 12)
        ten_days_ago = date(2026, 8, 5)

        txs = [
            # 1. Chai Point - ₹40
            Transaction(
                user_id=user.id,
                account_id=hdfc.id,
                amount=Decimal("40.00"),
                direction="DEBIT",
                transaction_date=today,
                transaction_time=time(9, 30),
                merchant_id=merchant_objs["CHAI POINT"].id,
                merchant_name="CHAI POINT",
                payment_method="UPI",
                ownership="PERSONAL",
                transaction_type="EXPENSE",
                category_id=category_objs["FOOD"].id,
                subcategory_id=subcategory_objs["CHAI"].id,
                confidence=Decimal("1.00"),
                include_in_personal_expenses=True,
                source="SMS",
                source_message_hash="hash_chai_40"
            ),
            # 2. Zomato - ₹250
            Transaction(
                user_id=user.id,
                account_id=icici.id,
                amount=Decimal("250.00"),
                direction="DEBIT",
                transaction_date=today,
                transaction_time=time(13, 15),
                merchant_id=merchant_objs["ZOMATO"].id,
                merchant_name="ZOMATO",
                payment_method="CARD",
                ownership="PERSONAL",
                transaction_type="EXPENSE",
                category_id=category_objs["FOOD"].id,
                subcategory_id=subcategory_objs["ZOMATO"].id,
                confidence=Decimal("0.95"),
                include_in_personal_expenses=True,
                source="SMS",
                source_message_hash="hash_zomato_250"
            ),
            # 3. Uber - ₹320
            Transaction(
                user_id=user.id,
                account_id=hdfc.id,
                amount=Decimal("320.00"),
                direction="DEBIT",
                transaction_date=today,
                transaction_time=time(18, 0),
                merchant_id=merchant_objs["UBER"].id,
                merchant_name="UBER",
                payment_method="UPI",
                ownership="PERSONAL",
                transaction_type="EXPENSE",
                category_id=category_objs["TRANSPORT"].id,
                subcategory_id=subcategory_objs["UBER"].id,
                confidence=Decimal("0.98"),
                include_in_personal_expenses=True,
                source="SMS",
                source_message_hash="hash_uber_320"
            ),
            # 4. Spotify - ₹119
            Transaction(
                user_id=user.id,
                account_id=icici.id,
                amount=Decimal("119.00"),
                direction="DEBIT",
                transaction_date=yesterday,
                transaction_time=time(10, 0),
                merchant_id=merchant_objs["SPOTIFY"].id,
                merchant_name="SPOTIFY",
                payment_method="CARD",
                ownership="PERSONAL",
                transaction_type="EXPENSE",
                category_id=category_objs["SUBSCRIPTIONS"].id,
                subcategory_id=subcategory_objs["SPOTIFY"].id,
                confidence=Decimal("1.00"),
                include_in_personal_expenses=True,
                source="SMS",
                source_message_hash="hash_spotify_119"
            ),
            # 5. Netflix - ₹649
            Transaction(
                user_id=user.id,
                account_id=hdfc.id,
                amount=Decimal("649.00"),
                direction="DEBIT",
                transaction_date=ten_days_ago,
                transaction_time=time(8, 0),
                merchant_id=merchant_objs["NETFLIX"].id,
                merchant_name="NETFLIX",
                payment_method="UPI",
                ownership="PERSONAL",
                transaction_type="EXPENSE",
                category_id=category_objs["SUBSCRIPTIONS"].id,
                subcategory_id=subcategory_objs["NETFLIX"].id,
                confidence=Decimal("1.00"),
                include_in_personal_expenses=True,
                source="SMS",
                source_message_hash="hash_netflix_649"
            ),
            # 6. Grocery Store - ₹1800
            Transaction(
                user_id=user.id,
                account_id=sbi.id,
                amount=Decimal("1800.00"),
                direction="DEBIT",
                transaction_date=three_days_ago,
                transaction_time=time(17, 30),
                merchant_name="RELIANCE MART",
                payment_method="UPI",
                ownership="PERSONAL",
                transaction_type="EXPENSE",
                category_id=category_objs["GROCERIES"].id,
                subcategory_id=subcategory_objs["GROCERY_STORE"].id,
                confidence=Decimal("0.90"),
                include_in_personal_expenses=True,
                source="SMS",
                source_message_hash="hash_reliance_1800"
            ),
            # 7. Rent Received - ₹20,000 (Credit, Exclude from spending)
            Transaction(
                user_id=user.id,
                account_id=hdfc.id,
                amount=Decimal("20000.00"),
                direction="CREDIT",
                transaction_date=date(2026, 8, 1),
                transaction_time=time(10, 0),
                sender="RAMESH KUMAR",
                payment_method="NETBANKING",
                ownership="PERSONAL",
                transaction_type="INCOME",
                confidence=Decimal("0.95"),
                include_in_personal_expenses=False,
                source="SMS",
                source_message_hash="hash_rent_20000"
            ),
            # 8. Father's IPO - ₹15,000 (Exclude from spending)
            Transaction(
                user_id=user.id,
                account_id=sbi.id,
                amount=Decimal("15000.00"),
                direction="DEBIT",
                transaction_date=date(2026, 8, 10),
                transaction_time=time(11, 45),
                merchant_name="NSE IPO",
                payment_method="UPI",
                ownership="FAMILY",
                transaction_type="INVESTMENT",
                category_id=category_objs["INVESTMENT"].id,
                subcategory_id=subcategory_objs["IPO"].id,
                confidence=Decimal("0.97"),
                include_in_personal_expenses=False,
                source="SMS",
                source_message_hash="hash_ipo_15000"
            ),
            # 9. Transfer SBI -> HDFC - ₹10,000 (Exclude from spending)
            Transaction(
                user_id=user.id,
                account_id=sbi.id,
                amount=Decimal("10000.00"),
                direction="DEBIT",
                transaction_date=date(2026, 8, 8),
                transaction_time=time(14, 0),
                receiver="SELF ACCOUNT TRANSFER",
                payment_method="NETBANKING",
                ownership="PERSONAL",
                transaction_type="TRANSFER",
                confidence=Decimal("0.98"),
                include_in_personal_expenses=False,
                source="SMS",
                source_message_hash="hash_transfer_sbi_10000"
            ),
            # 10. Friend Settlement - ₹500 (Credit, Exclude from spending)
            Transaction(
                user_id=user.id,
                account_id=hdfc.id,
                amount=Decimal("500.00"),
                direction="CREDIT",
                transaction_date=date(2026, 8, 11),
                transaction_time=time(19, 20),
                sender="AMIT SHARMA",
                payment_method="UPI",
                ownership="PERSONAL",
                transaction_type="SETTLEMENT",
                confidence=Decimal("0.92"),
                include_in_personal_expenses=False,
                source="SMS",
                source_message_hash="hash_settlement_500"
            ),
            # 11. Amazon Purchase - ₹700 (Original transaction for refund test)
            Transaction(
                user_id=user.id,
                account_id=icici.id,
                amount=Decimal("700.00"),
                direction="DEBIT",
                transaction_date=date(2026, 8, 3),
                transaction_time=time(15, 0),
                merchant_id=merchant_objs["AMAZON"].id,
                merchant_name="AMAZON",
                payment_method="CARD",
                ownership="PERSONAL",
                transaction_type="EXPENSE",
                category_id=category_objs["SHOPPING"].id,
                subcategory_id=subcategory_objs["AMAZON"].id,
                confidence=Decimal("0.96"),
                include_in_personal_expenses=True,
                source="SMS",
                source_message_hash="hash_amazon_700"
            ),
            # 12. Amazon Refund - ₹700 (Credit, Exclude from spending, linked to above)
            Transaction(
                user_id=user.id,
                account_id=icici.id,
                amount=Decimal("700.00"),
                direction="CREDIT",
                transaction_date=date(2026, 8, 6),
                transaction_time=time(12, 0),
                merchant_id=merchant_objs["AMAZON"].id,
                merchant_name="AMAZON REFUND",
                payment_method="CARD",
                ownership="PERSONAL",
                transaction_type="REFUND",
                confidence=Decimal("0.94"),
                include_in_personal_expenses=False,
                source="SMS",
                source_message_hash="hash_refund_700"
            ),
            # 13. Unknown Merchant Needs Review - ₹1,250 (Needs review, low confidence)
            Transaction(
                user_id=user.id,
                account_id=hdfc.id,
                amount=Decimal("1250.00"),
                direction="DEBIT",
                transaction_date=yesterday,
                transaction_time=time(21, 10),
                merchant_name="XYZ ENTERPRISES",
                payment_method="UPI",
                ownership="UNKNOWN",
                transaction_type="EXPENSE",
                category_id=category_objs["SHOPPING"].id,
                subcategory_id=subcategory_objs["SHOPPING_OTHER"].id,
                confidence=Decimal("0.62"),
                include_in_personal_expenses=False, # needs review
                source="SMS",
                source_message_hash="hash_xyz_1250"
            )
        ]
        
        db.add_all(txs)
        db.flush()

        # Link the refund to the original transaction
        orig_amazon = db.query(Transaction).filter_by(source_message_hash="hash_amazon_700").first()
        refund_amazon = db.query(Transaction).filter_by(source_message_hash="hash_refund_700").first()
        if orig_amazon and refund_amazon:
            link = TransactionLink(
                source_transaction_id=orig_amazon.id,
                target_transaction_id=refund_amazon.id,
                link_type="REFUND"
            )
            db.add(link)
            
        # Create Notifications for transactions that need review
        unk_tx = db.query(Transaction).filter_by(source_message_hash="hash_xyz_1250").first()
        if unk_tx:
            notif = Notification(
                user_id=user.id,
                transaction_id=unk_tx.id,
                title="Review Transaction",
                message=f"PaisaWise detected a transaction of ₹{unk_tx.amount} to {unk_tx.merchant_name} but has low confidence. Please review.",
                status="PENDING",
                notification_type="NEEDS_REVIEW"
            )
            db.add(notif)

        db.commit()
        print("Database seeding completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    init_database()
