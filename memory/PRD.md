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
- SNMP templates with editing and propagation to linked devices

## Architecture
- **Frontend**: React with Recharts, Sonner (toasts), Shadcn UI components
- **Backend**: FastAPI with MongoDB, pysnmp for real SNMP polling
- **Styling**: Tailwind CSS with JetBrains Mono + IBM Plex Sans fonts

## User Personas
1. **Network Administrator** - Monitors infrastructure health, adds/removes devices
2. **NOC Operator** - Views dashboard for real-time status, acknowledges alerts

## Core Requirements (Static)
- [x] Device management with CRUD operations
- [x] Category management (Routers, Switches, Backhauls, CPEs)
- [x] SNMPv2c monitoring with custom OIDs per device
- [x] Ping monitoring for each device (with 3x retry resilience)
- [x] Threshold configuration (warning/critical with > or < operators)
- [x] Alert system with popup notifications
- [x] Dashboard with network overview
- [x] Device detail page with graphs
- [x] Time range selection (1hr, 24hr, 7 days)
- [x] SNMP templates for reusable OID configurations
- [x] SNMP template editing with inline OID modification
- [x] Template propagation to all linked devices
- [x] Auto-polling with configurable intervals
- [x] Pinnable graphs to dashboard
- [x] Alert history on device detail page
- [x] Online/offline device counts in category sidebar
- [x] SNMP OID data type specification
- [x] Device search/filter functionality
- [x] Clickable dashboard stats (Online/Offline filters)
- [x] Dashboard sparkline graphs for device metrics
- [x] CSV device import

## What's Been Implemented

### December 2025 (Current Session)
- **Silence Alerts Per Device**:
  - Bell icon button on each device card to toggle alerts on/off
  - "SILENCED" badge displayed on silenced devices
  - Toggle switch in Edit Device dialog with description
  - Backend skips alert creation for silenced devices (still polls and collects data)
  - Backend field: `alerts_silenced: bool` in Device model

- **Sound Alerts for Critical Notifications**:
  - Implemented using Web Audio API (no external audio files needed)
  - Critical alerts/device down: Urgent double beep (880Hz)
  - Warning alerts: Single lower beep (440Hz)
  - Device recovery: Pleasant chime (523Hz)
  - Only plays once per poll cycle (not for each individual alert)

- **Acknowledge All Alerts Button**:
  - New "Acknowledge All (X)" button on Alerts page
  - Shows count of unacknowledged alerts
  - Only visible when there are unacknowledged alerts
  - Backend endpoint `PUT /api/alerts/acknowledge-all`
  - Green styling to distinguish from destructive actions

- **SNMP Template Editing & Propagation**:
  - Inline OID editing in template dialog (Name, OID, Type, Unit, Operator, Warning/Critical thresholds)
  - "Apply to Devices" button on each template card
  - Backend endpoint `POST /api/templates/{id}/apply-to-devices` propagates template OIDs to linked devices
  - Success toast notification shows how many devices were updated

- **Popup Alert Notifications**:
  - Smart notification system that tracks shown alerts (prevents duplicate toasts)
  - Device status change notifications (online → offline and vice versa)
  - Uses `useRef` to track `shownAlertIds` and `previousDeviceStatuses`
  - Only shows new alerts and status changes, not repeating on every poll

### Previous Features
- **Real SNMP Polling**: Using pysnmp with shared SnmpEngine and concurrency limits
- **Memory Leak Fix**: Semaphore-based concurrency control for 300+ devices
- **SNMP Data Types**: gauge, counter, mbps, kbps, bytes, percentage, text
- **Alert Threshold Operators**: Support for `>` (greater) and `<` (less than)
- **CSV Device Import**: Bulk import with Name, IP, Template mapping
- **Dashboard Sparklines**: Mini graphs for device metrics
- **Device Search**: Filter by name or IP address
- **Ping Resilience**: 3 retry attempts before marking offline

## NOT Mocked - Real Implementations
- **SNMP Polling**: Real SNMPv2c using pysnmp library
- **Ping**: Real system ping via subprocess (with 3 retries)
- **Database**: Real MongoDB persistence

## Prioritized Backlog

### P1 (Important)
- Custom date range picker with calendar component
- Export device/monitoring data to CSV
- Email/webhook notifications for critical alerts

### P2 (Nice to Have)
- Device groups/topology view
- Historical trend analysis
- Uptime percentage calculations
- Multi-user support with roles
- Dark/Light theme toggle
- Refactor App.js (2000+ lines) into smaller components

## File Structure
```
/app/
├── backend/
│   ├── server.py         # Main FastAPI app with all endpoints, models, and polling logic
│   ├── tests/            # Pytest test files
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── App.js        # Main component with all page components (~2600 lines)
│   │   ├── components/ui/# Shadcn UI components
│   │   └── index.css     # Global styles with dark theme
│   └── .env
├── deployment.md         # Deployment guide for Proxmox/Ubuntu
├── test_reports/         # Test iteration reports
└── memory/PRD.md         # This file
```

## Key API Endpoints
- `PUT /api/alerts/acknowledge-all` - Acknowledge all unacknowledged alerts
- `POST /api/templates/{id}/apply-to-devices` - Propagate template to linked devices
- `PUT /api/templates/{id}` - Update template with OIDs
- `GET /api/devices?status=online|offline` - Filter devices by status
- `POST /api/devices/import-csv` - Bulk import devices
- `POST /api/monitoring/poll/{device_id}` - Manual poll single device

## Testing
- Latest test: iteration_6.json - 100% pass rate (13/13 backend, 7/7 frontend)
- All template editing, propagation, and notification features verified working
