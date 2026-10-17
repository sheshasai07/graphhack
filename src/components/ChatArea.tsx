import React, { useRef, useEffect, useState } from 'react';
import {
  Bot,
  User,
  BookOpen,
  ChevronDown,
  Sparkles,
  Loader,
  Share2,
  Clock,
  GitFork,
} from 'lucide-react';
import type { Message } from '../types';
import MarkdownRenderer from './MarkdownRenderer';
import './ChatArea.css';

interface ChatAreaProps {
  messages: Message[];
  isLoading: boolean;
  onSelectEntity?: (entityName: string) => void;
  onOpenDocuments?: () => void;
}

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Technology: { bg: 'rgba(59, 130, 246, 0.15)', text: '#93c5fd', border: 'rgba(59, 130, 246, 0.35)' },
  Concept: { bg: 'rgba(139, 92, 246, 0.15)', text: '#c4b5fd', border: 'rgba(139, 92, 246, 0.35)' },
  Organization: { bg: 'rgba(16, 185, 129, 0.15)', text: '#6ee7b7', border: 'rgba(16, 185, 129, 0.35)' },
  Person: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fde68a', border: 'rgba(245, 158, 11, 0.35)' },
  Location: { bg: 'rgba(236, 72, 153, 0.15)', text: '#fbcfe8', border: 'rgba(236, 72, 153, 0.35)' },
  Default: { bg: 'rgba(99, 102, 241, 0.15)', text: '#c7d2fe', border: 'rgba(99, 102, 241, 0.35)' },
};

