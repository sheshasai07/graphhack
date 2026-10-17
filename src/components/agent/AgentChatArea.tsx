import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Clock,
  ChevronDown,
  ChevronUp,
  Terminal,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  Layers,
  Shield,
  Loader2,
  Trash2,
  Search,
  Wrench,
  Cpu,
} from 'lucide-react';
import type { AgentMessage, AgentPersona, ReasoningStep } from '../../types';
import MarkdownRenderer from '../MarkdownRenderer';
import './AgentChatArea.css';

interface AgentChatAreaProps {
  messages: AgentMessage[];
  isLoading: boolean;
  onSendMessage: (text: string, persona: AgentPersona, autoResolve: boolean) => void;
  onClearChat: () => void;
  onSelectNodeInGraph?: (nodeId: string) => void;
}

const PRESET_PROMPTS = [
  'We plan to disable SMS 2FA on the login page. What breaks, who owns those systems, and what past incidents exist?',
  'Investigate APIGateway 504 timeouts under high concurrency and check runbooks',
  'Find all maintainers of AuthService and active tasks on the blackboard',
  'Resolve task_9971 with carrier shortcode queue fallback fix',
];

export const AgentChatArea: React.FC<AgentChatAreaProps> = ({
  messages,
  isLoading,
  onSendMessage,
  onClearChat,
  onSelectNodeInGraph,
}) => {
  const [input, setInput] = useState('');
  const [persona, setPersona] = useState<AgentPersona>('auto');
  const [autoResolve, setAutoResolve] = useState(false);
  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({});
  const [copiedCypher, setCopiedCypher] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Expand reasoning by default for latest assistant message
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant' && lastMsg.reasoning_trail?.length) {
      setExpandedReasoning(prev => ({
        ...prev,
        [lastMsg.id]: true,
      }));
    }
  }, [messages]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim(), persona, autoResolve);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleReasoning = (msgId: string) => {
    setExpandedReasoning(prev => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const handleCopyCypher = (cypher: string, id: string) => {
    navigator.clipboard.writeText(cypher);
    setCopiedCypher(id);
    setTimeout(() => setCopiedCypher(null), 2000);
  };

  return (
    <div className="agent-chat-container">
      {/* Top Bar: Persona Selector Pill & Clear Action */}
      <div className="agent-chat-topbar">
        <div className="persona-selector">
          <button
            type="button"
            className={`persona-pill ${persona === 'auto' ? 'active' : ''}`}
            onClick={() => setPersona('auto')}
            title="Intelligently route to Investigator or Resolver based on prompt intent"
          >
            <Sparkles size={13} className="persona-icon-sparkle" />
            <span>Auto Dispatch</span>
          </button>
          <button
            type="button"
            className={`persona-pill ${persona === 'investigator' ? 'active investigator' : ''}`}
            onClick={() => setPersona('investigator')}
            title="Investigator Agent: Hybrid GraphRAG, 3-Hop Topology Traversal & Blast Radius"
          >
            <Search size={13} className="persona-icon-invest" />
            <span>Investigator Agent</span>
          </button>
          <button
            type="button"
            className={`persona-pill ${persona === 'resolver' ? 'active resolver' : ''}`}
            onClick={() => setPersona('resolver')}
            title="Resolver Agent: Handoff Task Claiming & Episodic Memory Persistence"
          >
            <Wrench size={13} className="persona-icon-resolve" />
            <span>Resolver Agent</span>
          </button>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            className="clear-chat-btn"
            onClick={onClearChat}
            title="Clear agent conversation"
          >
            <Trash2 size={13} />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Messages List Area */}
      <div className="agent-messages-scroll">
        {messages.length === 0 ? (
          <div className="agent-empty-hero">
            <div className="hero-icon-container">
              <Cpu size={32} className="hero-cpu-icon" />
              <div className="hero-glow-ring" />
            </div>
            <h2 className="hero-title">GraphGenie Enterprise Multi-Agent</h2>
            <p className="hero-subtitle">
              Cooperative AI reasoning across FalkorDB service topologies, incident memory episodes,
              and live task blackboards.
            </p>

            <div className="agent-prompt-cards-grid">
              {PRESET_PROMPTS.map((prompt, idx) => (
                <div
                  key={idx}
                  className="preset-prompt-card"
                  onClick={() => onSendMessage(prompt, persona, autoResolve)}
                >
                  <div className="preset-card-top">
                    <span className="preset-pill-tag">Sample Incident #{idx + 1}</span>
                    <Sparkles size={13} className="preset-sparkle" />
                  </div>
                  <div className="preset-prompt-text">{prompt}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="agent-messages-list">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`agent-message-wrapper ${msg.role === 'user' ? 'user' : 'assistant'}`}
              >
                <div className={`agent-msg-avatar ${msg.role}`}>
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>

                <div className="agent-msg-body">
                  {/* Assistant Header Banner */}
                  {msg.role === 'assistant' && (
                    <div className="agent-header-banner">
                      <div className="agent-identity">
                        <span className="agent-badge-name">
                          {msg.active_agent || 'Investigator Agent'}
                        </span>
                        <span className="agent-session-tag">Session #{msg.id.slice(-4)}</span>
                      </div>
                      <div className="agent-meta-badges">
                        {msg.execution_time_ms && (
                          <span className="timing-pill">
                            <Clock size={11} />
                            {msg.execution_time_ms}ms
                          </span>
                        )}
                        <span className="falkor-verified-pill">
                          <CheckCircle2 size={11} />
                          FalkorDB Verified
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Main Message Markdown */}
                  <div className="agent-markdown-content">
                    <MarkdownRenderer content={msg.content} />
                  </div>

                  {/* Reasoning Trail Accordion */}
                  {msg.reasoning_trail && msg.reasoning_trail.length > 0 && (
                    <div className="reasoning-accordion">
                      <button
                        type="button"
                        className="reasoning-toggle-btn"
                        onClick={() => toggleReasoning(msg.id)}
                      >
                        <div className="reasoning-btn-left">
                          <GitBranch size={13} className="reasoning-icon" />
                          <span className="reasoning-title">
                            5-Step Multi-Agent Reasoning Trail ({msg.reasoning_trail.length} steps)
                          </span>
                        </div>
                        {expandedReasoning[msg.id] ? (
                          <ChevronUp size={14} className="reasoning-chevron" />
                        ) : (
                          <ChevronDown size={14} className="reasoning-chevron" />
                        )}
                      </button>

                      {expandedReasoning[msg.id] && (
                        <div className="reasoning-steps-container">
                          {msg.reasoning_trail.map((step, sIdx) => (
                            <div key={sIdx} className="reasoning-step-card">
                              <div className="step-header">
                                <div className="step-num-badge">Step {step.step_number || sIdx + 1}</div>
                                <span className="step-action-tag">{step.action}</span>
                                <span className="step-agent-tag">{step.agent}</span>
                                <span className="step-time">{step.timestamp.slice(11, 19)}</span>
                              </div>

                              <div className="step-description">{step.description}</div>

                              {/* Cypher Query Box */}
                              {step.cypher_query && (
                                <div className="cypher-box">
                                  <div className="cypher-box-header">
                                    <div className="cypher-label">
                                      <Terminal size={11} />
                                      <span>Executed Cypher Query (FalkorDB)</span>
                                    </div>
                                    <button
                                      type="button"
                                      className="copy-cypher-btn"
                                      onClick={() =>
                                        handleCopyCypher(step.cypher_query!, `${msg.id}_${sIdx}`)
                                      }
                                      title="Copy Cypher query"
                                    >
                                      {copiedCypher === `${msg.id}_${sIdx}` ? (
                                        <>
                                          <Check size={11} className="copy-ok" />
                                          <span>Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy size={11} />
                                          <span>Copy</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                  <pre className="cypher-code">
                                    <code>{step.cypher_query}</code>
                                  </pre>
                                </div>
                              )}

                              {/* Output Summary */}
                              {step.output_summary && (
                                <div className="step-output">
                                  <span className="output-label">Engine Output:</span>
                                  <span className="output-text">{step.output_summary}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tasks Created or Resolved Badges */}
                  {((msg.tasks_created && msg.tasks_created.length > 0) ||
                    (msg.tasks_resolved && msg.tasks_resolved.length > 0)) && (
                    <div className="agent-tasks-strip">
                      {msg.tasks_created?.map(t => (
                        <div key={t.id} className="task-pill-badge-created">
                          <AlertTriangle size={12} />
                          <span>Dispatched Task {t.id} ({t.target_service || 'Blackboard'})</span>
                        </div>
                      ))}
                      {msg.tasks_resolved?.map(t => (
                        <div key={t.id} className="task-pill-badge-resolved">
                          <CheckCircle2 size={12} />
                          <span>Remediated Task {t.id} & Episode Recorded</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="agent-message-wrapper assistant loading">
                <div className="agent-msg-avatar assistant">
                  <Bot size={16} />
                </div>
                <div className="agent-msg-body loading-body">
                  <div className="loading-indicator">
                    <Loader2 size={16} className="spin-anim" />
                    <span>Investigator & Resolver agents traversing graph & evaluating blast radius...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="agent-chat-input-container">
        <form onSubmit={handleSubmit} className="agent-input-form">
          <div className="agent-input-toolbar">
            <label className="auto-resolve-toggle" title="Automatically dispatch resolution fix & record MemoryEpisode">
              <input
                type="checkbox"
                checked={autoResolve}
                onChange={e => setAutoResolve(e.target.checked)}
              />
              <span className="toggle-label">
                <Shield size={12} className={autoResolve ? 'shield-active' : ''} />
                Auto-Resolve & Record Memory
              </span>
            </label>

            <span className="persona-indicator">
              Persona: <strong>{persona.toUpperCase()}</strong>
            </span>
          </div>

          <div className="agent-textarea-wrapper">
            <textarea
              className="agent-textarea"
              placeholder="Query enterprise topology, investigate incident symptoms, or command resolver agent (e.g. 'We plan to disable SMS 2FA. What breaks?')..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              disabled={isLoading}
            />
            <button
              type="submit"
              className="agent-send-btn"
              disabled={!input.trim() || isLoading}
              title="Execute Agent Reasoning"
            >
              {isLoading ? <Loader2 size={16} className="spin-anim" /> : <Send size={16} />}
            </button>
          </div>

          <div className="input-keyboard-hint">
            Press <strong>Enter</strong> to dispatch agent reasoning • <strong>Shift + Enter</strong> for newline
          </div>
        </form>
      </div>
    </div>
  );
};

export default AgentChatArea;
