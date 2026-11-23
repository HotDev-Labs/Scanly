import csv
import io
import re
from typing import List, Tuple, Any
import requests
import openpyxl
from sqlalchemy.orm import Session
from ..models import Passenger
from ..schemas import ImportRow, ImportPreviewResponse, PassengerBase

COLUMN_MAPPING = {
    "passenger id": "passenger_id",
    "passengerid": "passenger_id",
    "id": "passenger_id",
    "sno": "passenger_id",
    "s no": "passenger_id",
    "s.no": "passenger_id",
    "sl no": "passenger_id",
    "sr no": "passenger_id",
    "serial no": "passenger_id",
    "serial number": "passenger_id",
    "no": "passenger_id",
    "name": "name",
    "passenger name": "name",
    "customer name": "name",
    "full name": "name",
    "mobile number": "mobile_number",
    "mobile": "mobile_number",
    "phone": "mobile_number",
    "phone number": "mobile_number",
    "contact": "mobile_number",
    "boarding stop": "boarding_stop",
    "boarding": "boarding_stop",
    "boarding place": "boarding_stop",
    "place 1": "boarding_stop",
    "place1": "boarding_stop",
    "source": "boarding_stop",
    "from": "boarding_stop",
    "destination stop": "destination_stop",
    "destination": "destination_stop",
    "destination place": "destination_stop",
    "place 2": "destination_stop",
    "place2": "destination_stop",
    "to": "destination_stop",
    "place": "destination_stop",
    "number of luggage": "luggage_count",
    "luggage count": "luggage_count",
    "luggage": "luggage_count",
    "bags": "luggage_count",
    "no of luggage": "luggage_count",
    "batch": "batch_name",
    "trip": "batch_name",
    "batch name": "batch_name",
    "trip name": "batch_name",
}

def normalize_header(header: str) -> str:
    cleaned = str(header).strip().lower()
    cleaned = cleaned.lstrip("\ufeff").strip()
    
    if cleaned in COLUMN_MAPPING:
        return COLUMN_MAPPING[cleaned]
        
    simplified = re.sub(r'[^a-z0-9]', '', cleaned)
    if simplified in COLUMN_MAPPING:
        return COLUMN_MAPPING[simplified]
        
    if any(k in cleaned for k in ["mobile", "phone", "contact", "cell", "tel"]):
        return "mobile_number"
    if any(k in cleaned for k in ["destination", "dest", "drop", "place 2", "place2", "to place", "dropping"]):
        return "destination_stop"
    if any(k in cleaned for k in ["boarding", "board", "pickup", "pick up", "source", "place 1", "place1", "from place"]):
        return "boarding_stop"
    if any(k in cleaned for k in ["passenger name", "customer name", "full name", "client name"]) or cleaned == "name":
        return "name"
    if any(k in cleaned for k in ["s.no", "sno", "sl.no", "slno", "serial", "seat", "id"]):
        return "passenger_id"
    if any(k in cleaned for k in ["luggage", "bag"]):
        return "luggage_count"
    if any(k in cleaned for k in ["batch", "trip"]):
        return "batch_name"
        
    return cleaned

