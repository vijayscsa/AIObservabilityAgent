import { X, AlertTriangle, ExternalLink } from 'lucide-react';
import './Alerts.css';

export default function AlertBanner({ alerts, onDismiss }) {
    if (!alerts || alerts.length === 0) return null;

    return (
        <div className="alert-banner">
            <div className="alert-banner-content">
                <div className="alert-icon-wrapper">
                    <AlertTriangle size={20} />
                </div>

                <div className="alert-messages">
                    {alerts.map((alert, index) => (
                        <div key={alert.id || index} className="alert-item">
                            <span className="alert-title">{alert.title}</span>
                            <span className="alert-service">
                                {alert.service?.summary || 'Unknown Service'}
                            </span>
                            {alert.html_url && (
                                <a
                                    href={alert.html_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="alert-link"
                                >
                                    <ExternalLink size={12} />
                                </a>
                            )}
                            <button
                                className="alert-dismiss"
                                onClick={() => onDismiss(alert.id)}
                                aria-label="Dismiss alert"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
