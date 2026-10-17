import React, { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  ChevronRight,
  FileText,
  Upload,
  ChevronDown,
  Database,
  Settings,
} from 'lucide-react';
import type { Conversation, Document, GraphStats } from '../types';
import './Sidebar.css';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  documents: Document[];
  stats: GraphStats;
  onNewConversation: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onOpenUploadModal: () => void;
  onOpenSettings: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  documents,
  stats,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
  onOpenUploadModal,
  onOpenSettings,
}) => {
  const [docsExpanded, setDocsExpanded] = useState(true);
  const [chatsExpanded, setChatsExpanded] = useState(true);

  return (
    <aside className="sidebar">
      {/* New Chat Button */}
      <div className="sidebar-top">
        <button className="new-chat-btn" onClick={onNewConversation}>
          <Plus size={16} />
          <span>New Conversation</span>
        </button>
      </div>

      {/* Section 1: Knowledge Base Documents */}
      <div className="sidebar-section">
        <button
          className="section-header"
          onClick={() => setDocsExpanded(v => !v)}
        >
          <div className="section-title">
            <FileText size={14} className="sec-icon" />
            <span>Knowledge Base</span>
            <span className="badge">{documents.length}</span>
          </div>
          <ChevronDown
            size={14}
            className={`chevron ${docsExpanded ? 'open' : ''}`}
          />
        </button>

        {docsExpanded && (
          <div className="section-content">
            <button className="sidebar-upload-btn" onClick={onOpenUploadModal}>
              <Upload size={13} />
              <span>Ingest Document / Text</span>
            </button>

            <div className="doc-list">
              {documents.length === 0 ? (
                <p className="empty-hint">No documents ingested yet</p>
              ) : (
                documents.slice(0, 5).map(doc => (
                  <div key={doc.id} className="doc-item" onClick={onOpenUploadModal}>
                    <div className="doc-icon">
                      <FileText size={13} />
                    </div>
                    <div className="doc-info">
                      <span className="doc-name">{doc.name}</span>
                      <div className="doc-meta">
                        <span>{doc.chunks || (doc as any).chunk_count || 12} chunks</span>
                      </div>
                    </div>
                    <div className="doc-status ready">
                      <div className="status-ready-dot" />
                    </div>
                  </div>
                ))
              )}
              {documents.length > 5 && (
                <button className="view-more-docs-btn" onClick={onOpenUploadModal}>
                  + {documents.length - 5} more documents
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Conversation Sessions */}
      <div className="sidebar-section flex-grow">
        <button
          className="section-header"
          onClick={() => setChatsExpanded(v => !v)}
        >
          <div className="section-title">
            <MessageSquare size={14} className="sec-icon" />
            <span>Conversations</span>
            <span className="badge">{conversations.length}</span>
          </div>
          <ChevronDown
            size={14}
            className={`chevron ${chatsExpanded ? 'open' : ''}`}
          />
        </button>

        {chatsExpanded && (
          <div className="section-content conversation-list">
            {conversations.length === 0 ? (
              <p className="empty-hint">No conversations yet</p>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.id}
                  className={`conv-item ${activeConversationId === conv.id ? 'active' : ''}`}
                  onClick={() => onSelectConversation(conv.id)}
                >
                  <div className="conv-icon">
                    <MessageSquare size={13} />
                  </div>
                  <div className="conv-info">
                    <span className="conv-title">{conv.title}</span>
                    <span className="conv-meta">{conv.messages.length} messages</span>
                  </div>
                  <div className="conv-actions">
                    <button
                      className="icon-btn danger"
                      onClick={e => {
                        e.stopPropagation();
                        onDeleteConversation(conv.id);
                      }}
                      title="Delete conversation"
                    >
                      <Trash2 size={12} />
                    </button>
                    <ChevronRight size={12} className="conv-arrow" />
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Section 3: Live Graph Telemetry Card */}
      <div className="sidebar-telemetry-card">
        <div className="telemetry-card-title">
          <Database size={13} />
          <span>FalkorDB Graph Metrics</span>
        </div>
        <div className="sidebar-stats-grid">
          <div className="sb-stat">
            <span className="sb-stat-val">{stats.documents}</span>
            <span className="sb-stat-lbl">Documents</span>
          </div>
          <div className="sb-stat">
            <span className="sb-stat-val cyan">{stats.chunks}</span>
            <span className="sb-stat-lbl">Chunks</span>
          </div>
          <div className="sb-stat">
            <span className="sb-stat-val purple">{stats.entities}</span>
            <span className="sb-stat-lbl">Entities</span>
          </div>
          <div className="sb-stat">
            <span className="sb-stat-val green">{stats.relations}</span>
            <span className="sb-stat-lbl">Relations</span>
          </div>
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <button className="settings-btn" onClick={onOpenSettings}>
          <Settings size={15} />
          <span>Retrieval Settings</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
