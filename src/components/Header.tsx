import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Zap,
  Columns2,
  MessageSquare,
  Share2,
  Sliders,
  Database,
  RefreshCw,
  Server,
  Layers,
  Activity,
  Sparkles,
  Building2,
  ChevronDown,
  RotateCcw,
  CheckCircle2,
  Cpu,
  LogOut,
  User,
} from 'lucide-react';
import type { LayoutMode, GraphStats, SystemHealth, AppModule, Workspace, UserSession } from '../types';
import './Header.css';

interface HeaderProps {
  activeModule: AppModule;
  onModuleChange: (mod: AppModule) => void;
  workspaces: Workspace[];
  currentWorkspace: string;
  onSelectWorkspace: (id: string) => void;
  onSeedGraph: () => void;
  isSeeding?: boolean;
  layoutMode: LayoutMode;
  onLayoutChange: (mode: LayoutMode) => void;
  stats: GraphStats;
  health: SystemHealth | null;
  onRefreshHealth: () => void;
  onOpenSettings: () => void;
  onOpenDocuments: () => void;
  userSession?: UserSession | null;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  activeModule,
  onModuleChange,
  workspaces,
  currentWorkspace,
  onSelectWorkspace,
  onSeedGraph,
  isSeeding = false,
  layoutMode,
  onLayoutChange,
  stats,
  health,
  onRefreshHealth,
  onOpenSettings,
  onOpenDocuments,
  userSession,
  onLogout,
}) => {
  const isHealthy = health?.status === 'healthy';
  const falkorConnected = Boolean(health?.falkordb_connected);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setWorkspaceOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const activeWsObj = workspaces.find(w => w.id === currentWorkspace) || workspaces[0];

  return (
    <header className="header">
      {/* Left: Brand & Module Switcher */}
      <div className="header-left">
        <div className="logo">
          <div className="logo-icon">
            <Cpu size={20} />
          </div>
          <div className="logo-text">
            <span className="logo-name">GraphGenie</span>
            <span className="logo-badge">
              <Sparkles size={10} />
              AI Agent
            </span>
          </div>
        </div>

        {/* Primary Module Switcher Tabs */}
        <div className="module-tabs">
          <button
            className={`module-tab-btn ${activeModule === 'agent' ? 'active' : ''}`}
            onClick={() => onModuleChange('agent')}
            title="Multi-Agent Incident Investigation & Remediation Flow"
          >
            <Zap size={14} className="tab-icon-agent" />
            <span>GraphGenie Agent</span>
            <span className="tab-pill-badge">Live</span>
          </button>
          <button
            className={`module-tab-btn ${activeModule === 'rag' ? 'active' : ''}`}
            onClick={() => onModuleChange('rag')}
            title="Enterprise Document RAG & Hybrid Retrieval"
          >
            <Database size={14} />
            <span>Document RAG</span>
          </button>
        </div>

        {/* Tenant Workspace Dropdown (Agent Mode) */}
        {activeModule === 'agent' && (
          <div className="workspace-selector-container" ref={dropdownRef}>
            <button
              className="workspace-selector-btn"
              onClick={() => setWorkspaceOpen(prev => !prev)}
              title="Switch Enterprise Tenant Workspace"
            >
              <Building2 size={13} className="ws-icon" />
              <div className="ws-btn-text">
                <span className="ws-title-label">Workspace:</span>
                <span className="ws-active-name">{activeWsObj?.name || 'Default Core'}</span>
              </div>
              <ChevronDown size={13} className={`ws-chevron ${workspaceOpen ? 'open' : ''}`} />
            </button>

            {workspaceOpen && (
              <div className="workspace-dropdown-menu">
                <div className="dropdown-header">Tenant Graph Workspaces</div>
                {workspaces.map(w => {
                  const isSelected = w.id === currentWorkspace;
                  return (
                    <div
                      key={w.id}
                      className={`dropdown-item ${isSelected ? 'active' : ''}`}
                      onClick={() => {
                        onSelectWorkspace(w.id);
                        setWorkspaceOpen(false);
                      }}
                    >
                      <div className="dropdown-item-top">
                        <span className="dropdown-item-name">{w.name}</span>
                        {isSelected && <CheckCircle2 size={13} className="item-check" />}
                      </div>
                      <div className="dropdown-item-desc">{w.description}</div>
                      {w.node_count && (
                        <div className="dropdown-item-meta">
                          {w.node_count} nodes • {w.edge_count} edges
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Backend & FalkorDB Connection Pills */}
        <div className="connection-badges">
          <div
            className={`status-pill ${isHealthy ? 'live' : 'offline'}`}
            title={isHealthy ? 'FastAPI Backend Online' : 'FastAPI Backend Offline'}
          >
            <span className="status-dot" />
            <Server size={11} />
            <span>{isHealthy ? 'API Live' : 'API Offline'}</span>
          </div>

          <div
            className={`status-pill ${falkorConnected ? 'live' : 'falkor-standby'}`}
            title={
              falkorConnected
                ? 'FalkorDB Graph Engine Active'
                : 'FalkorDB Standby / Memory Graph Engine'
            }
          >
            <span className={`status-dot ${falkorConnected ? 'live-dot' : 'standby-dot'}`} />
            <Database size={11} />
            <span>{falkorConnected ? 'FalkorDB Active' : 'FalkorDB Standby'}</span>
          </div>

          <button
            className="refresh-btn"
            onClick={onRefreshHealth}
            title="Refresh connection status"
          >
            <RefreshCw size={11} />
          </button>
        </div>
      </div>

      {/* Center: Metrics Strip */}
      <div className="header-center">
        {activeModule === 'rag' ? (
          <div className="graph-telemetry-strip" onClick={onOpenDocuments} title="Click to view Knowledge Base">
            <div className="telemetry-item">
              <Layers size={13} className="telemetry-icon" />
              <span className="telemetry-label">Docs</span>
              <span className="telemetry-val">{stats.documents}</span>
            </div>
            <div className="telemetry-divider" />
            <div className="telemetry-item">
              <Share2 size={13} className="telemetry-icon accent" />
              <span className="telemetry-label">Entities</span>
              <span className="telemetry-val accent">{stats.entities}</span>
            </div>
            <div className="telemetry-divider" />
            <div className="telemetry-item">
              <Activity size={13} className="telemetry-icon cyan" />
              <span className="telemetry-label">Relations</span>
              <span className="telemetry-val cyan">{stats.relations}</span>
            </div>
          </div>
        ) : (
          <div className="agent-status-badge">
            <span className="agent-pulse-dot" />
            <span>Blackboard Active</span>
            <span className="agent-status-sep">•</span>
            <span className="agent-status-sub">2 Cooperative Agents</span>
          </div>
        )}
      </div>

      {/* Right: Actions / Mode Switchers */}
      <div className="header-right">
        {activeModule === 'agent' ? (
          <div className="agent-header-actions">
            <button
              className="action-btn-header reseed-btn"
              onClick={onSeedGraph}
              disabled={isSeeding}
              title="Reseed Enterprise Graph Topology & Incident Memory"
            >
              <RotateCcw size={14} className={isSeeding ? 'spin-anim' : ''} />
              <span>{isSeeding ? 'Seeding...' : 'Reseed Graph'}</span>
            </button>
          </div>
        ) : (
          <>
            {/* Layout Modes for RAG */}
            <div className="layout-switcher">
              <button
                className={`layout-btn ${layoutMode === 'split-dual' ? 'active' : ''}`}
                onClick={() => onLayoutChange('split-dual')}
                title="Dual View: Chat & Graph Canvas"
              >
                <Columns2 size={15} />
                <span className="layout-btn-text">Dual</span>
              </button>
              <button
                className={`layout-btn ${layoutMode === 'chat-only' ? 'active' : ''}`}
                onClick={() => onLayoutChange('chat-only')}
                title="Chat Only View"
              >
                <MessageSquare size={15} />
                <span className="layout-btn-text">Chat</span>
              </button>
              <button
                className={`layout-btn ${layoutMode === 'graph-only' ? 'active' : ''}`}
                onClick={() => onLayoutChange('graph-only')}
                title="Graph Only View"
              >
                <Share2 size={15} />
                <span className="layout-btn-text">Graph</span>
              </button>
            </div>

            {/* Action Buttons for RAG */}
            <div className="header-actions">
              <button
                className="action-btn-header"
                onClick={onOpenDocuments}
                title="Knowledge Base & Document Upload"
              >
                <Database size={15} />
                <span>Documents</span>
              </button>
              <button
                className="action-btn-header highlight"
                onClick={onOpenSettings}
                title="Retrieval Settings & Graph Parameters"
              >
                <Sliders size={15} />
                <span>Settings</span>
              </button>
            </div>
          </>
        )}

        {/* Logged In User Profile & Sign Out */}
        {userSession && (
          <div className="header-user-profile">
            <div className="user-avatar-badge" title={`Signed in as ${userSession.email}`}>
              <span className="user-avatar-initials">
                {userSession.name.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="user-info-text">
              <span className="user-display-name">{userSession.name}</span>
              <span className="user-display-role">{userSession.role.split('•')[0].trim()}</span>
            </div>
            {onLogout && (
              <button
                className="user-logout-btn"
                onClick={onLogout}
                title="Sign Out of Current Session"
              >
                <LogOut size={13} />
                <span className="logout-text">Exit</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
