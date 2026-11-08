import { Router } from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const pythonAgentUrl = process.env.PYTHON_AGENT_URL || 'http://localhost:8006';

// Chat with AI agent
router.post('/chat', async (req, res, next) => {
    try {
        const { message, conversationId } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const response = await axios.post(`${pythonAgentUrl}/api/chat`, {
            message,
            conversationId: conversationId || uuidv4()
        });

        res.json(response.data);
    } catch (error) {
        next(error);
    }
});

// Execute specific AIOps query
router.post('/query', async (req, res, next) => {
    try {
        const { query, context } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        const response = await axios.post(`${pythonAgentUrl}/api/query`, {
            query,
            context: context || {}
        });

        res.json(response.data);
    } catch (error) {
        next(error);
    }
});

// Get available agent tools
router.get('/tools', async (req, res, next) => {
    try {
        const response = await axios.get(`${pythonAgentUrl}/api/tools`);

        res.json(response.data);
    } catch (error) {
        next(error);
    }
});

// Analyze incident
router.post('/analyze/:incidentId', async (req, res, next) => {
    try {
        const { incidentId } = req.params;

        const response = await axios.post(`${pythonAgentUrl}/api/analyze/${incidentId}`);

        res.json(response.data);
    } catch (error) {
        next(error);
    }
});

// Get triage recommendations
router.post('/triage', async (req, res, next) => {
    try {
        const { incidentIds } = req.body;

        if (!incidentIds || !Array.isArray(incidentIds)) {
            return res.status(400).json({ error: 'incidentIds array is required' });
        }

        const response = await axios.post(`${pythonAgentUrl}/api/triage`, {
            incidentIds
        });

        res.json(response.data);
    } catch (error) {
        next(error);
    }
});

export default router;
