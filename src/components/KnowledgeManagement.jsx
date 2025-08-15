/**
 * Knowledge Management Admin Interface
 * For reviewing and managing automatically ingested diagnostic knowledge
 */

import React, { useState, useEffect } from 'react';
import './KnowledgeManagement.css';

const KnowledgeManagement = () => {
    const [pendingKnowledge, setPendingKnowledge] = useState([]);
    const [stats, setStats] = useState(null);
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedKnowledge, setSelectedKnowledge] = useState(null);
    const [activeTab, setActiveTab] = useState('pending');

    // Helper functions defined at component level
    const getReliabilityColor = (score) => {
        if (score >= 80) return '#22c55e'; // green
        if (score >= 60) return '#f59e0b'; // yellow
        return '#ef4444'; // red
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const [pendingRes, statsRes, dashboardRes] = await Promise.all([
                fetch('/api/knowledge/pending?limit=50'),
                fetch('/api/knowledge/stats?days=30'),
                fetch('/api/knowledge/dashboard')
            ]);

            const [pending, stats, dashboard] = await Promise.all([
                pendingRes.json(),
                statsRes.json(),
                dashboardRes.json()
            ]);

            setPendingKnowledge(pending?.pendingKnowledge || []);
            setStats(stats?.summary || {});
            setDashboard(dashboard?.dashboard || {});
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const approveKnowledge = async (id) => {
        try {
            const response = await fetch(`/api/knowledge/${id}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    verificationNotes: 'Approved via admin interface',
                    reviewedBy: 'admin'
                })
            });

            if (response.ok) {
                setPendingKnowledge(prev => prev.filter(item => item.id !== id));
                loadDashboardData(); // Refresh stats
            }
        } catch (error) {
            console.error('Failed to approve knowledge:', error);
        }
    };

    const rejectKnowledge = async (id, reason) => {
        try {
            const response = await fetch(`/api/knowledge/${id}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rejectionReason: reason })
            });

            if (response.ok) {
                setPendingKnowledge(prev => prev.filter(item => item.id !== id));
                loadDashboardData(); // Refresh stats
            }
        } catch (error) {
            console.error('Failed to reject knowledge:', error);
        }
    };

    const triggerManualDiscovery = async () => {
        const faultCode = prompt('Enter fault code (e.g., L2, F1):');
        const manufacturer = prompt('Enter manufacturer (e.g., Ideal, Worcester Bosch):');
        
        if (!faultCode || !manufacturer) return;

        setLoading(true);
        try {
            const response = await fetch('/api/knowledge/discover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    faultCode: faultCode.toUpperCase(),
                    manufacturer,
                    searchWeb: true,
                    searchVideos: true
                })
            });

            if (response.ok) {
                const result = await response.json();
                alert(`Discovery complete!\nVideos: ${result.discoveryResults.videosProcessed}\nWeb Results: ${result.discoveryResults.webResultsProcessed}\nStored: ${result.discoveryResults.totalStored}`);
                loadDashboardData();
            }
        } catch (error) {
            console.error('Manual discovery failed:', error);
            alert('Discovery failed: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="knowledge-management">
            <div className="km-header">
                <h1>🧠 Knowledge Management System</h1>
                <p>Review and manage automatically discovered diagnostic knowledge</p>
                
                <div className="km-actions">
                    <button 
                        onClick={triggerManualDiscovery}
                        className="btn-primary"
                        disabled={loading}
                    >
                        🔍 Manual Discovery
                    </button>
                    <button 
                        onClick={loadDashboardData}
                        className="btn-secondary"
                        disabled={loading}
                    >
                        🔄 Refresh
                    </button>
                </div>
            </div>

            {/* Statistics Overview */}
            {stats && (
                <div className="km-stats">
                    <div className="stat-card">
                        <h3>📊 30-Day Overview</h3>
                        <div className="stat-grid">
                            <div className="stat-item">
                                <span className="stat-value">{stats.totalDiscovered}</span>
                                <span className="stat-label">Discovered</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-value">{stats.totalVerified}</span>
                                <span className="stat-label">Verified</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-value">{stats.averageReliability}%</span>
                                <span className="stat-label">Avg Reliability</span>
                            </div>
                        </div>
                    </div>

                    {dashboard && (
                        <div className="stat-card">
                            <h3>🎯 Reliability Distribution</h3>
                            <div className="reliability-bars">
                                <div className="reliability-bar">
                                    <span>High (80%+)</span>
                                    <div className="bar">
                                        <div 
                                            className="bar-fill high" 
                                            style={{ width: `${(dashboard.reliabilityDistribution.high / dashboard.pendingCount) * 100}%` }}
                                        ></div>
                                    </div>
                                    <span>{dashboard.reliabilityDistribution.high}</span>
                                </div>
                                <div className="reliability-bar">
                                    <span>Medium (60-79%)</span>
                                    <div className="bar">
                                        <div 
                                            className="bar-fill medium" 
                                            style={{ width: `${(dashboard.reliabilityDistribution.medium / dashboard.pendingCount) * 100}%` }}
                                        ></div>
                                    </div>
                                    <span>{dashboard.reliabilityDistribution.medium}</span>
                                </div>
                                <div className="reliability-bar">
                                    <span>Low (&lt;60%)</span>
                                    <div className="bar">
                                        <div 
                                            className="bar-fill low" 
                                            style={{ width: `${(dashboard.reliabilityDistribution.low / dashboard.pendingCount) * 100}%` }}
                                        ></div>
                                    </div>
                                    <span>{dashboard.reliabilityDistribution.low}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Tab Navigation */}
            <div className="km-tabs">
                <button 
                    className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pending')}
                >
                    📋 Pending Review ({pendingKnowledge.length})
                </button>
                <button 
                    className={`tab ${activeTab === 'sources' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sources')}
                >
                    📊 Top Sources
                </button>
            </div>

            {/* Pending Knowledge Review */}
            {activeTab === 'pending' && (
                <div className="km-content">
                    <h2>📋 Pending Knowledge Review</h2>
                    
                    {loading ? (
                        <div className="loading">Loading knowledge...</div>
                    ) : pendingKnowledge.length === 0 ? (
                        <div className="empty-state">
                            <p>🎉 No pending knowledge to review!</p>
                            <p>All discovered knowledge has been processed.</p>
                        </div>
                    ) : (
                        <div className="knowledge-list">
                            {pendingKnowledge.map(item => (
                                <div key={item?.id || Math.random()} className="knowledge-item">
                                    <div className="knowledge-header">
                                        <div className="knowledge-meta">
                                            <span className="fault-code">{item?.fault_code || 'N/A'}</span>
                                            <span className="manufacturer">{item?.manufacturer || 'Unknown'}</span>
                                            <span 
                                                className="reliability-score"
                                                style={{ color: getReliabilityColor(item?.reliability_score || 0) }}
                                            >
                                                {item?.reliability_score || 0}% reliable
                                            </span>
                                        </div>
                                        <div className="knowledge-actions">
                                            <button 
                                                onClick={() => approveKnowledge(item.id)}
                                                className="btn-approve"
                                            >
                                                ✅ Approve
                                            </button>
                                            <button 
                                                onClick={() => rejectKnowledge(item.id, 'Manual rejection')}
                                                className="btn-reject"
                                            >
                                                ❌ Reject
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="knowledge-content">
                                        <h4>{item?.title || 'Untitled'}</h4>
                                        <p className="knowledge-description">
                                            {item?.content ? item.content.substring(0, 200) + '...' : 'No content available'}
                                        </p>
                                        
                                        <div className="knowledge-details">
                                            <span className="source-type">{item.source_type}</span>
                                            <span className="confidence">{item.confidence_level}</span>
                                            <span className="discovered-date">{formatDate(item.discovered_at)}</span>
                                        </div>
                                        
                                        {item?.keywords && typeof item.keywords === 'string' && (
                                            <div className="keywords">
                                                {item.keywords.split(',').slice(0, 5).map(keyword => (
                                                    <span key={keyword} className="keyword">{keyword.trim()}</span>
                                                ))}
                                            </div>
                                        )}
                                        
                                        <div className="source-link">
                                            <a href={item.source_url} target="_blank" rel="noopener noreferrer">
                                                🔗 View Source
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Top Sources Tab */}
            {activeTab === 'sources' && dashboard && (
                <div className="km-content">
                    <h2>📊 Knowledge Sources Analysis</h2>
                    
                    <div className="sources-grid">
                        <div className="source-section">
                            <h3>🏭 Top Manufacturers</h3>
                            <div className="source-list">
                                {dashboard.topManufacturers.map(([manufacturer, count]) => (
                                    <div key={manufacturer} className="source-item">
                                        <span className="source-name">{manufacturer}</span>
                                        <span className="source-count">{count} items</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="source-section">
                            <h3>🔧 Top Fault Codes</h3>
                            <div className="source-list">
                                {dashboard.topFaultCodes.map(([faultCode, count]) => (
                                    <div key={faultCode} className="source-item">
                                        <span className="source-name">{faultCode}</span>
                                        <span className="source-count">{count} items</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    {stats.sourceBreakdown && (
                        <div className="source-breakdown">
                            <h3>📈 Source Type Breakdown</h3>
                            <div className="breakdown-grid">
                                {Object.entries(stats.sourceBreakdown).map(([sourceType, data]) => (
                                    <div key={sourceType} className="breakdown-item">
                                        <h4>{sourceType}</h4>
                                        <div className="breakdown-stats">
                                            <span>Discovered: {data.discovered}</span>
                                            <span>Verified: {data.verified}</span>
                                            <span>Rejected: {data.rejected}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Knowledge Detail Modal */}
            {selectedKnowledge && (
                <div className="knowledge-modal" onClick={() => setSelectedKnowledge(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{selectedKnowledge.title}</h3>
                            <button onClick={() => setSelectedKnowledge(null)}>×</button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="knowledge-full-content">
                                <p>{selectedKnowledge.content}</p>
                            </div>
                            
                            <div className="knowledge-metadata">
                                <div className="meta-row">
                                    <strong>Fault Code:</strong> {selectedKnowledge.fault_code}
                                </div>
                                <div className="meta-row">
                                    <strong>Manufacturer:</strong> {selectedKnowledge.manufacturer}
                                </div>
                                <div className="meta-row">
                                    <strong>Reliability:</strong> 
                                    <span style={{ color: getReliabilityColor(selectedKnowledge.reliability_score) }}>
                                        {selectedKnowledge.reliability_score}%
                                    </span>
                                </div>
                                <div className="meta-row">
                                    <strong>Source:</strong> 
                                    <a href={selectedKnowledge.source_url} target="_blank" rel="noopener noreferrer">
                                        {selectedKnowledge.source_type}
                                    </a>
                                </div>
                                <div className="meta-row">
                                    <strong>Discovered:</strong> {formatDate(selectedKnowledge.discovered_at)}
                                </div>
                            </div>
                        </div>
                        
                        <div className="modal-actions">
                            <button 
                                onClick={() => {
                                    approveKnowledge(selectedKnowledge.id);
                                    setSelectedKnowledge(null);
                                }}
                                className="btn-approve"
                            >
                                ✅ Approve
                            </button>
                            <button 
                                onClick={() => {
                                    const reason = prompt('Rejection reason:') || 'Manual rejection';
                                    rejectKnowledge(selectedKnowledge.id, reason);
                                    setSelectedKnowledge(null);
                                }}
                                className="btn-reject"
                            >
                                ❌ Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KnowledgeManagement;
