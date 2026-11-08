/**
 * API service for backend communication
 */

const API_BASE = '/api';

async function handleResponse(response) {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || error.message || `HTTP ${response.status}`);
    }
    return response.json();
}

// ============== Incidents ==============

export async function fetchIncidents(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.set('status', params.status);
    if (params.urgency) queryParams.set('urgency', params.urgency);
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.offset) queryParams.set('offset', params.offset.toString());
    if (params.since) queryParams.set('since', params.since);
    if (params.openOnly) queryParams.set('open_only', 'true');

    const response = await fetch(`${API_BASE}/incidents?${queryParams}`);
    return handleResponse(response);
}

export async function fetchIncident(incidentId) {
    const response = await fetch(`${API_BASE}/incidents/${incidentId}`);
    return handleResponse(response);
}

export async function fetchIncidentStats() {
    const response = await fetch(`${API_BASE}/incidents/stats/summary`);
    return handleResponse(response);
}

export async function acknowledgeIncident(incidentId) {
    const response = await fetch(`${API_BASE}/incidents/${incidentId}/acknowledge`, {
        method: 'POST'
    });
    return handleResponse(response);
}

export async function resolveIncident(incidentId, resolution) {
    const response = await fetch(`${API_BASE}/incidents/${incidentId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution })
    });
    return handleResponse(response);
}

export async function addIncidentNote(incidentId, content) {
    const response = await fetch(`${API_BASE}/incidents/${incidentId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
    });
    return handleResponse(response);
}

export async function fetchIncidentLogEntries(incidentId) {
    const response = await fetch(`${API_BASE}/incidents/${incidentId}/log_entries`);
    return handleResponse(response);
}

export async function fetchRelatedIncidents(incidentId) {
    const response = await fetch(`${API_BASE}/incidents/${incidentId}/related`);
    return handleResponse(response);
}

export async function fetchPastIncidents(incidentId) {
    const response = await fetch(`${API_BASE}/incidents/${incidentId}/past`);
    return handleResponse(response);
}

export async function addResponders(incidentId, responderIds) {
    const response = await fetch(`${API_BASE}/incidents/${incidentId}/responders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responder_ids: responderIds })
    });
    return handleResponse(response);
}

// ============== Services ==============

export async function fetchServices(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.offset) queryParams.set('offset', params.offset.toString());

    const response = await fetch(`${API_BASE}/services?${queryParams}`);
    return handleResponse(response);
}

export async function fetchService(serviceId) {
    const response = await fetch(`${API_BASE}/services/${serviceId}`);
    return handleResponse(response);
}

// ============== Agents / Chat ==============

export async function sendChatMessage(message, conversationId = null) {
    const response = await fetch(`${API_BASE}/agents/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, conversationId })
    });
    return handleResponse(response);
}

export async function executeQuery(query, context = {}) {
    const response = await fetch(`${API_BASE}/agents/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, context })
    });
    return handleResponse(response);
}

export async function getAgentTools() {
    const response = await fetch(`${API_BASE}/agents/tools`);
    return handleResponse(response);
}

export async function analyzeIncident(incidentId) {
    const response = await fetch(`${API_BASE}/agents/analyze/${incidentId}`, {
        method: 'POST'
    });
    return handleResponse(response);
}

export async function triageIncidents(incidentIds) {
    const response = await fetch(`${API_BASE}/agents/triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentIds })
    });
    return handleResponse(response);
}

// ============== Health ==============

export async function checkHealth() {
    const response = await fetch(`${API_BASE}/health`);
    return handleResponse(response);
}