const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isLoading,
  onSelectEntity,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const [expandedFacts, setExpandedFacts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const toggleSources = (msgId: string) => {
    setExpandedSources(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const toggleFacts = (msgId: string) => {
    setExpandedFacts(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-area">
      {messages.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon-wrap">
            <Sparkles size={32} />
          </div>
          <h2 className="empty-title">Enterprise GraphRAG Knowledge Assistant</h2>
          <p className="empty-desc">
            Ask complex reasoning questions across your ingested documents. The engine performs
            hybrid vector KNN search, OpenCypher multi-hop graph expansion in FalkorDB, and
            factual LLM synthesis.
          </p>

          <div className="example-prompts">
            {[
              'How does FalkorDB perform vector search alongside graphs?',
              'What are the key advantages of multi-hop graph retrieval?',
              'Explain the relationship between vecf32 embeddings and entities',
              'Summarize the primary architecture tradeoffs in hybrid RAG',
            ].map((prompt, i) => (
              <div
                key={i}
                className="example-chip"
                onClick={() => {
                  const input = document.querySelector('.chat-textarea') as HTMLTextAreaElement;
                  if (input) {
                    input.value = prompt;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.focus();
                  }
                }}
              >
                <Sparkles size={12} className="chip-sparkle" />
                <span>{prompt}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="message-list">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`message ${msg.role === 'user' ? 'user-message' : 'assistant-message'}`}
            >
              <div className={`message-avatar ${msg.role === 'user' ? 'user-avatar' : 'assistant-avatar'}`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>

              <div className="message-body">
                {/* Message Header */}
                <div className="message-header">
                  <span className="message-role">
                    {msg.role === 'user' ? 'You' : 'GraphRAG Engine'}
                  </span>
                  <div className="message-meta-right">
                    {msg.processing_time_ms && (
                      <span className="timing-badge">
                        <Clock size={11} />
                        {msg.processing_time_ms}ms
                      </span>
                    )}
                    <span className="message-time">{formatTime(msg.timestamp)}</span>
                  </div>
                </div>

                {/* 1. Query Decomposition Pills (Sub-queries) */}
                {msg.sub_queries && msg.sub_queries.length > 0 && (
                  <div className="decomposition-box">
                    <div className="decomp-header">
                      <GitFork size={12} />
                      <span>Decomposed Sub-Queries ({msg.sub_queries.length})</span>
                    </div>
                    <div className="decomp-pills">
                      {msg.sub_queries.map((subQ, i) => (
                        <div key={i} className="decomp-pill">
                          <span className="decomp-num">Q{i + 1}</span>
                          <span>{subQ}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Main Content */}
                <div className={`message-content ${msg.isStreaming ? 'streaming' : ''}`}>
                  {msg.isStreaming && <Loader size={14} className="stream-icon" />}
                  <MarkdownRenderer content={msg.content} />
                </div>

                {/* 2. Clickable Entity Badges List */}
                {msg.entities && msg.entities.length > 0 && (
                  <div className="entities-section">
                    <div className="entities-header">
                      <Share2 size={12} />
                      <span>Retrieved Entities (Click to focus in Graph):</span>
                    </div>
                    <div className="entity-badges-list">
                      {msg.entities.map(ent => {
                        const colors = TYPE_COLORS[ent.type] || TYPE_COLORS.Default;
                        return (
                          <button
                            key={ent.id || ent.name}
                            className="entity-badge-btn"
                            style={{
                              background: colors.bg,
                              color: colors.text,
                              borderColor: colors.border,
                            }}
                            onClick={() => onSelectEntity?.(ent.name)}
                            title={`Category: ${ent.type} • Mentioned: ${ent.mention_count || 1} • Click to highlight in Graph`}
                          >
                            <span className="entity-name">{ent.name}</span>
                            <span className="entity-type-tag">{ent.type}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Knowledge Graph Triples / Facts Accordion */}
                {msg.graph_context && msg.graph_context.length > 0 && (
                  <div className="facts-section">
                    <button
                      className="facts-toggle-btn"
                      onClick={() => toggleFacts(msg.id)}
                    >
                      <GitFork size={13} className="facts-icon" />
                      <span>Knowledge Graph Triples ({msg.graph_context.length})</span>
                      <ChevronDown
                        size={13}
                        className={`chevron ${expandedFacts[msg.id] ? 'open' : ''}`}
                      />
                    </button>

                    {expandedFacts[msg.id] && (
                      <div className="facts-grid">
                        {msg.graph_context.map((fact, idx) => (
                          <div key={idx} className="fact-item">
                            <span className="fact-source">{fact.source}</span>
                            <span className="fact-relation">──[{fact.relation}]──&gt;</span>
                            <span className="fact-target">{fact.target}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Document Chunk Citations Accordion */}
                {((msg.chunks && msg.chunks.length > 0) || (msg.sources && msg.sources.length > 0)) && (
                  <div className="sources-section">
                    <button
                      className="sources-toggle-btn"
                      onClick={() => toggleSources(msg.id)}
                    >
                      <BookOpen size={13} className="sources-icon" />
                      <span>
                        Verified Citations & Chunks ({(msg.chunks || msg.sources || []).length})
                      </span>
                      <ChevronDown
                        size={13}
                        className={`chevron ${expandedSources[msg.id] ? 'open' : ''}`}
                      />
                    </button>

                    {expandedSources[msg.id] && (
                      <div className="sources-grid">
                        {msg.chunks && msg.chunks.length > 0
                          ? msg.chunks.map((chunk, idx) => (
                              <div key={chunk.id || idx} className="source-card">
                                <div className="source-num">#{chunk.chunk_index ?? idx + 1}</div>
                                <div className="source-info">
                                  <div className="source-top">
                                    <span className="source-title">{chunk.document_name}</span>
                                    {chunk.score && (
                                      <span className="score-pill">
                                        {Math.round(chunk.score * 100)}% match
                                      </span>
                                    )}
                                  </div>
                                  <p className="source-excerpt">{chunk.text}</p>
                                </div>
                              </div>
                            ))
                          : msg.sources?.map((src, idx) => (
                              <div key={src.id || idx} className="source-card">
                                <div className="source-num">#{idx + 1}</div>
                                <div className="source-info">
                                  <div className="source-top">
                                    <span className="source-title">{src.title}</span>
                                    {src.score && (
                                      <span className="score-pill">
                                        {Math.round(src.score * 100)}% match
                                      </span>
                                    )}
                                  </div>
                                  <p className="source-excerpt">{src.excerpt}</p>
                                </div>
                              </div>
                            ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="message assistant-message">
              <div className="message-avatar assistant-avatar">
                <Bot size={16} />
              </div>
              <div className="message-body">
                <div className="loading-card">
                  <div className="typing-indicator">
                    <span /><span /><span />
                  </div>
                  <span className="loading-text">
                    Traversing FalkorDB knowledge graph & synthesizing response...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
};

export default ChatArea;
