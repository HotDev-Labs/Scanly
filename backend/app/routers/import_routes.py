from typing import Optional, List, Any
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import ImportPreviewResponse
from ..auth import get_current_user
from ..services.import_service import (
    parse_and_validate_csv_content, 
    parse_spreadsheet_file, 
    fetch_google_sheets_csv, 
    execute_import_passengers
)

router = APIRouter(prefix="/api/import", tags=["Data Import"])

SAMPLE_CSV_DATA = """S.No,Name,Mobile Number,Boarding Place,Destination Place
P01,Rahul Sharma,9876543210,Central Bus Terminus,Airport Hub
P02,Priya Patel,9823456789,Central Bus Terminus,City Center
P03,Amit Verma,9811223344,West Gate Terminal,Tech Park
P04,Sunita Rao,9833445566,North Station,Airport Hub
P05,Vikram Singh,9899887766,Central Bus Terminus,Tech Park
P06,Ananya Roy,9877665544,South Junction,City Center
P07,Karthik Nair,9866554433,Central Bus Terminus,Suburban Terminal
"""

@router.get("/sample-csv")
def get_sample_csv():
    return Response(
        content=SAMPLE_CSV_DATA,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sample_passengers.csv"}
    )

@router.post("/preview-csv", response_model=ImportPreviewResponse)
@router.post("/preview-csv/", response_model=ImportPreviewResponse)
async def preview_csv_upload(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    content_type = request.headers.get("content-type", "").lower()
    file_bytes = None
    filename = ""
    raw_csv = ""
    batch_name = "Trip 1"

    if "multipart/form-data" in content_type:
        form = await request.form()
        uploaded = form.get("file")
        if uploaded is not None and hasattr(uploaded, "read"):
            file_bytes = await uploaded.read()
            filename = getattr(uploaded, "filename", "") or "uploaded.xlsx"
        raw_csv = str(form.get("raw_csv") or "").strip()
        batch_name = str(form.get("batch_name") or "Trip 1").strip()
    else:
        try:
            body = await request.json()
            raw_csv = str(body.get("raw_csv") or "").strip()
            batch_name = str(body.get("batch_name") or "Trip 1").strip()
        except Exception:
            raw_body = await request.body()
            raw_csv = raw_body.decode("utf-8", errors="ignore").strip()

    target_batch = batch_name or "Trip 1"

    try:
        if file_bytes and len(file_bytes) > 0:
            return parse_spreadsheet_file(file_bytes, filename=filename, default_batch=target_batch, db=db)
        if raw_csv and len(raw_csv) > 0:
            return parse_and_validate_csv_content(raw_csv, db, default_batch=target_batch)
        raise HTTPException(
            status_code=400, 
            detail="Please choose an Excel (.xlsx, .xls), CSV, or TSV file, or paste table content."
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to preview spreadsheet: {str(e)}")

@router.get("/preview-csv")
def preview_csv_get_info():
    return {"message": "Send POST request with file or raw_csv to preview passenger spreadsheet."}

@router.post("/preview-sheets", response_model=ImportPreviewResponse)
@router.post("/preview-sheets/", response_model=ImportPreviewResponse)
async def preview_google_sheets(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    url = ""
    batch_name = "Trip 1"
    try:
        body = await request.json()
        url = str(body.get("sheet_url") or "").strip()
        batch_name = str(body.get("batch_name") or "Trip 1").strip()
    except Exception:
        pass

    if not url:
        url = request.query_params.get("sheet_url", "").strip()
        batch_name = request.query_params.get("batch_name", batch_name).strip()

    if not url:
        raise HTTPException(status_code=400, detail="Google Sheet URL or Spreadsheet ID is required.")

    try:
        csv_text = fetch_google_sheets_csv(url)
        return parse_and_validate_csv_content(csv_text, db, default_batch=batch_name)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/preview-sheets")
def preview_sheets_get_info(
    sheet_url: Optional[str] = None,
    batch_name: Optional[str] = "Trip 1",
    db: Session = Depends(get_db)
):
    if sheet_url:
        csv_text = fetch_google_sheets_csv(sheet_url)
        return parse_and_validate_csv_content(csv_text, db, default_batch=batch_name or "Trip 1")
    return {"message": "Send POST request with sheet_url to preview Google Sheets manifest."}

@router.post("/execute")
@router.put("/execute")
@router.post("/execute/")
@router.put("/execute/")
async def execute_import(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON format.")

    rows = []
    batch_to_use = "Trip 1"

    if isinstance(body, dict):
        rows = body.get("rows") or []
        batch_to_use = body.get("batch_name") or "Trip 1"
    elif isinstance(body, list):
        rows = body

    if not rows:
        raise HTTPException(status_code=400, detail="No passenger records provided for import.")

    count, warnings = execute_import_passengers(db, rows, default_batch=batch_to_use)
    return {
        "message": f"Successfully imported {count} passengers for '{batch_to_use}'.",
        "imported_count": count,
        "batch_name": batch_to_use,
        "warnings": warnings
    }
