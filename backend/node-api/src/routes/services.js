import { Router } from 'express';
import axios from 'axios';

const router = Router();
const pythonAgentUrl = process.env.PYTHON_AGENT_URL || 'http://localhost:8006';

// Get all services
router.get('/', async (req, res, next) => {
    try {
        const { limit = 25, offset = 0 } = req.query;

        const response = await axios.get(`${pythonAgentUrl}/api/services`, {
            params: { limit, offset }
        });

        res.json(response.data);
    } catch (error) {
        next(error);
    }
});

// Get service by ID
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;

        const response = await axios.get(`${pythonAgentUrl}/api/services/${id}`);

        res.json(response.data);
    } catch (error) {
        if (error.response?.status === 404) {
            return res.status(404).json({ error: 'Service not found' });
        }
        next(error);
    }
});

// Get service integrations
router.get('/:id/integrations', async (req, res, next) => {
    try {
        const { id } = req.params;

        const response = await axios.get(`${pythonAgentUrl}/api/services/${id}/integrations`);

        res.json(response.data);
    } catch (error) {
        next(error);
    }
});

// Get service incidents
router.get('/:id/incidents', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, limit = 25 } = req.query;

        const response = await axios.get(`${pythonAgentUrl}/api/services/${id}/incidents`, {
            params: { status, limit }
        });

        res.json(response.data);
    } catch (error) {
        next(error);
    }
});

export default router;
