import json
from datetime import datetime, timezone
from typing import List
from sqlalchemy.orm import Session
from ..models import Luggage, Passenger, VerificationLog
from ..schemas import VerificationRequest, VerificationResponse, ScannedLuggageDetail, PassengerResponse

def clean_string(s: str) -> str:
    return s.strip().lower() if s else ""

def clean_phone(phone: str) -> str:
    cleaned = "".join(filter(str.isdigit, phone))
    return cleaned

def perform_verification(db: Session, req: VerificationRequest, operator_id: str) -> VerificationResponse:
    """
    Implements all strict verification rules.
    Only allows collection when ALL conditions are met.
    """
    input_name_clean = clean_string(req.passenger_name)
    input_phone_clean = clean_phone(req.mobile_number)
    input_dest_clean = clean_string(req.destination_stop)
    expected_count = req.luggage_count
    scanned_tokens = [t.strip() for t in req.scanned_tokens if t and t.strip()]

    # Helper function to log and return failure
    def log_and_fail(reason: str, passenger_id: str = None, scanned_details: List[ScannedLuggageDetail] = None, p_res: PassengerResponse = None) -> VerificationResponse:
        v_log = VerificationLog(
            passenger_id=passenger_id,
            passenger_name_input=req.passenger_name,
            mobile_number_input=req.mobile_number,
            destination_stop_input=req.destination_stop,
            luggage_count_expected=expected_count,
            luggage_count_scanned=len(scanned_tokens),
            scanned_tags=json.dumps(scanned_tokens),
            result="FAILED",
            failure_reason=reason,
            operator_id=operator_id,
            timestamp=datetime.now(timezone.utc)
        )
        db.add(v_log)
        db.commit()
        db.refresh(v_log)

        return VerificationResponse(
            status="FAILED",
            title="VERIFICATION FAILED",
            message="Please check passenger details and luggage ownership.",
            failure_reason=reason,
            passenger=p_res,
            scanned_details=scanned_details or [],
            log_id=v_log.id
        )

    # 1. Check for Duplicate QR scans in the input
    if len(scanned_tokens) != len(set(scanned_tokens)):
        return log_and_fail("Duplicate QR code scan detected in the current verification batch.")

    # 2. Check passenger by name and/or mobile number
    passengers_by_phone = db.query(Passenger).all()
    matching_passenger = None
    phone_matched = False
    name_matched = False

    for p in passengers_by_phone:
        p_phone_clean = clean_phone(p.mobile_number)
        p_name_clean = clean_string(p.name)
        
        is_phone_match = (p_phone_clean == input_phone_clean) or (len(p_phone_clean) >= 10 and len(input_phone_clean) >= 10 and p_phone_clean[-10:] == input_phone_clean[-10:])
        is_name_match = (p_name_clean == input_name_clean)

        if is_phone_match and is_name_match:
            matching_passenger = p
            phone_matched = True
            name_matched = True
            break
        elif is_name_match:
            name_matched = True
        elif is_phone_match:
            phone_matched = True

    if not name_matched and not phone_matched:
        return log_and_fail("Passenger not found. Neither passenger name nor mobile number matches any registered record.")

    if name_matched and not phone_matched:
        return log_and_fail(f"Incorrect mobile number provided for passenger '{req.passenger_name}'.")

    if phone_matched and not name_matched:
        return log_and_fail(f"Passenger name '{req.passenger_name}' does not match the registered owner for mobile number {req.mobile_number}.")

    if not matching_passenger:
        return log_and_fail("Passenger details could not be verified against the database.")

    p_response = PassengerResponse.model_validate(matching_passenger)

    # 3. Check Destination Stop
    if clean_string(matching_passenger.destination_stop) != input_dest_clean:
        return log_and_fail(
            f"Wrong destination: Registered destination for passenger {matching_passenger.passenger_id} is '{matching_passenger.destination_stop}', but verification attempted at '{req.destination_stop}'.",
            passenger_id=matching_passenger.passenger_id,
            p_res=p_response
        )

    # 4. Check Expected Luggage Count vs Registered Count
    if expected_count != matching_passenger.luggage_count:
        return log_and_fail(
            f"Luggage count mismatch: Passenger {matching_passenger.passenger_id} is registered with {matching_passenger.luggage_count} luggage item(s), but {expected_count} was entered.",
            passenger_id=matching_passenger.passenger_id,
            p_res=p_response
        )

    # 5. Check Scanned Items Count vs Expected Count
    if len(scanned_tokens) == 0:
        return log_and_fail(
            f"No luggage QR codes were scanned. Expected {expected_count} item(s).",
            passenger_id=matching_passenger.passenger_id,
            p_res=p_response
        )

    if len(scanned_tokens) < expected_count:
        return log_and_fail(
            f"Missing luggage item: Passenger is registered for {expected_count} bag(s), but only {len(scanned_tokens)} bag(s) were scanned.",
            passenger_id=matching_passenger.passenger_id,
            p_res=p_response
        )

    if len(scanned_tokens) > expected_count:
        return log_and_fail(
            f"Excess luggage scanned: Scanned {len(scanned_tokens)} items, but expected only {expected_count} bag(s).",
            passenger_id=matching_passenger.passenger_id,
            p_res=p_response
        )

    # 6. Retrieve and Validate Each Scanned QR Code
    scanned_details: List[ScannedLuggageDetail] = []
    scanned_luggage_records: List[Luggage] = []

    for token in scanned_tokens:
        luggage_item = db.query(Luggage).filter(
            (Luggage.qr_token == token) | (Luggage.luggage_tag == token)
        ).first()

        if not luggage_item:
            try:
                data = json.loads(token)
                if isinstance(data, dict) and "token" in data:
                    luggage_item = db.query(Luggage).filter(
                        (Luggage.qr_token == data["token"]) | (Luggage.luggage_tag == data.get("tag"))
                    ).first()
            except Exception:
                pass

        if not luggage_item:
            return log_and_fail(
                f"Invalid QR code: Scanned token '{token}' does not correspond to any valid luggage item in the system.",
                passenger_id=matching_passenger.passenger_id,
                scanned_details=scanned_details,
                p_res=p_response
            )

        actual_owner = db.query(Passenger).filter(Passenger.passenger_id == luggage_item.passenger_id).first()
        owner_name = actual_owner.name if actual_owner else "Unknown"

        is_owner = (luggage_item.passenger_id == matching_passenger.passenger_id)
        is_already_collected = (luggage_item.status == "COLLECTED")

        scanned_details.append(ScannedLuggageDetail(
            luggage_tag=luggage_item.luggage_tag,
            passenger_id=luggage_item.passenger_id,
            owner_name=owner_name,
            status=luggage_item.status,
            is_valid_for_this_passenger=is_owner,
            is_already_collected=is_already_collected
        ))

        # Check: Luggage belongs to another passenger!
        if not is_owner:
            return log_and_fail(
                f"Luggage mismatch: Luggage '{luggage_item.luggage_tag}' belongs to Passenger '{owner_name}' (ID: {luggage_item.passenger_id}), NOT to '{matching_passenger.name}'. Handover blocked!",
                passenger_id=matching_passenger.passenger_id,
                scanned_details=scanned_details,
                p_res=p_response
            )

        # Check: Luggage already collected (prevent duplicate collection)
        if is_already_collected:
            collected_time_str = luggage_item.collected_at.strftime('%Y-%m-%d %H:%M') if luggage_item.collected_at else "previously"
            return log_and_fail(
                f"Duplicate collection attempt: Luggage '{luggage_item.luggage_tag}' has already been collected {collected_time_str}. Cannot be collected twice.",
                passenger_id=matching_passenger.passenger_id,
                scanned_details=scanned_details,
                p_res=p_response
            )

        scanned_luggage_records.append(luggage_item)

    # ALL CHECKS PASSED: Mark luggage as COLLECTED
    now = datetime.now(timezone.utc)
    for item in scanned_luggage_records:
        item.status = "COLLECTED"
        item.collected_at = now
        item.collected_by_operator = operator_id

    # Log successful verification
    v_log = VerificationLog(
        passenger_id=matching_passenger.passenger_id,
        passenger_name_input=req.passenger_name,
        mobile_number_input=req.mobile_number,
        destination_stop_input=req.destination_stop,
        luggage_count_expected=expected_count,
        luggage_count_scanned=len(scanned_tokens),
        scanned_tags=json.dumps([item.luggage_tag for item in scanned_luggage_records]),
        result="SUCCESS",
        failure_reason=None,
        operator_id=operator_id,
        timestamp=now
    )
    db.add(v_log)
    db.commit()
    db.refresh(v_log)

    db.refresh(matching_passenger)
    updated_p_res = PassengerResponse.model_validate(matching_passenger)

    return VerificationResponse(
        status="SUCCESS",
        title="VERIFICATION SUCCESSFUL",
        message="Passenger identity verified. All luggage items belong to this passenger.",
        failure_reason=None,
        passenger=updated_p_res,
        scanned_details=scanned_details,
        log_id=v_log.id
    )
