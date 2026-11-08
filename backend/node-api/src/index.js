import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

import incidentsRouter from './routes/incidents.js';
import servicesRouter from './routes/services.js';
import agentsRouter from './routes/agents.js';
import healthRouter from './routes/health.js';

dotenv.config();

const app = express();
const PORT = process.env.NODE_API_PORT || 8005;

// Middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(cors({
    origin: [`http://localhost:${process.env.FRONTEND_PORT || 3001}`],
    credentials: true
}));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api/incidents', incidentsRouter);
app.use('/api/services', servicesRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/health', healthRouter);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        timestamp: new Date().toISOString()
    });
});

// Create HTTP server
const server = createServer(app);

// WebSocket Server for real-time updates
const wss = new WebSocketServer({ server, path: '/ws' });

// Store connected clients
const clients = new Map();

wss.on('connection', (ws) => {
    const clientId = uuidv4();
    clients.set(clientId, ws);
    console.log(`WebSocket client connected: ${clientId}`);

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message.toString());
            console.log(`Received from ${clientId}:`, data);

            // Handle different message types
            switch (data.type) {
                case 'subscribe':
                    ws.subscriptions = data.channels || [];
                    ws.send(JSON.stringify({
                        type: 'subscribed',
                        channels: ws.subscriptions,
                        clientId
                    }));
                    break;

                case 'chat':
                    // Forward chat messages to Python agent
                    await handleChatMessage(ws, data, clientId);
                    break;

                default:
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Unknown message type'
                    }));
            }
        } catch (error) {
            console.error('WebSocket message error:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Failed to process message'
            }));
        }
    });

    ws.on('close', () => {
        clients.delete(clientId);
        console.log(`WebSocket client disconnected: ${clientId}`);
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error for ${clientId}:`, error);
        clients.delete(clientId);
    });

    // Send welcome message
    ws.send(JSON.stringify({
        type: 'connected',
        clientId,
        timestamp: new Date().toISOString()
    }));
});

// Handle chat messages by forwarding to Python agent
async function handleChatMessage(ws, data, clientId) {
    const pythonAgentUrl = process.env.PYTHON_AGENT_URL || 'http://localhost:8006';

    try {
        const response = await fetch(`${pythonAgentUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: data.message,
                conversationId: data.conversationId || uuidv4(),
                clientId
            })
        });

        if (!response.ok) {
            throw new Error(`Python agent responded with ${response.status}`);
        }

        const result = await response.json();
        ws.send(JSON.stringify({
            type: 'chat_response',
            ...result,
            timestamp: new Date().toISOString()
        }));
    } catch (error) {
        console.error('Error forwarding to Python agent:', error);
        ws.send(JSON.stringify({
            type: 'chat_error',
            message: 'Failed to process chat message',
            error: error.message
        }));
    }
}

// Broadcast function for real-time updates
export function broadcast(channel, data) {
    clients.forEach((ws) => {
        if (ws.readyState === 1) { // OPEN
            if (!ws.subscriptions || ws.subscriptions.includes(channel)) {
                ws.send(JSON.stringify({
                    type: 'broadcast',
                    channel,
                    data,
                    timestamp: new Date().toISOString()
                }));
            }
        }
    });
}

// Start server
server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🚀 AIOps Node API Server                               ║
║                                                          ║
║   REST API:    http://localhost:${PORT}/api               ║
║   WebSocket:   ws://localhost:${PORT}/ws                  ║
║   Health:      http://localhost:${PORT}/api/health        ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);
});

export { wss, clients };
