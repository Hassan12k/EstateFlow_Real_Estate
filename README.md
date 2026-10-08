# EstateFlow Real Estate Management Suite

A premium, polished real-estate inventory, payment calculator, quotation and Excel smart-sync app designed as a strong company website/app prototype.

## Run the app

### Windows
Double-click `start.bat`.
Then open:
`http://localhost:8000`

### macOS / Linux
Run:
`python3 server.py`
Then open:
`http://localhost:8000`

Python 3.9+ and `openpyxl` are required for Excel (.xlsx/.xlsm) import. If needed:
`pip install openpyxl`

## Main features
- Project/company name and logo upload
- Add, edit, delete inventory
- Lower Ground, Ground and 1st–12th floor selector
- Available / Booked / Sold / Hold status
- Smart Payment Planner
- Optional inventory unit selection or Custom Unit
- Manual area, rate and category charge
- Down payment, possession and installment controls
- Customer name or mobile number
- Premium quotation preview
- Print / Save PDF
- WhatsApp quotation
- Customer leads
- Compare units
- Browser-local data storage
- Full JSON backup
- Premium dark-navy / champagne-gold visual system
- Responsive mobile navigation and print-friendly quotation styling

## Excel Import & Smart Sync
Use **Excel Import & Sync** from the left menu.

The importer supports:
- Normal Excel tables with columns such as Unit ID, Unit Name, Type, Floor, Area, Rate, Category Charge and Status.
- The apartment-sheet format used by the supplied `Calculator (26.Aug.2022).xlsx` workbook.

Sync options:
1. **Smart Merge** — update matching Unit IDs and add new units.
2. **Replace Inventory** — make the uploaded workbook the current inventory.
3. **Add New Only** — add units that do not already exist.

Always review the detected rows before applying a sync. Keep a JSON backup before a major inventory replacement.

## QA check
The supplied `Calculator (26.Aug.2022).xlsx` workbook was re-tested with the importer and its 16 apartment sheets are detected successfully.

## Important production note
This version is designed as a practical local/company prototype. Local browser storage means each computer has its own data.

For a true multi-user company deployment, the next production version should use a central database, secure user login/roles, cloud file storage, audit history, centralized inventory locking, booking records, payment receipts, agent accounts and server-side quotation generation.

## Smart Payment Planner — final alignment
The calculator uses a two-column form grid on desktop, consistent field heights, aligned labels and inputs, a balanced result panel, and a four-column quotation metadata layout that collapses cleanly on mobile. Customer Name and Customer Number are separate fields and both flow into quotations, leads, and WhatsApp sharing.
