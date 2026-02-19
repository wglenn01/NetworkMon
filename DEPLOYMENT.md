# NetGraph Hub - Deployment Guide for Ubuntu Server

## Prerequisites

- Ubuntu 20.04+ or Debian 11+
- Python 3.10+
- Node.js 18+ and npm/yarn
- MongoDB 5.0+
- Nginx (recommended for reverse proxy)

## Quick Start

### 1. Install System Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python and pip
sudo apt install -y python3 python3-pip python3-venv

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB
curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/mongodb-archive-keyring.gpg] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Install Nginx (optional but recommended)
sudo apt install -y nginx
```

### 2. Clone/Copy the Application

```bash
# Create app directory
sudo mkdir -p /opt/netgraph
cd /opt/netgraph

# Copy your application files here (backend/ and frontend/ folders)
# Or clone from your repository
```

### 3. Set Up Backend

```bash
cd /opt/netgraph/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create .env file
cat > .env << 'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=netgraph
EOF
```

**Key Python packages required:**
- `fastapi`, `uvicorn` - Web framework
- `motor`, `pymongo` - MongoDB async driver
- `pysnmp-lextudio` - SNMP polling
- `RouterOS-api` - Mikrotik API integration (NEW)

### 4. Set Up Frontend

```bash
cd /opt/netgraph/frontend

# Install dependencies
npm install
# or
yarn install

# Create .env file (update with your domain/IP)
cat > .env << 'EOF'
REACT_APP_BACKEND_URL=http://your-server-ip:8001
EOF

# Build for production
npm run build
# or
yarn build
```

### 5. Create Systemd Services

**Backend Service:**
```bash
sudo cat > /etc/systemd/system/netgraph-backend.service << 'EOF'
[Unit]
Description=NetGraph Backend API
After=network.target mongod.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/netgraph/backend
Environment=PATH=/opt/netgraph/backend/venv/bin
ExecStart=/opt/netgraph/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

**Frontend Service (using serve):**
```bash
# Install serve globally
sudo npm install -g serve

sudo cat > /etc/systemd/system/netgraph-frontend.service << 'EOF'
[Unit]
Description=NetGraph Frontend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/netgraph/frontend
ExecStart=/usr/bin/serve -s build -l 3000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

**Enable and start services:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable netgraph-backend netgraph-frontend
sudo systemctl start netgraph-backend netgraph-frontend

# Check status
sudo systemctl status netgraph-backend
sudo systemctl status netgraph-frontend
```

### 6. Configure Nginx (Recommended)

```bash
sudo cat > /etc/nginx/sites-available/netgraph << 'EOF'
server {
    listen 80;
    server_name your-domain.com;  # or your server IP

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/netgraph /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**Update frontend .env for Nginx:**
```bash
# Since Nginx proxies /api to backend, use relative URL
echo "REACT_APP_BACKEND_URL=" > /opt/netgraph/frontend/.env
cd /opt/netgraph/frontend && npm run build
sudo systemctl restart netgraph-frontend
```

### 7. Firewall Configuration

```bash
# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# If not using Nginx, allow direct access
sudo ufw allow 3000/tcp  # Frontend
sudo ufw allow 8001/tcp  # Backend API
```

## Mikrotik API Configuration

For Mikrotik router monitoring to work:

1. **Enable API on your Mikrotik routers:**
   ```
   /ip service set api address=YOUR_SERVER_IP/32 disabled=no port=9001
   ```

2. **Create an API user:**
   ```
   /user add name=netgraph password=YOUR_PASSWORD group=read
   ```

3. **In NetGraph, add device with:**
   - Device Type: Mikrotik API
   - API Port: 9001
   - Username: netgraph
   - Password: YOUR_PASSWORD

## Updating the Application

```bash
# Stop services
sudo systemctl stop netgraph-backend netgraph-frontend

# Update backend
cd /opt/netgraph/backend
source venv/bin/activate
pip install -r requirements.txt

# Update frontend
cd /opt/netgraph/frontend
npm install
npm run build

# Restart services
sudo systemctl start netgraph-backend netgraph-frontend
```

## Troubleshooting

**Check logs:**
```bash
sudo journalctl -u netgraph-backend -f
sudo journalctl -u netgraph-frontend -f
```

**Test backend directly:**
```bash
curl http://localhost:8001/api/devices
```

**Test MongoDB:**
```bash
mongosh --eval "db.adminCommand('ping')"
```

**Common issues:**
- Port 8001 blocked: Check firewall
- MongoDB not running: `sudo systemctl start mongod`
- Permission issues: Ensure www-data owns /opt/netgraph

## New Dependencies (vs previous version)

The Mikrotik API feature requires:
```
RouterOS-api==0.21.0
```

This is already in requirements.txt and will be installed automatically with `pip install -r requirements.txt`.
