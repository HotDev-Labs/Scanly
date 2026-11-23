import os
import urllib.parse
from fastapi import APIRouter, Request, UploadFile, File, Depends, HTTPException, Query
from fastapi.responses import JSONResponse, RedirectResponse, FileResponse, Response
import requests
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..auth import get_current_user

router = APIRouter(prefix="/api/avatar", tags=["Avatar & Storage"])

# Writable temporary directory for local avatar storage fallback
AVATAR_DIR = "/tmp/avatars"
try:
    os.makedirs(AVATAR_DIR, exist_ok=True)
except Exception:
    pass

@router.post("/upload")
async def upload_avatar(
    request: Request,
    filename: str = Query(None),
    file: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    """
    Uploads an avatar file to Vercel Blob Storage (if BLOB_READ_WRITE_TOKEN is configured),
    or to local storage fallback.
    """
    token = os.getenv("BLOB_READ_WRITE_TOKEN")
    
    # Read file content from either multipart file or raw body stream
    if file:
        file_bytes = await file.read()
        name = file.filename or filename or "avatar.jpg"
        content_type = file.content_type or "image/jpeg"
    else:
        file_bytes = await request.body()
        name = filename or "avatar.jpg"
        content_type = request.headers.get("content-type", "image/jpeg")

    if not file_bytes:
        raise HTTPException(status_code=400, detail="No file content provided for upload.")

    safe_filename = urllib.parse.quote(os.path.basename(name))
    
    # 1. If Vercel Blob Storage is connected via BLOB_READ_WRITE_TOKEN
    if token:
        try:
            # Upload via Vercel Blob REST API
            vercel_blob_endpoint = f"https://blob.vercel-storage.com/{safe_filename}"
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": content_type,
                "x-api-version": "7"
            }
            resp = requests.put(vercel_blob_endpoint, data=file_bytes, headers=headers, timeout=30)
            if resp.status_code in [200, 201]:
                blob_data = resp.json()
                blob_url = blob_data.get("url") or blob_data.get("downloadUrl")
                return JSONResponse(content={
                    "url": blob_url,
                    "pathname": blob_data.get("pathname", safe_filename),
                    "contentType": content_type
                })
        except Exception as e:
            print(f"[Vercel Blob Upload Error]: {e}, falling back to local storage")

    # 2. Local / serverless /tmp storage fallback
    save_path = os.path.join(AVATAR_DIR, safe_filename)
    try:
        with open(save_path, "wb") as f:
            f.write(file_bytes)
    except Exception as e:
        print(f"[Local Save Error]: {e}")

    view_url = f"/api/avatar/view?pathname={safe_filename}"
    return JSONResponse(content={
        "url": view_url,
        "pathname": safe_filename,
        "contentType": content_type
    })

@router.get("/view")
def view_avatar(pathname: str = Query(...)):
    """
    Serves or redirects to the avatar file.
    """
    if not pathname:
        raise HTTPException(status_code=400, detail="Missing pathname")

    # If pathname is an absolute external URL (e.g. Vercel Blob URL), redirect to it
    if pathname.startswith("http://") or pathname.startswith("https://"):
        return RedirectResponse(pathname)

    # Check local fallback file
    clean_name = os.path.basename(pathname)
    file_path = os.path.join(AVATAR_DIR, clean_name)
    if os.path.exists(file_path):
        return FileResponse(file_path)

    raise HTTPException(status_code=404, detail="Avatar not found")

