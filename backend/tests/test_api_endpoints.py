import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.database import Base
from backend.app.models import User, Passenger, Luggage
from backend.app.auth import hash_password, create_access_token
from backend.app.routers.auth_routes import login
from backend.app.routers.passenger_routes import list_passengers, create_passenger, generate_qr_for_passenger
from backend.app.routers.luggage_routes import list_luggage
from backend.app.routers.verification_routes import verify_luggage, get_verification_history
from backend.app.routers.stats_routes import get_dashboard_stats
from backend.app.schemas import UserLogin, PassengerCreate, VerificationRequest

TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture
def test_db():
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()

    # Seed admin user
    admin = User(
        username="admin",
        password_hash=hash_password("admin123"),
        full_name="Chief Admin",
        role="admin"
    )
    db.add(admin)
    db.commit()

    yield db, admin
    db.close()

def test_auth_login_endpoint(test_db):
    db, admin = test_db
    login_req = UserLogin(username="admin", password="admin123")
    res = login(login_req, db)
    assert res.access_token is not None
    assert res.user.username == "admin"

def test_passenger_creation_and_luggage_generation(test_db):
    db, admin = test_db
    p_in = PassengerCreate(
        passenger_id="P201",
        name="Vikram Singh",
        mobile_number="9899887766",
        boarding_stop="Central Terminus",
        destination_stop="Airport Hub",
        luggage_count=2
    )
    p = create_passenger(p_in, db, current_user=admin)
    assert p.display_id == "P201"

    # Explicitly create QR code
    res = generate_qr_for_passenger(p.passenger_id, db, current_user=admin)
    assert len(res.luggage_items) == 2
    assert res.luggage_items[0].luggage_tag.endswith("P201-L1")
    assert res.luggage_items[1].luggage_tag.endswith("P201-L2")

def test_verification_flow_and_stats(test_db):
    db, admin = test_db
    p_in = PassengerCreate(
        passenger_id="P202",
        name="Sunita Rao",
        mobile_number="9833445566",
        boarding_stop="North Station",
        destination_stop="City Center",
        luggage_count=2
    )
    p = create_passenger(p_in, db, current_user=admin)
    res = generate_qr_for_passenger(p.passenger_id, db, current_user=admin)
    tokens = [item.qr_token for item in res.luggage_items]

    # Verify luggage
    v_req = VerificationRequest(
        passenger_name="Sunita Rao",
        mobile_number="9833445566",
        destination_stop="City Center",
        luggage_count=2,
        scanned_tokens=tokens
    )
    v_res = verify_luggage(v_req, db, current_user=admin)
    assert v_res.status == "SUCCESS"
    assert v_res.title == "VERIFICATION SUCCESSFUL"

    # Check stats
    stats = get_dashboard_stats(db, current_user=admin)
    assert stats["total_passengers"] == 1
    assert stats["collected_luggage"] == 2
    assert stats["successful_verifications"] == 1

    # Check history
    history = get_verification_history(result="SUCCESS", passenger_id=p.passenger_id, limit=10, offset=0, db=db, current_user=admin)
    assert len(history) == 1
    assert history[0].passenger_name_input == "Sunita Rao"

def test_single_customer_multi_bag_consecutive_scanning(test_db):
    """
    Test user requirement: For one customer even if he has 4 bags,
    only 1 QR code is generated, and scanning 4 times consecutively
    automatically verifies Bag 1, Bag 2, Bag 3, Bag 4!
    """
    from backend.app.routers.luggage_routes import scan_luggage, ScanRequest

    db, admin = test_db
    p_in = PassengerCreate(
        passenger_id="P400",
        name="Ananya Sharma",
        mobile_number="9876500000",
        boarding_stop="Station A",
        destination_stop="Station B",
        luggage_count=4
    )
    p = create_passenger(p_in, db, current_user=admin)
    p_res = generate_qr_for_passenger(p.passenger_id, db, current_user=admin)
    assert len(p_res.luggage_items) == 4

    # Verify that all 4 bags have the exact same 1 QR code image
    assert p_res.luggage_items[0].qr_data_url is not None
    assert p_res.luggage_items[0].qr_data_url == p_res.luggage_items[1].qr_data_url
    assert p_res.luggage_items[1].qr_data_url == p_res.luggage_items[2].qr_data_url
    assert p_res.luggage_items[2].qr_data_url == p_res.luggage_items[3].qr_data_url

    # Now simulate scanning the customer's QR code 4 times
    qr_code_text = f"SCANLY - LUGGAGE VERIFICATION\nPassenger: Ananya Sharma\nTag: {p.passenger_id}"

    # Scan 1: verifies Bag 1 of 4
    scan1 = scan_luggage(ScanRequest(code=qr_code_text, auto_collect=True), db, current_user=admin)
    assert scan1["collected_count"] == 1
    assert scan1["total_count"] == 4
    assert scan1["all_collected"] is False
    assert scan1["just_collected_tag"].endswith("P400-L1")

    # Scan 2: verifies Bag 2 of 4
    scan2 = scan_luggage(ScanRequest(code=qr_code_text, auto_collect=True), db, current_user=admin)
    assert scan2["collected_count"] == 2
    assert scan2["all_collected"] is False
    assert scan2["just_collected_tag"].endswith("P400-L2")

    # Scan 3: verifies Bag 3 of 4
    scan3 = scan_luggage(ScanRequest(code=qr_code_text, auto_collect=True), db, current_user=admin)
    assert scan3["collected_count"] == 3
    assert scan3["all_collected"] is False
    assert scan3["just_collected_tag"].endswith("P400-L3")

    # Scan 4: verifies Bag 4 of 4 (all completed!)
    scan4 = scan_luggage(ScanRequest(code=qr_code_text, auto_collect=True), db, current_user=admin)
    assert scan4["collected_count"] == 4
    assert scan4["all_collected"] is True
    assert scan4["just_collected_tag"].endswith("P400-L4")
