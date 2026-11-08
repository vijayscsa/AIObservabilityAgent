import { useState, useEffect } from 'react';
import {
    AlertTriangle,
    Clock,
    CheckCircle,
    Search,
    Filter,
    ChevronDown,
    ExternalLink,
    Play,
    Check,
    MessageSquare,
    Zap,
    Eye
} from 'lucide-react';
import { fetchIncidents, acknowledgeIncident, resolveIncident, analyzeIncident } from '../../services/api';
import IncidentDetailModal from '../IncidentDetailModal/IncidentDetailModal';
import './Incidents.css';

export default function Incidents() {
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedIncident, setSelectedIncident] = useState(null);
    const [modalIncident, setModalIncident] = useState(null);
    const [filters, setFilters] = useState({
        status: '',
        urgency: ''
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [analyzing, setAnalyzing] = useState(null);
    const [analysis, setAnalysis] = useState({});

    useEffect(() => {
        loadIncidents();
    }, [filters]);

    async function loadIncidents() {
        setLoading(true);
        try {
            const data = await fetchIncidents({
                status: filters.status || undefined,
                urgency: filters.urgency || undefined,
                limit: 100
            });
            setIncidents(data.incidents || []);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleAcknowledge(incidentId) {
        try {
            await acknowledgeIncident(incidentId);
            loadIncidents();
        } catch (err) {
            console.error('Failed to acknowledge:', err);
        }
    }

    async function handleResolve(incidentId) {
        try {
            await resolveIncident(incidentId);
            loadIncidents();
        } catch (err) {
            console.error('Failed to resolve:', err);
        }
    }

    async function handleAnalyze(incidentId) {
        setAnalyzing(incidentId);
        try {
            const result = await analyzeIncident(incidentId);
            setAnalysis(prev => ({
                ...prev,
                [incidentId]: result.analysis
            }));
        } catch (err) {
            console.error('Failed to analyze:', err);
        } finally {
            setAnalyzing(null);
        }
    }

    const filteredIncidents = incidents.filter(incident => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                incident.title?.toLowerCase().includes(query) ||
                incident.service?.summary?.toLowerCase().includes(query) ||
                incident.id?.toLowerCase().includes(query)
            );
        }
        return true;
    });

    const getUrgencyIcon = (urgency) => {
        switch (urgency) {
            case 'high':
                return <AlertTriangle size={16} className="urgency-icon critical" />;
            default:
                return <Clock size={16} className="urgency-icon medium" />;
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'triggered':
                return <span className="badge badge-critical">{status}</span>;
            case 'acknowledged':
                return <span className="badge badge-high">{status}</span>;
            case 'resolved':
                return <span className="badge badge-low">{status}</span>;
            default:
                return <span className="badge badge-info">{status}</span>;
        }
    };

    return (
        <div className="incidents-page">
            {/* Header with filters */}
            <div className="incidents-header glass-card">
                <div className="search-filter-row">
                    <div className="search-box-large">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search incidents by title, service, or ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input-large"
                        />
                    </div>

                    <div className="filter-group">
                        <div className="filter-select">
                            <Filter size={16} />
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                            >
                                <option value="">All Status</option>
                                <option value="triggered">Triggered</option>
                                <option value="acknowledged">Acknowledged</option>
                                <option value="resolved">Resolved</option>
                            </select>
                            <ChevronDown size={14} />
                        </div>

                        <div className="filter-select">
                            <AlertTriangle size={16} />
                            <select
                                value={filters.urgency}
                                onChange={(e) => setFilters(prev => ({ ...prev, urgency: e.target.value }))}
                            >
                                <option value="">All Urgency</option>
                                <option value="high">High</option>
                                <option value="low">Low</option>
                            </select>
                            <ChevronDown size={14} />
                        </div>
                    </div>
                </div>

                <div className="incidents-summary">
                    <span className="summary-item">
                        <span className="summary-count">{filteredIncidents.length}</span>
                        <span className="summary-label">incidents found</span>
                    </span>
                </div>
            </div>

            {/* Incidents Table */}
            <div className="incidents-table-container glass-card">
                {loading ? (
                    <div className="loading-state">
                        <div className="loading-spinner"></div>
                        <p>Loading incidents...</p>
                    </div>
                ) : error ? (
                    <div className="error-state">
                        <AlertTriangle size={48} />
                        <p>{error}</p>
                        <button className="btn btn-secondary" onClick={loadIncidents}>
                            Retry
                        </button>
                    </div>
                ) : filteredIncidents.length === 0 ? (
                    <div className="empty-state">
                        <CheckCircle size={48} />
                        <p>No incidents found</p>
                    </div>
                ) : (
                    <table className="incidents-table">
                        <thead>
                            <tr>
                                <th>Urgency</th>
                                <th>Title</th>
                                <th>Service</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredIncidents.map((incident) => (
                                <tr
                                    key={incident.id}
                                    className={selectedIncident === incident.id ? 'selected' : ''}
                                    onClick={() => setSelectedIncident(
                                        selectedIncident === incident.id ? null : incident.id
                                    )}
                                >
                                    <td className="urgency-cell">
                                        {getUrgencyIcon(incident.urgency)}
                                    </td>
                                    <td className="title-cell">
                                        <div className="incident-title-text">
                                            <span className="incident-num">#{incident.incident_number || incident.id}</span>
                                            {incident.title}
                                        </div>
                                        <div className="incident-id">{incident.id}</div>
                                    </td>
                                    <td className="service-cell">
                                        {incident.service?.summary || 'Unknown'}
                                    </td>
                                    <td className="status-cell">
                                        {getStatusBadge(incident.status)}
                                    </td>
                                    <td className="time-cell">
                                        {new Date(incident.created_at).toLocaleString()}
                                    </td>
                                    <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                                        <div className="action-buttons">
                                            <button
                                                className="btn-action btn-view"
                                                onClick={() => setModalIncident(incident.id)}
                                                title="View Details"
                                            >
                                                <Eye size={14} />
                                            </button>
                                            {incident.status === 'triggered' && (
                                                <button
                                                    className="btn-action btn-acknowledge"
                                                    onClick={() => handleAcknowledge(incident.id)}
                                                    title="Acknowledge"
                                                >
                                                    <Play size={14} />
                                                </button>
                                            )}
                                            {incident.status !== 'resolved' && (
                                                <button
                                                    className="btn-action btn-resolve"
                                                    onClick={() => handleResolve(incident.id)}
                                                    title="Resolve"
                                                >
                                                    <Check size={14} />
                                                </button>
                                            )}
                                            <button
                                                className={`btn-action btn-analyze ${analyzing === incident.id ? 'loading' : ''}`}
                                                onClick={() => handleAnalyze(incident.id)}
                                                title="AI Analysis"
                                                disabled={analyzing === incident.id}
                                            >
                                                <Zap size={14} />
                                            </button>
                                            <a
                                                href={incident.html_url || '#'}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn-action btn-external"
                                                title="Open in PagerDuty"
                                            >
                                                <ExternalLink size={14} />
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Analysis Panel */}
            {Object.keys(analysis).length > 0 && (
                <div className="analysis-panel glass-card">
                    <h3 className="analysis-title">
                        <Zap size={20} />
                        AI Analysis
                    </h3>
                    {Object.entries(analysis).map(([incidentId, result]) => (
                        <div key={incidentId} className="analysis-item">
                            <div className="analysis-header">
                                <span className="analysis-incident-id">{incidentId}</span>
                            </div>
                            <div className="analysis-content">
                                {result?.summary || 'Analysis complete'}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Incident Detail Modal */}
            {modalIncident && (
                <IncidentDetailModal
                    incidentId={modalIncident}
                    onClose={() => setModalIncident(null)}
                />
            )}
        </div>
    );
}