def parse_and_validate_matrix(raw_matrix: List[List[str]], db: Session, default_batch: str = "Trip 1") -> ImportPreviewResponse:
    """
    Parses a 2D string matrix (from XLSX, CSV, TSV), validates columns and passenger rows.
    """
    if not raw_matrix:
        return ImportPreviewResponse(
            total_rows=0, valid_count=0, invalid_count=0, duplicate_count=0, rows=[]
        )

    headers = raw_matrix[0]
    norm_headers = [normalize_header(h) for h in headers]
    col_idx = {name: i for i, name in enumerate(norm_headers)}

    # Positional fallback if standard column names weren't recognized
    if "name" not in col_idx and len(headers) >= 4:
        col_idx = {
            "passenger_id": 0,
            "name": 1,
            "mobile_number": 2,
            "boarding_stop": 3,
            "destination_stop": 4 if len(headers) > 4 else 3
        }

    seen_file_ids = set()
    rows: List[ImportRow] = []
    valid_count = 0
    invalid_count = 0
    duplicate_count = 0

    for row_idx, raw_row in enumerate(raw_matrix[1:], start=2):
        if not raw_row or not any(str(field).strip() for field in raw_row):
            continue

        def get_val(col_name: str, default: str = "") -> str:
            idx = col_idx.get(col_name)
            if idx is not None and idx < len(raw_row):
                return str(raw_row[idx]).strip()
            return default

        p_id = get_val("passenger_id")
        name = get_val("name")
        mobile = get_val("mobile_number")
        boarding = get_val("boarding_stop")
        destination = get_val("destination_stop")
        raw_luggage = get_val("luggage_count", "1")
        batch_name = get_val("batch_name", default_batch) or default_batch

        # If passenger_id is purely numeric (like 1, 2, 3 from S.No), format nicely as P01 or P101
        if p_id and p_id.isdigit():
            p_id = f"P{int(p_id):02d}"
        elif not p_id:
            p_id = f"P{row_idx-1:02d}"

        display_id = p_id
        # Namespace internal passenger_id with batch_name so each batch can have the same display ID (e.g. PA01, P101) without collision
        if batch_name and not display_id.startswith(f"{batch_name}-"):
            unique_p_id = f"{batch_name}-{display_id}"
        else:
            unique_p_id = display_id

        errors: List[str] = []

        if not display_id:
            errors.append("Passenger ID is missing.")
        elif display_id in seen_file_ids:
            errors.append(f"Duplicate Passenger ID '{display_id}' found in this file.")
            duplicate_count += 1
        else:
            seen_file_ids.add(display_id)

        if not name:
            errors.append("Passenger name is missing.")
        elif len(name) < 2:
            errors.append("Passenger name is too short.")

        digits = "".join(filter(str.isdigit, mobile))
        if not mobile:
            errors.append("Mobile number is missing.")
        elif len(digits) < 7:
            errors.append("Invalid mobile number format (minimum 7 digits required).")

        if not boarding:
            errors.append("Boarding stop is missing.")
        if not destination:
            errors.append("Destination stop is missing.")

        try:
            luggage_count = int(raw_luggage)
            if luggage_count < 1 or luggage_count > 10:
                errors.append("Luggage count must be between 1 and 10.")
        except ValueError:
            luggage_count = 1

        is_valid = len(errors) == 0
        if is_valid:
            valid_count += 1
        else:
            invalid_count += 1

        rows.append(ImportRow(
            passenger_id=unique_p_id,
            display_id=display_id,
            batch_name=batch_name,
            name=name,
            mobile_number=mobile,
            boarding_stop=boarding,
            destination_stop=destination,
            luggage_count=luggage_count,
            row_number=row_idx,
            errors=errors,
            is_valid=is_valid
        ))

    return ImportPreviewResponse(
        total_rows=len(rows),
        valid_count=valid_count,
        invalid_count=invalid_count,
        duplicate_count=duplicate_count,
        rows=rows
    )

def parse_and_validate_csv_content(content: str, db: Session, default_batch: str = "Trip 1") -> ImportPreviewResponse:
    """
    Parses CSV / TSV text, detects columns, validates required fields and duplicates.
    """
    if not content or not content.strip():
        return ImportPreviewResponse(total_rows=0, valid_count=0, invalid_count=0, duplicate_count=0, rows=[])

    first_line = content.split("\n", 1)[0] if content else ""
    delimiter = "\t" if "\t" in first_line else (";" if ";" in first_line and "," not in first_line else ",")
    reader = csv.reader(io.StringIO(content.strip()), delimiter=delimiter)
    raw_matrix = [row for row in reader if any(f.strip() for f in row)]
    return parse_and_validate_matrix(raw_matrix, db, default_batch=default_batch)

