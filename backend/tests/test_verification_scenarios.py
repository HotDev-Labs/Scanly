import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.database import Base
from backend.app.models import User, Passenger, Luggage
from backend.app.schemas import VerificationRequest
from backend.app.services.verification_service import perform_verification
from backend.app.services.qr_service import ensure_luggage_for_passenger
from backend.app.auth import hash_password

TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture
def db_session():
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()

    # Seed operator
    operator = User(
        username="test_operator",
        password_hash=hash_password("password"),
        full_name="Test Operator",
        role="operator"
    )
    session.add(operator)

    # Seed Passenger 1 (Rahul, 3 bags, Destination: Airport Hub)
    p1 = Passenger(
        passenger_id="P101",
        name="Rahul Sharma",
        mobile_number="9876543210",
        boarding_stop="Central Bus Terminus",
        destination_stop="Airport Hub",
        luggage_count=3
    )
    session.add(p1)

    # Seed Passenger 2 (Priya, 2 bags, Destination: City Center)
    p2 = Passenger(
        passenger_id="P102",
        name="Priya Patel",
        mobile_number="9823456789",
        boarding_stop="Central Bus Terminus",
        destination_stop="City Center",
        luggage_count=2
    )
    session.add(p2)

    session.commit()

    # Generate QR codes for luggage
    ensure_luggage_for_passenger(session, p1)
    ensure_luggage_for_passenger(session, p2)

    yield session
    session.close()

# Scenario 1: Correct passenger and correct luggage
def test_scenario_1_correct_passenger_and_luggage(db_session):
    p1_items = db_session.query(Luggage).filter(Luggage.passenger_id == "P101").all()
    assert len(p1_items) == 3
    tokens = [item.qr_token for item in p1_items]

    req = VerificationRequest(
        passenger_name="Rahul Sharma",
        mobile_number="9876543210",
        destination_stop="Airport Hub",
        luggage_count=3,
        scanned_tokens=tokens
    )
    result = perform_verification(db_session, req, operator_id="test_operator")

    assert result.status == "SUCCESS"
    assert result.title == "VERIFICATION SUCCESSFUL"
    assert "Passenger identity verified" in result.message

    # Verify luggage status updated in DB
    updated_items = db_session.query(Luggage).filter(Luggage.passenger_id == "P101").all()
    for item in updated_items:
        assert item.status == "COLLECTED"
        assert item.collected_at is not None

# Scenario 2: Correct passenger and wrong luggage (mixing in another passenger's bag)
def test_scenario_2_correct_passenger_wrong_luggage(db_session):
    p1_items = db_session.query(Luggage).filter(Luggage.passenger_id == "P101").all()
    p2_items = db_session.query(Luggage).filter(Luggage.passenger_id == "P102").all()

    # 2 of P1's bags and 1 of P2's bag
    mixed_tokens = [p1_items[0].qr_token, p1_items[1].qr_token, p2_items[0].qr_token]

    req = VerificationRequest(
        passenger_name="Rahul Sharma",
        mobile_number="9876543210",
        destination_stop="Airport Hub",
        luggage_count=3,
        scanned_tokens=mixed_tokens
    )
    result = perform_verification(db_session, req, operator_id="test_operator")

    assert result.status == "FAILED"
    assert result.title == "VERIFICATION FAILED"
    assert "Luggage mismatch" in result.failure_reason

# Scenario 3: Incorrect mobile number
def test_scenario_3_incorrect_mobile_number(db_session):
    p1_items = db_session.query(Luggage).filter(Luggage.passenger_id == "P101").all()
    tokens = [item.qr_token for item in p1_items]

    req = VerificationRequest(
        passenger_name="Rahul Sharma",
        mobile_number="9999999999",  # Wrong mobile
        destination_stop="Airport Hub",
        luggage_count=3,
        scanned_tokens=tokens
    )
    result = perform_verification(db_session, req, operator_id="test_operator")

    assert result.status == "FAILED"
    assert "Incorrect mobile number" in result.failure_reason

