import { useState, useEffect } from 'react';
import {
    X,
    AlertTriangle,
    Clock,
    CheckCircle,
    User,
    Users,
    Calendar,
    ExternalLink,
    Play,
    Check,
    MessageSquare,
    Zap,
    Activity,
    Link,
    History,
    FileText,
    Loader2
} from 'lucide-react';
import {
    fetchIncident,
    fetchIncidentLogEntries,
    fetchRelatedIncidents,
    fetchPastIncidents,
    acknowledgeIncident,
    resolveIncident,
    addIncidentNote
} from '../../services/api';
import './IncidentDetailModal.css';

export default function IncidentDetailModal({ incidentId, onClose }) {
    const [incident, setIncident] = useState(null);
    const [logEntries, setLogEntries] = useState([]);
    const [relatedIncidents, setRelatedIncidents] = useState([]);
    const [pastIncidents, setPastIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('details');
    const [newNote, setNewNote] = useState('');
    const [addingNote, setAddingNote] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => {
        if (incidentId) {
            loadIncidentData();
        }
    }, [incidentId]);

    async function loadIncidentData() {
        setLoading(true);
        try {
            const [incidentData, logData, relatedData, pastData] = await Promise.allSettled([
                fetchIncident(incidentId),
                fetchIncidentLogEntries(incidentId),
                fetchRelatedIncidents(incidentId),
                fetchPastIncidents(incidentId)
            ]);

            if (incidentData.status === 'fulfilled') {
                setIncident(incidentData.value.incident || incidentData.value);
            }
            if (logData.status === 'fulfilled') {
                setLogEntries(logData.value.log_entries || []);
            }
            if (relatedData.status === 'fulfilled') {
                setRelatedIncidents(relatedData.value.related_incidents || []);
            }
            if (pastData.status === 'fulfilled') {
                setPastIncidents(pastData.value.past_incidents || []);
            }
        } catch (err) {
            console.error('Error loading incident data:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleAcknowledge() {
        setActionLoading('acknowledge');
        try {
            await acknowledgeIncident(incidentId);
            await loadIncidentData();
        } catch (err) {
            console.error('Failed to acknowledge:', err);
        } finally {
            setActionLoading(null);
        }
    }

    async function handleResolve() {
        setActionLoading('resolve');
        try {
            await resolveIncident(incidentId);
            await loadIncidentData();
        } catch (err) {
            console.error('Failed to resolve:', err);
        } finally {
            setActionLoading(null);
        }
    }

    async function handleAddNote() {
        if (!newNote.trim()) return;
        setAddingNote(true);
        try {
            await addIncidentNote(incidentId, newNote);
            setNewNote('');
            await loadIncidentData();
        } catch (err) {
            console.error('Failed to add note:', err);
        } finally {
            setAddingNote(false);
        }
    }

    function getStatusIcon(status) {
        switch (status) {
            case 'triggered':
                return <AlertTriangle size={20} className="status-icon critical" />;
            case 'acknowledged':
                return <Clock size={20} className="status-icon warning" />;
            case 'resolved':
                return <CheckCircle size={20} className="status-icon success" />;
            default:
                return <Activity size={20} className="status-icon" />;
        }
    }

    function formatTimestamp(timestamp) {
        return new Date(timestamp).toLocaleString();
    }

    if (!incidentId) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="incident-modal glass-card" onClick={(e) => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="modal-header">
                    <div className="modal-title-row">
                        {incident && getStatusIcon(incident.status)}
                        <div className="modal-title-info">
                            <h2 className="modal-title">
                                {loading ? 'Loading...' : incident?.title || 'Incident Details'}
                            </h2>
                            <span className="modal-id">{incidentId}</span>
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                {loading ? (
                    <div className="modal-loading">
                        <Loader2 size={48} className="spinner" />
                        <p>Loading incident details...</p>
                    </div>
                ) : (
                    <>
                        {/* Quick Actions */}
                        <div className="modal-actions">
                            {incident?.status === 'triggered' && (
                                <button
                                    className="btn btn-acknowledge"
                                    onClick={handleAcknowledge}
                                    disabled={actionLoading === 'acknowledge'}
                                >
                                    {actionLoading === 'acknowledge' ? (
                                        <Loader2 size={16} className="spinner" />
                                    ) : (
                                        <Play size={16} />
                                    )}
                                    Acknowledge
                                </button>
                            )}
                            {incident?.status !== 'resolved' && (
                                <button
                                    className="btn btn-resolve"
                                    onClick={handleResolve}
                                    disabled={actionLoading === 'resolve'}
                                >
                                    {actionLoading === 'resolve' ? (
                                        <Loader2 size={16} className="spinner" />
                                    ) : (
                                        <Check size={16} />
                                    )}
                                    Resolve
                                </button>
                            )}
                            {incident?.html_url && (
                                <a
                                    href={incident.html_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-external"
                                >
                                    <ExternalLink size={16} />
                                    Open in PagerDuty
                                </a>
                            )}
                        </div>

                        {/* Tabs */}
                        <div className="modal-tabs">
                            <button
                                className={`tab ${activeTab === 'details' ? 'active' : ''}`}
                                onClick={() => setActiveTab('details')}
                            >
                                <FileText size={16} />
                                Details
                            </button>
                            <button
                                className={`tab ${activeTab === 'timeline' ? 'active' : ''}`}
                                onClick={() => setActiveTab('timeline')}
                            >
                                <Activity size={16} />
                                Timeline
                                {logEntries.length > 0 && (
                                    <span className="tab-count">{logEntries.length}</span>
                                )}
                            </button>
                            <button
                                className={`tab ${activeTab === 'related' ? 'active' : ''}`}
                                onClick={() => setActiveTab('related')}
                            >
                                <Link size={16} />
                                Related
                                {relatedIncidents.length > 0 && (
                                    <span className="tab-count">{relatedIncidents.length}</span>
                                )}
                            </button>
                            <button
                                className={`tab ${activeTab === 'past' ? 'active' : ''}`}
                                onClick={() => setActiveTab('past')}
                            >
                                <History size={16} />
                                Past
                                {pastIncidents.length > 0 && (
                                    <span className="tab-count">{pastIncidents.length}</span>
                                )}
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="modal-content">
                            {activeTab === 'details' && (
                                <div className="details-tab">
                                    <div className="detail-grid">
                                        <div className="detail-item">
                                            <span className="detail-label">Severity</span>
                                            <span className={`detail-value badge badge-${incident?.urgency === 'high' ? 'critical' : 'medium'}`}>
                                                {incident?.urgency === 'high' ? 'Critical' : 'Medium'}
                                            </span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Opened</span>
                                            <span className="detail-value">
                                                {incident?.created_at ? formatTimestamp(incident.created_at) : 'Unknown'}
                                            </span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Alert Key</span>
                                            <span className="detail-value monospace">
                                                {incident?.incident_key || incident?.id || 'N/A'}
                                            </span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Current Status</span>
                                            <span className={`detail-value badge badge-${incident?.status}`}>
                                                {incident?.status}
                                            </span>
                                        </div>
                                        <div className="detail-item full-width">
                                            <span className="detail-label">Service Name</span>
                                            <span className="detail-value highlight">
                                                {incident?.service?.summary || 'Unknown Service'}
                                            </span>
                                        </div>
                                        {incident?.service?.description && (
                                            <div className="detail-item full-width">
                                                <span className="detail-label">Service Description</span>
                                                <span className="detail-value">
                                                    {incident.service.description}
                                                </span>
                                            </div>
                                        )}
                                        {incident?.first_trigger_log_entry?.channel?.type && (
                                            <div className="detail-item full-width">
                                                <span className="detail-label">Integration</span>
                                                <span className="detail-value">
                                                    {incident.first_trigger_log_entry.channel.type}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Details Section - matching PagerDuty format */}
                                    <div className="detail-section pagerduty-details">
                                        <h4>Details</h4>
                                        <div className="details-content">
                                            <div className="detail-row">
                                                <span className="detail-label">SUBJECT</span>
                                                <span className="detail-value">{incident?.title || 'No subject'}</span>
                                            </div>
                                            {incident?.body?.details && (
                                                <div className="detail-row">
                                                    <span className="detail-label">DETAILS</span>
                                                    <pre className="detail-value body-text">{incident.body.details}</pre>
                                                </div>
                                            )}
                                            {incident?.description && (
                                                <div className="detail-row">
                                                    <span className="detail-label">BODY</span>
                                                    <pre className="detail-value body-text">{incident.description}</pre>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {incident?.assignments?.length > 0 && (
                                        <div className="detail-section">
                                            <h4>Assigned To</h4>
                                            <div className="assignees-list">
                                                {incident.assignments.map((assignment, idx) => (
                                                    <div key={idx} className="assignee-item">
                                                        <User size={16} />
                                                        <span>{assignment.assignee?.summary || 'Unknown'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Add Note Section */}
                                    <div className="detail-section">
                                        <h4>Add Note</h4>
                                        <div className="add-note-form">
                                            <textarea
                                                value={newNote}
                                                onChange={(e) => setNewNote(e.target.value)}
                                                placeholder="Type a note to add to this incident..."
                                                rows={3}
                                            />
                                            <button
                                                className="btn btn-primary"
                                                onClick={handleAddNote}
                                                disabled={!newNote.trim() || addingNote}
                                            >
                                                {addingNote ? (
                                                    <Loader2 size={16} className="spinner" />
                                                ) : (
                                                    <MessageSquare size={16} />
                                                )}
                                                Add Note
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'timeline' && (
                                <div className="timeline-tab">
                                    {logEntries.length === 0 ? (
                                        <div className="empty-tab">
                                            <Activity size={48} />
                                            <p>No log entries found</p>
                                        </div>
                                    ) : (
                                        <div className="timeline-list">
                                            {logEntries.map((entry, idx) => (
                                                <div key={idx} className="timeline-item">
                                                    <div className="timeline-dot"></div>
                                                    <div className="timeline-content">
                                                        <span className="timeline-type">{entry.type}</span>
                                                        <span className="timeline-summary">
                                                            {entry.summary || entry.channel?.summary || 'Action performed'}
                                                        </span>
                                                        <span className="timeline-time">
                                                            {formatTimestamp(entry.created_at)}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'related' && (
                                <div className="related-tab">
                                    {relatedIncidents.length === 0 ? (
                                        <div className="empty-tab">
                                            <Link size={48} />
                                            <p>No related incidents found</p>
                                        </div>
                                    ) : (
                                        <div className="incidents-list">
                                            {relatedIncidents.map((inc, idx) => (
                                                <div key={idx} className="incident-item">
                                                    <div className={`incident-status-dot status-${inc.status}`}></div>
                                                    <div className="incident-item-info">
                                                        <span className="incident-item-title">{inc.title}</span>
                                                        <span className="incident-item-meta">
                                                            {inc.service?.summary} • {formatTimestamp(inc.created_at)}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'past' && (
                                <div className="past-tab">
                                    {pastIncidents.length === 0 ? (
                                        <div className="empty-tab">
                                            <History size={48} />
                                            <p>No past incidents found</p>
                                        </div>
                                    ) : (
                                        <div className="incidents-list">
                                            {pastIncidents.map((inc, idx) => (
                                                <div key={idx} className="incident-item">
                                                    <div className={`incident-status-dot status-${inc.status}`}></div>
                                                    <div className="incident-item-info">
                                                        <span className="incident-item-title">{inc.title}</span>
                                                        <span className="incident-item-meta">
                                                            {inc.service?.summary} • {formatTimestamp(inc.created_at)}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