def parse_spreadsheet_file(file_bytes: bytes, filename: str = "", default_batch: str = "Trip 1", db: Session = None) -> ImportPreviewResponse:
    """
    Parses any spreadsheet file format (.xlsx, .xls, .csv, .tsv) or auto-detects from bytes.
    """
    if not file_bytes:
        return ImportPreviewResponse(total_rows=0, valid_count=0, invalid_count=0, duplicate_count=0, rows=[])

    is_excel = filename.lower().endswith((".xlsx", ".xls")) or file_bytes.startswith(b"PK\x03\x04")
    if is_excel:
        try:
            wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
            sheet = wb.active
            raw_matrix = []
            for row in sheet.iter_rows(values_only=True):
                if any(cell is not None and str(cell).strip() != "" for cell in row):
                    raw_matrix.append([str(cell).strip() if cell is not None else "" for cell in row])
            if raw_matrix:
                return parse_and_validate_matrix(raw_matrix, db, default_batch=default_batch)
        except Exception:
            # If Excel workbook parsing fails (e.g. CSV renamed to .xls), fallback to CSV text decoding
            pass

    for enc in ("utf-8-sig", "utf-8", "latin1", "cp1252"):
        try:
            text = file_bytes.decode(enc)
            return parse_and_validate_csv_content(text, db, default_batch=default_batch)
        except Exception:
            continue

    raise ValueError("Could not decode spreadsheet file. Please check file format.")

def fetch_google_sheets_csv(sheet_url_or_id: str) -> str:
    clean_url = sheet_url_or_id.strip()
    sheet_id = clean_url
    
    match = re.search(r"/d/([a-zA-Z0-9-_]+)", clean_url)
    if match:
        sheet_id = match.group(1)

    export_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv"
    response = requests.get(export_url, timeout=10)
    if response.status_code != 200:
        raise ValueError(f"Failed to fetch Google Sheet (HTTP {response.status_code}). Ensure the sheet link is shared as 'Anyone with the link can view'.")
    return response.text

def execute_import_passengers(
    db: Session, 
    passenger_records: List[Any], 
    default_batch: str = "Trip 1",
    agent_id: Optional[int] = None,
    agent_email: Optional[str] = None
) -> Tuple[int, List[str]]:
    """
    Inserts or updates valid passenger records without pre-generating QR codes.
    QR codes are only created when the operator explicitly clicks 'Create QR Code'.
    """
    imported_count = 0
    warnings = []

    def get_attr(obj, field, default=None):
        if isinstance(obj, dict):
            return obj.get(field, default)
        return getattr(obj, field, default)

    for item in passenger_records:
        b_name = get_attr(item, 'batch_name', None) or default_batch
        b_name = str(b_name).strip() or default_batch
        
        raw_id = str(get_attr(item, 'passenger_id', '') or '').strip()
        d_id = str(get_attr(item, 'display_id', '') or '').strip()
        if not d_id:
            d_id = raw_id.split("-", 1)[-1] if "-" in raw_id else raw_id
            
        p_id = raw_id
        if b_name and not p_id.startswith(f"{b_name}-"):
            p_id = f"{b_name}-{p_id}"

        name = str(get_attr(item, 'name', '') or '').strip()
        mobile = str(get_attr(item, 'mobile_number', '') or '').strip()
        boarding = str(get_attr(item, 'boarding_stop', '') or '').strip()
        destination = str(get_attr(item, 'destination_stop', '') or '').strip()
        raw_count = get_attr(item, 'luggage_count', 1)
        try:
            luggage_count = int(raw_count)
        except Exception:
            luggage_count = 1

        if not name or not p_id:
            continue

        existing = db.query(Passenger).filter(Passenger.passenger_id == p_id).first()
        if existing:
            existing.display_id = d_id
            existing.batch_name = b_name
            existing.agent_id = agent_id or existing.agent_id
            existing.agent_email = agent_email or existing.agent_email
            existing.name = name
            existing.mobile_number = mobile
            existing.boarding_stop = boarding
            existing.destination_stop = destination
            existing.luggage_count = luggage_count
            imported_count += 1
            continue

        passenger = Passenger(
            passenger_id=p_id,
            display_id=d_id,
            batch_name=b_name,
            agent_id=agent_id,
            agent_email=agent_email,
            name=name,
            mobile_number=mobile,
            boarding_stop=boarding,
            destination_stop=destination,
            luggage_count=luggage_count
        )
        db.add(passenger)
        imported_count += 1

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise e

    return imported_count, warnings
