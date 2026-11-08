import { Router } from 'express';
import axios from 'axios';

const router = Router();
const pythonAgentUrl = process.env.PYTHON_AGENT_URL || 'http://localhost:8006';

// Health check endpoint
router.get('/', async (req, res) => {
    const health = {
        status: 'healthy',
        service: 'aiops-node-api',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        dependencies: {}
    };

    // Check Python agent health
    try {
        const pythonHealth = await axios.get(`${pythonAgentUrl}/health`, { timeout: 5000 });
        health.dependencies.pythonAgent = {
            status: 'healthy',
            url: pythonAgentUrl,
            response: pythonHealth.data
        };
    } catch (error) {
        health.dependencies.pythonAgent = {
            status: 'unhealthy',
            url: pythonAgentUrl,
            error: error.message
        };
        health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
});

// Detailed health with all dependencies
router.get('/detailed', async (req, res) => {
    const health = {
        status: 'healthy',
        service: 'aiops-node-api',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development',
        dependencies: {}
    };

    // Check Python agent
    try {
        const pythonHealth = await axios.get(`${pythonAgentUrl}/health`, { timeout: 5000 });
        health.dependencies.pythonAgent = {
            status: 'healthy',
            ...pythonHealth.data
        };
    } catch (error) {
        health.dependencies.pythonAgent = {
            status: 'unhealthy',
            error: error.message
        };
        health.status = 'degraded';
    }

    // Check PagerDuty connectivity (via Python agent)
    try {
        const pdCheck = await axios.get(`${pythonAgentUrl}/health/pagerduty`, { timeout: 10000 });
        health.dependencies.pagerduty = {
            status: 'healthy',
            ...pdCheck.data
        };
    } catch (error) {
        health.dependencies.pagerduty = {
            status: 'unhealthy',
            error: error.message
        };
        health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
});

export default router;
