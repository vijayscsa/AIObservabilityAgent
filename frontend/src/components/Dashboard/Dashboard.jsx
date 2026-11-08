import { useState, useEffect } from 'react';
import {
    AlertTriangle,
    Clock,
    CheckCircle,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    Activity,
    Users,
    Eye
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { fetchIncidentStats, fetchIncidents } from '../../services/api';
import { ALLOWED_TEAM, getAllowedServiceNames } from '../../config/servicesConfig';
import IncidentDetailModal from '../IncidentDetailModal/IncidentDetailModal';
import './Dashboard.css';

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [recentIncidents, setRecentIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedIncident, setSelectedIncident] = useState(null);

    useEffect(() => {
        loadDashboardData();

        // Refresh every 15 seconds for real-time updates
        const interval = setInterval(loadDashboardData, 15000);
        return () => clearInterval(interval);
    }, []);

    async function loadDashboardData() {
        try {
            // Calculate date 10 days ago for filtering recent incidents
            const tenDaysAgo = new Date();
            tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
            const sinceDate = tenDaysAgo.toISOString();

            const [statsData, incidentsData] = await Promise.all([
                fetchIncidentStats(),
                fetchIncidents({
                    limit: 50,           // Fetch more incidents to ensure we get all triggered
                    since: sinceDate,    // Only from last 10 days
                    status: 'triggered'  // Only triggered incidents (most critical)
                })
            ]);

            setStats(statsData);
            // Show up to 10 in the recent incidents list
            setRecentIncidents((incidentsData.incidents || []).slice(0, 10));
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="loading-spinner"></div>
                <p>Loading dashboard...</p>
            </div>
        );
    }

    // Mock timeline data for demo
    const timelineData = [
        { time: '00:00', incidents: 2 },
        { time: '04:00', incidents: 1 },
        { time: '08:00', incidents: 5 },
        { time: '12:00', incidents: 3 },
        { time: '16:00', incidents: 4 },
        { time: '20:00', incidents: stats?.triggered || 2 },
    ];

    const pieData = [
        { name: 'Critical', value: stats?.high_urgency || 2, color: '#ef4444' },
        { name: 'High', value: Math.floor((stats?.total_open || 4) / 2), color: '#f97316' },
        { name: 'Medium', value: Math.ceil((stats?.low_urgency || 2) / 2), color: '#eab308' },
        { name: 'Low', value: stats?.low_urgency || 1, color: '#22c55e' },
    ];

    const statCards = [
        {
            title: 'Open Incidents',
            value: stats?.total_open || 0,
            icon: AlertTriangle,
            color: 'critical',
            trend: '+12%',
            trendUp: true
        },
        {
            title: 'Triggered',
            value: stats?.triggered || 0,
            icon: Clock,
            color: 'high',
            trend: '+5%',
            trendUp: true
        },
        {
            title: 'Acknowledged',
            value: stats?.acknowledged || 0,
            icon: Activity,
            color: 'medium',
            trend: '-8%',
            trendUp: false
        },
        {
            title: 'Resolved Today',
            value: stats?.resolved || 0,
            icon: CheckCircle,
            color: 'low',
            trend: '+25%',
            trendUp: false
        }
    ];

    return (
        <div className="dashboard">
            {/* Team Context Header */}
            <div className="dashboard-header glass-card">
                <div className="header-info">
                    <Users size={24} className="header-icon" />
                    <div>
                        <h2 className="header-title">{ALLOWED_TEAM.name} Dashboard</h2>
                        <span className="header-subtitle">
                            Monitoring: {getAllowedServiceNames().join(' • ')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                {statCards.map((stat, index) => (
                    <div
                        key={stat.title}
                        className={`stat-card glass-card stat-${stat.color}`}
                        style={{ animationDelay: `${index * 0.1}s` }}
                    >
                        <div className="stat-header">
                            <div className={`stat-icon stat-icon-${stat.color}`}>
                                <stat.icon size={20} />
                            </div>
                            <div className={`stat-trend ${stat.trendUp ? 'trend-up' : 'trend-down'}`}>
                                {stat.trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                {stat.trend}
                            </div>
                        </div>
                        <div className="stat-value">{stat.value}</div>
                        <div className="stat-title">{stat.title}</div>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="charts-grid">
                {/* Incident Timeline */}
                <div className="chart-card glass-card">
                    <div className="chart-header">
                        <h3 className="chart-title">Incident Timeline</h3>
                        <span className="chart-subtitle">Last 24 hours</span>
                    </div>
                    <div className="chart-body">
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={timelineData}>
                                <defs>
                                    <linearGradient id="incidentGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis
                                    dataKey="time"
                                    stroke="#6b6b80"
                                    fontSize={12}
                                />
                                <YAxis
                                    stroke="#6b6b80"
                                    fontSize={12}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: '#1a1a25',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="incidents"
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    fill="url(#incidentGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Severity Distribution */}
                <div className="chart-card glass-card">
                    <div className="chart-header">
                        <h3 className="chart-title">Severity Distribution</h3>
                        <span className="chart-subtitle">Current open incidents</span>
                    </div>
                    <div className="chart-body pie-chart-body">
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={4}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: '#1a1a25',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px'
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="pie-legend">
                            {pieData.map((item) => (
                                <div key={item.name} className="legend-item">
                                    <span
                                        className="legend-dot"
                                        style={{ background: item.color }}
                                    ></span>
                                    <span className="legend-label">{item.name}</span>
                                    <span className="legend-value">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Incidents */}
            <div className="recent-incidents glass-card">
                <div className="section-header">
                    <h3 className="section-title">Recent Incidents</h3>
                    <a href="/incidents" className="view-all-link">
                        View all <ArrowUpRight size={14} />
                    </a>
                </div>

                <div className="incidents-list">
                    {recentIncidents.length === 0 ? (
                        <div className="empty-state">
                            <CheckCircle size={48} />
                            <p>No incidents found</p>
                        </div>
                    ) : (
                        recentIncidents.map((incident) => (
                            <div
                                key={incident.id}
                                className="incident-row clickable"
                                onClick={() => setSelectedIncident(incident.id)}
                            >
                                <div className={`incident-urgency urgency-${incident.urgency}`}>
                                    <span className="status-dot"></span>
                                </div>
                                <div className="incident-info">
                                    <div className="incident-title">
                                        <span className="incident-number">{incident.incident_number || incident.id}</span>
                                        {incident.title}
                                    </div>
                                    <div className="incident-meta">
                                        <span className="incident-service">
                                            {incident.service?.summary || 'Unknown Service'}
                                        </span>
                                        <span className="incident-time">
                                            {new Date(incident.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                <div className={`incident-status status-${incident.status}`}>
                                    {incident.status}
                                </div>
                                <div className="incident-view-icon">
                                    <Eye size={16} />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Incident Detail Modal */}
            {selectedIncident && (
                <IncidentDetailModal
                    incidentId={selectedIncident}
                    onClose={() => setSelectedIncident(null)}
                />
            )}
        </div>
    );
}
