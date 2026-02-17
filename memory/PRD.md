# NetGraph Hub - Network Monitoring Tool PRD

## Original Problem Statement
Dark themed network monitoring tool where users can add devices to categories (Routers, Backhauls, Switches, CPEs), monitor and graph different SNMP values, and ping for each device. Must have a thorough and accurate dashboard to oversee the network with ability to dive into each device for detailed reports.

## User Choices
- SNMPv2c monitoring with custom OIDs per device
- Preset time ranges (1hr, 24hr, 7 days) + custom date range selection
- Popup notifications when device goes down or threshold exceeded
- No authentication needed
- Dark themed UI

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

## What's Been Implemented (2026-02-17)
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
- Alerts page with acknowledge/delete functionality
- Add/Edit Device dialog with custom OID configuration
- Add Category dialog
- Sample data seeding
- Poll All and Poll Device functionality
- Toast notifications for alerts

## MOCKED Components
- SNMP values are simulated (get_snmp_value returns realistic random values based on OID patterns)
- Ping uses actual system ping command but may fail on non-routable IPs

## Prioritized Backlog

### P0 (Critical - Not Yet Done)
- None - MVP complete

### P1 (Important)
- Custom date range picker with calendar
- Export device/monitoring data to CSV
- Scheduled automatic polling
- Email/webhook notifications for critical alerts

### P2 (Nice to Have)
- Device groups/topology view
- Historical trend analysis
- Uptime percentage calculations
- Multi-user support with roles
- Dark/Light theme toggle

## Next Tasks
1. Implement calendar-based custom date range selection
2. Add scheduled polling background task
3. Implement actual SNMP polling with pysnmp-lextudio
4. Add data export functionality
