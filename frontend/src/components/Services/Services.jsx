import { useState, useEffect } from 'react';
import {
    Server,
    CheckCircle,
    AlertTriangle,
    Activity,
    ExternalLink,
    ChevronRight,
    Users
} from 'lucide-react';
import { fetchServices } from '../../services/api';
import { ALLOWED_TEAM, getAllowedServiceNames } from '../../config/servicesConfig';
import './Services.css';

export default function Services() {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedService, setSelectedService] = useState(null);

    useEffect(() => {
        loadServices();
    }, []);

    async function loadServices() {
        setLoading(true);
        try {
            const data = await fetchServices({ limit: 50 });
            setServices(data.services || []);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function getStatusIcon(status) {
        switch (status) {
            case 'critical':
                return <AlertTriangle size={16} className="status-icon critical" />;
            case 'warning':
                return <Activity size={16} className="status-icon warning" />;
            case 'active':
            default:
                return <CheckCircle size={16} className="status-icon healthy" />;
        }
    }

    function getStatusBadge(status) {
        const statusClass = {
            critical: 'badge-critical',
            warning: 'badge-high',
            active: 'badge-low',
            disabled: 'badge-info'
        };

        return (
            <span className={`badge ${statusClass[status] || 'badge-info'}`}>
                {status}
            </span>
        );
    }

    if (loading) {
        return (
            <div className="services-loading">
                <div className="loading-spinner"></div>
                <p>Loading services...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="services-error">
                <AlertTriangle size={48} />
                <p>{error}</p>
                <button className="btn btn-secondary" onClick={loadServices}>
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="services-page">
            {/* Team Info Header */}
            <div className="team-header glass-card">
                <div className="team-info">
                    <Users size={24} className="team-icon" />
                    <div>
                        <h2 className="team-name">{ALLOWED_TEAM.name}</h2>
                        <span className="team-subtitle">Monitored Services</span>
                    </div>
                </div>
                <a
                    href={ALLOWED_TEAM.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="team-link"
                >
                    <ExternalLink size={14} />
                    View Team in PagerDuty
                </a>
            </div>

            {/* Services Overview */}
            <div className="services-overview">
                <div className="overview-card glass-card">
                    <div className="overview-icon healthy">
                        <CheckCircle size={24} />
                    </div>
                    <div className="overview-info">
                        <div className="overview-value">
                            {services.filter(s => s.status === 'active').length}
                        </div>
                        <div className="overview-label">Healthy</div>
                    </div>
                </div>

                <div className="overview-card glass-card">
                    <div className="overview-icon warning">
                        <Activity size={24} />
                    </div>
                    <div className="overview-info">
                        <div className="overview-value">
                            {services.filter(s => s.status === 'warning').length}
                        </div>
                        <div className="overview-label">Warning</div>
                    </div>
                </div>

                <div className="overview-card glass-card">
                    <div className="overview-icon critical">
                        <AlertTriangle size={24} />
                    </div>
                    <div className="overview-info">
                        <div className="overview-value">
                            {services.filter(s => s.status === 'critical').length}
                        </div>
                        <div className="overview-label">Critical</div>
                    </div>
                </div>

                <div className="overview-card glass-card">
                    <div className="overview-icon total">
                        <Server size={24} />
                    </div>
                    <div className="overview-info">
                        <div className="overview-value">{services.length}</div>
                        <div className="overview-label">Total Services</div>
                    </div>
                </div>
            </div>

            {/* Services Grid */}
            <div className="services-grid">
                {services.length === 0 ? (
                    <div className="empty-state glass-card">
                        <Server size={48} />
                        <p>No services found</p>
                    </div>
                ) : (
                    services.map((service) => (
                        <div
                            key={service.id}
                            className={`service-card glass-card ${selectedService === service.id ? 'selected' : ''}`}
                            onClick={() => setSelectedService(
                                selectedService === service.id ? null : service.id
                            )}
                        >
                            <div className="service-header">
                                <div className="service-status">
                                    {getStatusIcon(service.status)}
                                </div>
                                <div className="service-info">
                                    <h3 className="service-name">{service.name}</h3>
                                    <span className="service-id">{service.id}</span>
                                </div>
                                {getStatusBadge(service.status)}
                            </div>

                            <div className="service-details">
                                <div className="service-meta">
                                    <span className="meta-label">Description:</span>
                                    <span className="meta-value">
                                        {service.description || 'No description available'}
                                    </span>
                                </div>

                                {service.escalation_policy && (
                                    <div className="service-meta">
                                        <span className="meta-label">Escalation:</span>
                                        <span className="meta-value">
                                            {service.escalation_policy.summary || 'Default'}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="service-footer">
                                <a
                                    href={service.html_url || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="service-link"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <ExternalLink size={14} />
                                    View in PagerDuty
                                </a>
                                <ChevronRight size={16} className="service-arrow" />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
