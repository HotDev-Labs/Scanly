import os
import sys
import socket
import threading
import time
import urllib.request
import webbrowser
import uvicorn

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def is_port_available(port: int, host: str = "0.0.0.0") -> bool:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind((host, port))
            return True
    except OSError:
        return False

def check_existing_server(port: int) -> bool:
    try:
        req = urllib.request.Request(f"http://127.0.0.1:{port}/api/health")
        with urllib.request.urlopen(req, timeout=1) as resp:
            return resp.status == 200
    except Exception:
        return False

def open_browser_delayed(url: str):
    time.sleep(1.2)
    try:
        webbrowser.open(url)
    except Exception:
        pass

if __name__ == "__main__":
    # Ensure project root is in working directory and sys.path
    project_root = os.path.abspath(os.path.dirname(__file__))
    os.chdir(project_root)
    if project_root not in sys.path:
        sys.path.insert(0, project_root)

    port = 8000
    # Check if port 8000 is occupied
    if not is_port_available(port):
        if check_existing_server(port):
            print("=" * 70)
            print("  Scanly is ALREADY RUNNING!")
            print(f"  Web App URL: http://localhost:{port}")
            print("=" * 70)
            webbrowser.open(f"http://localhost:{port}")
            sys.exit(0)
        else:
            print(f"  Notice: Port {port} is occupied by another process.")
            for candidate in [8001, 8080, 8888, 5000]:
                if is_port_available(candidate):
                    port = candidate
                    print(f"  Switched to available port: {port}")
                    break

    local_ip = get_local_ip()
    print("=" * 70)
    print("  Scanly - Luggage Verification System")
    print("  Mobile-Friendly Web App • Direct Access (No Admin Login Needed)")
    print("=" * 70)
    print("  Primary Features:")
    print("    1. Generate Luggage QR Code & Print Baggage Tag")
    print("    2. Scan QR Code & Verify Luggage Handover")
    print("    3. Luggage Tracking & Member Management")
    print("-" * 70)
    print(f"  Web App URL:       http://localhost:{port}")
    print(f"  LAN Access URL:    http://{local_ip}:{port}")
    print(f"  API Docs URL:      http://localhost:{port}/docs")
    print("=" * 70)

    # Launch browser automatically
    t = threading.Thread(target=open_browser_delayed, args=(f"http://localhost:{port}",), daemon=True)
    t.start()

    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=port, reload=False)
