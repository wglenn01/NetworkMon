# NetGraph Hub - Network Monitoring Tool PRD

## Original Problem Statement
Dark themed network monitoring tool where users can add devices to categories (Routers, Backhauls, Switches, CPEs), monitor and graph different SNMP values, and ping for each device. Must have a thorough and accurate dashboard to oversee the network with ability to dive into each device for detailed reports.

## User Choices
- SNMPv2c monitoring with custom OIDs per device
- Preset time ranges (1hr, 24hr, 7 days) + custom date range selection
- Popup notifications when device goes down or threshold exceeded
- No authentication needed
- Dark themed UI
- Data type specification for SNMP OID values (Mbps, Text, Percentage, etc.)
- Device search functionality within categories

## Architecture
- **Frontend**: React with Recharts, Sonner (toasts), Shadcn UI components
- **Backend**: FastAPI with MongoDB
- **Styling**: Tailwind CSS with JetBrains Mono + IBM Plex Sans fonts

## User Personas
1. **Network Administrator** - Monitors infrastructure health, adds/removes devices
2. **NOC Operator** - Views dashboard for real-time status, acknowledges alerts

## Core Requirements (Static)
- [x] Device management with CRUD operations
- [x] Category management (Routers, Switches, Backhauls, CPEs)
- [x] SNMPv2c monitoring with custom OIDs per device
- [x] Ping monitoring for each device
- [x] Threshold configuration (warning/critical)
- [x] Alert system with popup notifications
- [x] Dashboard with network overview
- [x] Device detail page with graphs
- [x] Time range selection (1hr, 24hr, 7 days)
- [x] SNMP templates for reusable OID configurations
- [x] Auto-polling with configurable intervals
- [x] Pinnable graphs to dashboard
- [x] Alert history on device detail page
- [x] Online/offline device counts in category sidebar
- [x] SNMP OID data type specification
- [x] Device search/filter functionality

## What's Been Implemented

### 2026-02-17 (Latest Session)
- **SNMP OID Data Type Feature**:
  - Added `data_type` field to OIDConfig model (gauge, counter, mbps, kbps, bytes, percentage, text)
  - Data type dropdown selector in Add/Edit Device dialog
  - Data type dropdown selector in Add/Edit Template dialog
  - OID list displays 6 columns: OID, Name, Type, Unit, Warning, Critical
  - Device detail page shows data type badge for each OID
  - `formatValue` function converts values based on data type:
    - mbps: divides by 1,000,000
    - kbps: divides by 1,000
    - bytes: auto-scales to KB/MB/GB
    - percentage: shows with % unit
    - text: displays as-is without graphing

- **Device Search Feature**:
  - Search input in DeviceList header
  - Filters by device name OR IP address
  - Shows "Found X devices matching 'query'" when searching
  - Clear (X) button to reset search
  - Works within active category filter

### Previous Sessions
- Full-stack network monitoring application
- Dark cybernetic theme with scanline effects
- Sidebar navigation with category filtering
- Dashboard with stats cards, device list, alerts panel
- Device list with status indicators and category badges
- Device detail page with:
  - Metric cards (CPU, Memory, Ping response time)
  - Interactive charts (Area/Line charts with Recharts)
  - Time range selector
  - OID configuration display
  - Alert history
- Alerts page with acknowledge/delete functionality
- SNMP Templates with CRUD operations
- Auto-polling scheduler with configurable intervals
- Pinnable graphs to main dashboard
- Toast notifications for alerts
- Deployment guide for Proxmox/Ubuntu

## MOCKED Components
- **SNMP values are simulated** - `get_snmp_value` returns realistic random values based on OID patterns
- **Ping uses actual system ping command** but may fail on non-routable IPs

## Prioritized Backlog

### P0 (Critical)
- **Implement real SNMP monitoring** - Replace mocked `get_snmp_value` with actual pysnmp calls

### P1 (Important)
- Custom date range picker with calendar
- Export device/monitoring data to CSV
- Email/webhook notifications for critical alerts

### P2 (Nice to Have)
- Device groups/topology view
- Historical trend analysis
- Uptime percentage calculations
- Multi-user support with roles
- Dark/Light theme toggle

## Next Tasks
1. Implement actual SNMP polling with pysnmp-lextudio library
2. Add calendar-based custom date range selection
3. Implement data export functionality
4. Add email/webhook notification support

## File Structure
```
/app/
├── backend/
│   ├── server.py       # Main FastAPI app with all endpoints and models
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── App.js        # Main component with all page components
│   │   ├── components/ui/ # Shadcn UI components
│   │   └── index.css     # Global styles with dark theme
│   └── .env
├── deployment.md         # Deployment guide for Proxmox/Ubuntu
└── memory/PRD.md        # This file
```

## Testing
- Latest test: iteration_5.json - 100% pass rate for frontend features
- All data type and search features verified working
