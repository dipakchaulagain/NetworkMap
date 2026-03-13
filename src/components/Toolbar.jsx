import { useState } from 'react';
import { deviceTypes } from '../icons';
import { CloudIcon, RouterIcon, SwitchIcon, FirewallIcon, ServerIcon, NetworkTreeIcon } from '../icons';

const iconComponents = {
    cloud: CloudIcon,
    router: RouterIcon,
    switch: SwitchIcon,
    firewall: FirewallIcon,
    server: ServerIcon,
    network: NetworkTreeIcon,
};

const Toolbar = ({ onAutoLayout, onAddGroup, onExport, onImport, onClear }) => {
    const [collapsed, setCollapsed] = useState(false);

    const onDragStart = (event, deviceType) => {
        event.dataTransfer.setData('application/reactflow', deviceType);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div className={`toolbar ${collapsed ? 'collapsed' : ''}`}>
            <button
                className="toolbar-toggle"
                onClick={() => setCollapsed(!collapsed)}
                title={collapsed ? 'Expand toolbar' : 'Collapse toolbar'}
            >
                {collapsed ? '›' : '‹'}
            </button>

            {!collapsed && (
                <>
                    <div className="toolbar-header">
                        <div className="toolbar-logo">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="3" stroke="#f59e0b" strokeWidth="2" />
                                <circle cx="4" cy="6" r="2" stroke="#f59e0b" strokeWidth="1.5" />
                                <circle cx="20" cy="6" r="2" stroke="#f59e0b" strokeWidth="1.5" />
                                <circle cx="4" cy="18" r="2" stroke="#f59e0b" strokeWidth="1.5" />
                                <circle cx="20" cy="18" r="2" stroke="#f59e0b" strokeWidth="1.5" />
                                <line x1="6" y1="7" x2="10" y2="10" stroke="#f59e0b" strokeWidth="1.2" />
                                <line x1="18" y1="7" x2="14" y2="10" stroke="#f59e0b" strokeWidth="1.2" />
                                <line x1="6" y1="17" x2="10" y2="14" stroke="#f59e0b" strokeWidth="1.2" />
                                <line x1="18" y1="17" x2="14" y2="14" stroke="#f59e0b" strokeWidth="1.2" />
                            </svg>
                            <span>NetworkMap</span>
                        </div>
                    </div>

                    <div className="toolbar-section">
                        <div className="toolbar-section-title">Devices</div>
                        <div className="toolbar-items">
                            {deviceTypes.map(({ type, label, description }) => {
                                const IconComp = iconComponents[type];
                                return (
                                    <div
                                        key={type}
                                        className="toolbar-item"
                                        draggable
                                        onDragStart={(e) => onDragStart(e, type)}
                                        title={description}
                                    >
                                        <div className="toolbar-item-icon">
                                            <IconComp size={32} />
                                        </div>
                                        <div className="toolbar-item-info">
                                            <span className="toolbar-item-label">{label}</span>
                                            <span className="toolbar-item-desc">{description}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="toolbar-section">
                        <div className="toolbar-section-title">Actions</div>
                        <div className="toolbar-actions">
                            <button className="toolbar-btn primary" onClick={onAutoLayout} title="Auto-arrange nodes">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
                                    <rect x="10" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
                                    <rect x="5.5" y="10" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
                                    <line x1="3.5" y1="6" x2="3.5" y2="12.5" stroke="currentColor" strokeWidth="1.2" />
                                    <line x1="3.5" y1="12.5" x2="5.5" y2="12.5" stroke="currentColor" strokeWidth="1.2" />
                                    <line x1="12.5" y1="6" x2="12.5" y2="12.5" stroke="currentColor" strokeWidth="1.2" />
                                    <line x1="12.5" y1="12.5" x2="10.5" y2="12.5" stroke="currentColor" strokeWidth="1.2" />
                                </svg>
                                Auto Layout
                            </button>
                            <button className="toolbar-btn" onClick={onAddGroup} title="Add environment container">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <rect x="1" y="1" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" />
                                    <line x1="8" y1="4" x2="8" y2="12" stroke="currentColor" strokeWidth="1.5" />
                                    <line x1="4" y1="8" x2="12" y2="8" stroke="currentColor" strokeWidth="1.5" />
                                </svg>
                                Add Group
                            </button>
                            <button className="toolbar-btn" onClick={onExport} title="Export diagram JSON">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M2 10v3a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                    <line x1="8" y1="2" x2="8" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                    <polyline points="5,7 8,10 11,7" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Export
                            </button>
                            <button className="toolbar-btn" onClick={onImport} title="Import diagram JSON">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M2 10v3a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                    <line x1="8" y1="10" x2="8" y2="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                    <polyline points="5,5 8,2 11,5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Import
                            </button>
                            <button className="toolbar-btn danger" onClick={onClear} title="Clear canvas">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M3 4h10M6 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1M4 4v9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Clear
                            </button>
                        </div>
                    </div>

                    <div className="toolbar-footer">
                        <span>Drag devices onto canvas</span>
                    </div>
                </>
            )}
        </div>
    );
};

export default Toolbar;
