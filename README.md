# Scanly - Smart Luggage Verification System

A fast, mobile-responsive web solution for transit stations to eliminate passenger luggage mismatches and accidental baggage exchanges.

---

## Key Features & User Experience

1. **Trip & Member Manifest Management**:
   - Multi-batch and trip support (`Trip 1`, `Trip 2`, `Trip 3`, etc.) with 30 members per trip for testing.
   - Excel (`.xlsx`, `.xls`) and CSV import support with column mapping and auto-validation.
   - In-app roster management: Add, Edit, and Delete passengers directly.

2. **Unified Luggage QR Generation**:
   - Multiple bags for a customer (e.g. 3 bags) are generated seamlessly with individual tag prints (`P01-L1`, `P01-L2`, `P01-L3`).
   - Thermal slip / label printer support with standard 2-inch and 3-inch roll formats.

3. **Luggage Tracking**:
   - Single grouped entry per passenger (e.g., "3 Bags" badge).
   - Tag indicators, status pills, and single Edit/Delete actions.

4. **Direct Camera QR Scanner & Sequential Stepper**:
   - Live camera scanning with auto-stepping: prompts for Bag 1, then Bag 2 of 3, then Bag 3 of 3 until all bags are handed over.
   - Audio feedback and on-screen alerts guide the operator.

---

## How to Run

1. **Start the Application**:
   ```bash
   python run_app.py
   ```
   *(Or double-click `start.bat` on Windows)*

2. **Open in Your Browser**:
   - Web App: [http://localhost:8000](http://localhost:8000)
   - Swagger API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
