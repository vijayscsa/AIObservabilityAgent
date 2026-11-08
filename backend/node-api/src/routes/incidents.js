import { Router } from 'express';
import axios from 'axios';

const router = Router();
const pythonAgentUrl = process.env.PYTHON_AGENT_URL || 'http://localhost:8006';

// Get all incidents
router.get('/', async (req, res, next) => {
    try {
        const { status, urgency, limit = 25, offset = 0 } = req.query;

        const response = await axios.get(`${pythonAgentUrl}/api/incidents`, {
            params: { status, urgency, limit, offset }
        });

        res.json(response.data);
    } catch (error) {
        next(error);
    }
});

// Get incident by ID
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;

        const response = await axios.get(`${pythonAgentUrl}/api/incidents/${id}`);

        res.json(response.data);
    } catch (error) {
        if (error.response?.status === 404) {
            return res.status(404).json({ error: 'Incident not found' });
        }
        next(error);
    }
});

// Get incident timeline/log entries
router.get('/:id/log_entries', async (req, res, next) => {
    try {
        const { id } = req.params;

        const response = await axios.get(`${pythonAgentUrl}/api/incidents/${id}/log_entries`);

        res.json(response.data);
    } catch (error) {
        next(error);
    }
});

// Get related incidents
router.get('/:id/related', async (req, res, next) => {
    try {
        const { id } = req.params;

        const response = await axios.get(`${pythonAgentUrl}/api/incidents/${id}/related`);

        res.json(response.data);
    } catch (error) {
        next(error);
    }
});

// Get past incidents
router.get('/:id/past', async (req, res, next) => {
    try {
        const { id } = req.params;

        const response = await axios.get(`${pythonAgentUrl}/api/incidents/${id}/past`);

        res.json(response.data);
    } catch (error) {
        next(error);
    }
});

// Add responders to incident
router.post('/:id/responders', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { responder_ids } = req.body;

        const response = await axios.post(`${pythonAgentUrl}/api/incidents/${id}/responders`, {
            responder_ids
        });

        res.json(response.data);
    } catch (error) {
        next(error);
    }
});

// Acknowledge incident
router.post('/:id/acknowledge', async (req, res, next) => {
    try {
        const { id } = req.params;

        const response = await axios.post(`${pythonAgentUrl}/api/incidents/${id}/acknowledge`);

        res.json(response.data);
    } catch (error) {
        next(error);
    }
});

// Resolve incident
router.post('/:id/resolve', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { resolution } = req.body;

        const response = await axios.post(`${pythonAgentUrl}/api/incidents/${id}/resolve`, {
            resolution
        });

        res.json(response.data);
    } catch (error) {
        next(error);
    }
});

// Add note to incident
router.post('/:id/notes', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { content } = req.body;

        const response = await axios.post(`${pythonAgentUrl}/api/incidents/${id}/notes`, {
            content
        });

        res.json(response.data);
    } catch (error) {
        next(error);
    }
});

// Get incident statistics
router.get('/stats/summary', async (req, res, next) => {
    try {
        const response = await axios.get(`${pythonAgentUrl}/api/incidents/stats/summary`);

        res.json(response.data);
    } catch (error) {
        next(error);
    }
});

export default router;