# Scenario 4: Invalid QR code
def test_scenario_4_invalid_qr_code(db_session):
    p1_items = db_session.query(Luggage).filter(Luggage.passenger_id == "P101").all()
    fake_tokens = [p1_items[0].qr_token, p1_items[1].qr_token, "INVALID-QR-TOKEN-XYZ-12345"]

    req = VerificationRequest(
        passenger_name="Rahul Sharma",
        mobile_number="9876543210",
        destination_stop="Airport Hub",
        luggage_count=3,
        scanned_tokens=fake_tokens
    )
    result = perform_verification(db_session, req, operator_id="test_operator")

    assert result.status == "FAILED"
    assert "Invalid QR code" in result.failure_reason

# Scenario 5: Scanning the same QR code twice
def test_scenario_5_duplicate_qr_scan_in_batch(db_session):
    p1_items = db_session.query(Luggage).filter(Luggage.passenger_id == "P101").all()
    duplicate_tokens = [p1_items[0].qr_token, p1_items[0].qr_token, p1_items[1].qr_token]

    req = VerificationRequest(
        passenger_name="Rahul Sharma",
        mobile_number="9876543210",
        destination_stop="Airport Hub",
        luggage_count=3,
        scanned_tokens=duplicate_tokens
    )
    result = perform_verification(db_session, req, operator_id="test_operator")

    assert result.status == "FAILED"
    assert "Duplicate QR code scan detected" in result.failure_reason

# Scenario 6: Passenger has three luggage bags but scans only two
def test_scenario_6_missing_luggage_item(db_session):
    p1_items = db_session.query(Luggage).filter(Luggage.passenger_id == "P101").all()
    only_two_tokens = [p1_items[0].qr_token, p1_items[1].qr_token]

    req = VerificationRequest(
        passenger_name="Rahul Sharma",
        mobile_number="9876543210",
        destination_stop="Airport Hub",
        luggage_count=3,
        scanned_tokens=only_two_tokens
    )
    result = perform_verification(db_session, req, operator_id="test_operator")

    assert result.status == "FAILED"
    assert "Missing luggage item" in result.failure_reason

# Scenario 7: Passenger attempts to collect luggage belonging to another passenger
def test_scenario_7_passenger_attempts_to_collect_other_passenger_luggage(db_session):
    p2_items = db_session.query(Luggage).filter(Luggage.passenger_id == "P102").all()
    p2_tokens = [item.qr_token for item in p2_items]

    # Passenger 1 (Rahul) attempts to collect Passenger 2's bags (Priya's bags)
    req = VerificationRequest(
        passenger_name="Rahul Sharma",
        mobile_number="9876543210",
        destination_stop="Airport Hub",
        luggage_count=2,  # Also trying to say 2 bags
        scanned_tokens=p2_tokens
    )
    result = perform_verification(db_session, req, operator_id="test_operator")

    assert result.status == "FAILED"
    # Should fail either on registered count mismatch (P1 has 3 bags registered, entered 2) or luggage mismatch
    assert result.status == "FAILED"

    # Even if expected count was set to 3 and scanned 3 of someone else's:
    p2_single = [p2_items[0].qr_token, p2_items[1].qr_token, p2_items[0].qr_token]
    req2 = VerificationRequest(
        passenger_name="Rahul Sharma",
        mobile_number="9876543210",
        destination_stop="Airport Hub",
        luggage_count=3,
        scanned_tokens=[p2_items[0].qr_token, p2_items[1].qr_token, "P102-L3-fake"]
    )
    result2 = perform_verification(db_session, req2, operator_id="test_operator")
    assert result2.status == "FAILED"
    assert ("Luggage mismatch" in result2.failure_reason or "Invalid QR code" in result2.failure_reason)

# Scenario 8: Double collection prevention (collected luggage cannot be collected again)
def test_scenario_8_double_collection_prevention(db_session):
    p1_items = db_session.query(Luggage).filter(Luggage.passenger_id == "P101").all()
    tokens = [item.qr_token for item in p1_items]

    req = VerificationRequest(
        passenger_name="Rahul Sharma",
        mobile_number="9876543210",
        destination_stop="Airport Hub",
        luggage_count=3,
        scanned_tokens=tokens
    )
    # First collection
    res1 = perform_verification(db_session, req, operator_id="test_operator")
    assert res1.status == "SUCCESS"

    # Second attempt to collect the exact same luggage
    res2 = perform_verification(db_session, req, operator_id="test_operator")
    assert res2.status == "FAILED"
    assert "Duplicate collection attempt" in res2.failure_reason
