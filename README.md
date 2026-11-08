# AIOps Agentic UI Application

A modern, AI-powered operations dashboard for PagerDuty incident management with real-time alerting and intelligent analysis.

**Configured for: DPE Prod Ops Team**

![Architecture](https://img.shields.io/badge/Architecture-Microservices-blue)
![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61dafb)
![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20FastAPI-339933)
![AI](https://img.shields.io/badge/AI-LangChain%20%2B%20LangGraph-orange)

## 🎯 Monitored Services

This application is configured to monitor the following PagerDuty services:

| Service Name | Service ID | URL |
|-------------|-----------|-----|
| ProdModelsystems - Prod | `PFDAAU` | [View in PagerDuty](https://cba.pagerduty.com/service-directory/PFDU7FI) |
| DPgred - Prod | `PBD0TCK` | [View in PagerDuty](https://cba.pagerduty.com/service-directory/PBD0TCK) |

**Team:** [DPE Prod Ops (P80ZU3K)](https://cba.pagerduty.com/teams/P80ZU3K)

## 🚀 Features

- **Real-time Dashboard** - Monitor incidents, services, and system health
- **AI Chat Interface** - Natural language interaction with your PagerDuty data
- **Incident Management** - View, acknowledge, and resolve incidents
- **AI Analysis** - Get intelligent insights on incidents
- **Triage Recommendations** - AI-powered incident prioritization
- **Real-time Alerts** - Critical incident notifications
- **Dark Mode UI** - Modern glassmorphism design
- **Service Filtering** - Only shows data for configured services and team

## 📁 Project Structure

```
agentic-aiops-ui/
├── backend/
│   ├── node-api/           # NodeJS Express API (Port 8005)
│   │   ├── src/
│   │   │   ├── index.js    # Main entry point
│   │   │   └── routes/     # API routes
│   │   ├── package.json
│   │   └── .env.example
│   │
│   └── python-agent/       # FastAPI + LangChain (Port 8006)
│       ├── main.py         # FastAPI application
│       ├── agents/         # LangChain agent & workflows
│       ├── mcp/            # PagerDuty MCP client
│       ├── requirements.txt
│       └── .env.example
│
├── frontend/               # React + Vite (Port 3001)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── styles/
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

## 🛠️ Prerequisites

- **Node.js** 18+ (for frontend and Node API)
- **Python** 3.11+ (for Python agent)
- **PagerDuty Account** with API access
- **LLM API Access** (AIPE-bedrock-claude-4-sonnet)

## 📦 Installation (MacBook)

### Step 1: Extract and Navigate

```bash
# Extract the zip file
unzip agentic-aiops-ui.zip

# Navigate to project directory
cd agentic-aiops-ui
```

### Step 2: Configure Environment Variables

```bash
# Copy environment templates
cp backend/node-api/.env.example backend/node-api/.env
cp backend/python-agent/.env.example backend/python-agent/.env

# Edit the .env files with your credentials:
# - OPENAI_API_KEY: Your LLM API key
# - PAGERDUTY_USER_API_KEY: Your PagerDuty API token
```

**Environment Variables Explained:**

| Variable | Description |
|----------|-------------|
| `OPENAI_API_BASE` | LLM API base URL (`https://api.studio.genai.cbaa`) |
| `OPENAI_API_KEY` | Your LLM API key |
| `OPENAI_MODEL` | Model name (`AIPE-bedrock-claude-4-sonnet`) |
| `PAGERDUTY_USER_API_KEY` | PagerDuty User API token |
| `PAGERDUTY_API_HOST` | PagerDuty API host (default: `https://api.pagerduty.com`) |
| `PAGERDUTY_MCP_PATH` | Path to MCP server (`/Users/vijayakumar.ravindran/pagerduty-mcp`) |

### Step 3: Install Dependencies

**Terminal 1 - NodeJS API:**
```bash
cd backend/node-api
npm install
```

**Terminal 2 - Python Agent:**
```bash
cd backend/python-agent
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm install
```

### Step 4: Start Services

**Terminal 1 - NodeJS API (Port 8005):**
```bash
cd backend/node-api
npm run dev
```

**Terminal 2 - Python Agent (Port 8006):**
```bash
cd backend/python-agent
source venv/bin/activate
python main.py
```

**Terminal 3 - Frontend (Port 3001):**
```bash
cd frontend
npm run dev
```

### Step 5: Access the Application

Open your browser and navigate to:
```
http://localhost:3001
```

## 🔧 API Endpoints

### NodeJS API (Port 8005)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/incidents` | GET | List incidents |
| `/api/incidents/:id` | GET | Get incident details |
| `/api/incidents/:id/acknowledge` | POST | Acknowledge incident |
| `/api/incidents/:id/resolve` | POST | Resolve incident |
| `/api/services` | GET | List services |
| `/api/agents/chat` | POST | Chat with AI |
| `/api/agents/analyze/:id` | POST | Analyze incident |
| `/api/agents/triage` | POST | Triage incidents |
| `/ws` | WebSocket | Real-time updates |

### Python Agent (Port 8006)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/health/pagerduty` | GET | PagerDuty connection status |
| `/api/chat` | POST | AI chat |
| `/api/query` | POST | Execute AIOps query |
| `/api/tools` | GET | List available tools |
| `/ws/chat` | WebSocket | Streaming chat |

## 🎨 UI Features

### Dashboard
- **Stats Cards** - Open incidents, triggered, acknowledged, resolved
- **Incident Timeline** - 24-hour incident chart
- **Severity Distribution** - Pie chart of incident urgencies
- **Recent Incidents** - Quick view of latest incidents

### Incidents Page
- **Search & Filter** - Find incidents by title, service, status
- **Table View** - Sortable incident list
- **Quick Actions** - Acknowledge, resolve, analyze
- **AI Analysis** - Get insights on any incident

### AI Chat
- **Natural Language** - Ask questions in plain English
- **Quick Prompts** - Common queries one-click away
- **Tool Usage** - See which PagerDuty tools were used
- **Streaming** - Real-time response streaming

### Services
- **Service Health** - Overview of all services
- **Status Indicators** - Critical, warning, healthy
- **Quick Links** - Jump to PagerDuty

## 🔌 PagerDuty MCP Integration

The application integrates with the PagerDuty MCP server for:
- Listing and searching incidents
- Getting incident details and logs
- Acknowledging and resolving incidents
- Listing services and integrations
- Getting on-call schedules

If the MCP server is not available, the application falls back to direct PagerDuty API calls.

## 🐛 Troubleshooting

### Backend not starting?
1. Check that all environment variables are set
2. Verify Python 3.11+ is installed
3. Ensure virtual environment is activated

### Frontend shows "Disconnected"?
1. Check that NodeJS API is running on port 8005
2. Check browser console for WebSocket errors

### AI chat not responding?
1. Verify LLM API credentials
2. Check Python agent logs for errors
3. Ensure `OPENAI_API_BASE` is correct

### No incidents showing?
1. Verify `PAGERDUTY_USER_API_KEY` is valid
2. Check Python agent health: `http://localhost:8006/health/pagerduty`

## 📝 Development

### Running in Development Mode

All services support hot-reloading:
- **NodeJS API**: Uses `--watch` flag
- **Python Agent**: Uvicorn with `--reload`
- **Frontend**: Vite with HMR

### Mock Mode

If PagerDuty API key is not set, the Python agent runs in mock mode with sample data for development.

### Modifying Allowed Services

The application is configured to only show data for specific services and team. To change this:

**Backend (Python Agent):**
Edit `backend/python-agent/config/services_config.py`:

```python
ALLOWED_SERVICES = {
    "YOUR_SERVICE_ID": {
        "id": "YOUR_SERVICE_ID",
        "name": "Your Service Name",
        "url": "https://cba.pagerduty.com/service-directory/YOUR_SERVICE_ID"
    },
    # Add more services as needed
}

ALLOWED_TEAM = {
    "id": "YOUR_TEAM_ID",
    "name": "Your Team Name",
    "url": "https://cba.pagerduty.com/teams/YOUR_TEAM_ID"
}
```

**Frontend:**
Edit `frontend/src/config/servicesConfig.js` with the same service and team information.

After modifying, restart both the Python agent and frontend for changes to take effect.

## 📄 License

MIT License - See LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
