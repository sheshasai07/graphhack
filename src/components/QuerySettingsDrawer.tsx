import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Sparkles,
  GitFork,
  Radio,
  RotateCcw,
  Layers,
  Database,
  Info,
  Cpu,
  Binary,
  Flame,
  Gauge,
  Zap,
} from 'lucide-react';
import type { GraphRAGOptions, ConfigOptions } from '../types';
import { api, MOCK_CONFIG_OPTIONS } from '../services/api';
import './QuerySettingsDrawer.css';

interface QuerySettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  options: GraphRAGOptions;
  onChangeOptions: (opts: GraphRAGOptions) => void;
  configOptions?: ConfigOptions | null;
}

export const DEFAULT_OPTIONS: GraphRAGOptions = {
  top_k_chunks: 8,
  top_k_entities: 10,
  graph_hops: 2,
  temperature: 0.2,
  top_p: 0.9,
  max_tokens: 1024,
  llm_model: 'nvidia/nemotron-3-super-120b-a12b:free',
  embedding_model: 'voyage-4-lite',
  graph_name: 'graphrag',
  use_query_decomposition: true,
  stream: true,
  limit_nodes: 100,
};

const QuerySettingsDrawer: React.FC<QuerySettingsDrawerProps> = ({
  isOpen,
  onClose,
  options,
  onChangeOptions,
  configOptions: initialConfigOptions,
}) => {
  const [config, setConfig] = useState<ConfigOptions>(initialConfigOptions || MOCK_CONFIG_OPTIONS);

  useEffect(() => {
    if (initialConfigOptions) {
      setConfig(initialConfigOptions);
    } else {
      api.getConfigOptions().then(data => setConfig(data)).catch(() => {});
    }
  }, [initialConfigOptions, isOpen]);

  if (!isOpen) return null;

  const update = <K extends keyof GraphRAGOptions>(key: K, value: GraphRAGOptions[K]) => {
    onChangeOptions({ ...options, [key]: value });
  };

  const applyPreset = (preset: 'fast' | 'balanced' | 'deep') => {
    if (preset === 'fast') {
      onChangeOptions({
        ...options,
        top_k_chunks: 4,
        top_k_entities: 5,
        graph_hops: 1,
        temperature: 0.1,
        top_p: 0.9,
        max_tokens: 512,
        use_query_decomposition: false,
        stream: true,
        limit_nodes: 60,
      });
    } else if (preset === 'balanced') {
      onChangeOptions({
        ...options,
        top_k_chunks: 8,
        top_k_entities: 10,
        graph_hops: 2,
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 1024,
        use_query_decomposition: true,
        stream: true,
        limit_nodes: 100,
      });
    } else if (preset === 'deep') {
      onChangeOptions({
        ...options,
        top_k_chunks: 18,
        top_k_entities: 25,
        graph_hops: 3,
        temperature: 0.3,
        top_p: 0.95,
        max_tokens: 2048,
        use_query_decomposition: true,
        stream: true,
        limit_nodes: 250,
      });
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" onClick={e => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-title-group">
            <div className="drawer-icon">
              <Sliders size={18} />
            </div>
            <div>
              <h2 className="drawer-title">Retrieval & RAG Hyperparameters</h2>
              <p className="drawer-subtitle">
                Configure models, FalkorDB multi-hop traversal, and LLM temperature
              </p>
            </div>
          </div>
          <button className="drawer-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Presets Strip */}
        <div className="presets-section">
          <span className="section-label">Quick Hyperparameter Presets</span>
          <div className="presets-grid">
            <button
              type="button"
              className="preset-pill"
              onClick={() => applyPreset('fast')}
              title="Fastest responses, 1-hop traversal, low temperature"
            >
              ⚡ Fast Hybrid
            </button>
            <button
              type="button"
              className="preset-pill active"
              onClick={() => applyPreset('balanced')}
              title="Balanced 2-hop graph reasoning (Recommended)"
            >
              ⭐ Balanced (Default)
            </button>
            <button
              type="button"
              className="preset-pill"
              onClick={() => applyPreset('deep')}
              title="3-hop deep exploration with 18 chunks & high tokens"
            >
              🧠 Deep 3-Hop
            </button>
          </div>
        </div>

        <div className="drawer-body">
          {/* SECTION A: MODEL SELECTION */}
          <div className="settings-group-title">
            <Cpu size={14} className="group-icon" />
            <span>AI Model & Embedding Configuration</span>
          </div>

          {/* 1. LLM Model Dropdown */}
          <div className="setting-card">
            <div className="setting-header">
              <div className="setting-title-box">
                <Cpu size={16} className="setting-icon purple" />
                <div>
                  <div className="setting-label">Synthesis LLM Model (llm_model)</div>
                  <div className="setting-desc">Generation engine for multi-hop answer synthesis</div>
                </div>
              </div>
            </div>
            <select
              className="setting-select"
              value={options.llm_model}
              onChange={e => update('llm_model', e.target.value)}
            >
              {config.llm_models.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Embedding Model Dropdown */}
          <div className="setting-card">
            <div className="setting-header">
              <div className="setting-title-box">
                <Binary size={16} className="setting-icon blue" />
                <div>
                  <div className="setting-label">Embedding Model (embedding_model)</div>
                  <div className="setting-desc">Voyage AI dense vector representations in FalkorDB</div>
                </div>
              </div>
            </div>
            <select
              className="setting-select"
              value={options.embedding_model}
              onChange={e => update('embedding_model', e.target.value)}
            >
              {config.embedding_models.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Target Graph Input */}
          <div className="setting-card">
            <div className="setting-header">
              <div className="setting-title-box">
                <Database size={16} className="setting-icon cyan" />
                <div>
                  <div className="setting-label">Target Graph / Workspace (graph_name)</div>
                  <div className="setting-desc">Isolated FalkorDB graph namespace</div>
                </div>
              </div>
            </div>
            <input
              type="text"
              className="setting-text-input"
              value={options.graph_name}
              onChange={e => update('graph_name', e.target.value)}
              placeholder="graphrag"
            />
          </div>

          {/* SECTION B: RETRIEVAL HYPERPARAMETERS */}
          <div className="settings-group-title">
            <Layers size={14} className="group-icon" />
            <span>Hybrid Retrieval & Graph Traversal</span>
          </div>

          {/* 4. Top-K Chunks Slider (1 to 50) */}
          <div className="setting-card">
            <div className="setting-header">
              <div className="setting-title-box">
                <Layers size={16} className="setting-icon blue" />
                <div>
                  <div className="setting-label">Vector Text Chunks (top_k_chunks)</div>
                  <div className="setting-desc">Raw document chunks retrieved via dense KNN search</div>
                </div>
              </div>
              <span className="setting-val-badge">{options.top_k_chunks} chunks</span>
            </div>
            <input
              type="range"
              min={1}
              max={50}
              step={1}
              value={options.top_k_chunks}
              onChange={e => update('top_k_chunks', Number(e.target.value))}
              className="range-slider blue"
            />
            <div className="range-bounds">
              <span>1 chunk</span>
              <span>Default: 8</span>
              <span>50 chunks</span>
            </div>
          </div>

          {/* 5. Top-K Entities Slider (1 to 50) */}
          <div className="setting-card">
            <div className="setting-header">
              <div className="setting-title-box">
                <Database size={16} className="setting-icon purple" />
                <div>
                  <div className="setting-label">Seed Entities (top_k_entities)</div>
                  <div className="setting-desc">Initial :Entity nodes matched from query embedding in FalkorDB</div>
                </div>
              </div>
              <span className="setting-val-badge purple">{options.top_k_entities} entities</span>
            </div>
            <input
              type="range"
              min={1}
              max={50}
              step={1}
              value={options.top_k_entities}
              onChange={e => update('top_k_entities', Number(e.target.value))}
              className="range-slider purple"
            />
            <div className="range-bounds">
              <span>1 seed</span>
              <span>Default: 10</span>
              <span>50 seeds</span>
            </div>
          </div>

          {/* 6. Multi-Hop Graph Traversal (1 to 5) */}
          <div className="setting-card">
            <div className="setting-header">
              <div className="setting-title-box">
                <GitFork size={16} className="setting-icon cyan" />
                <div>
                  <div className="setting-label">Multi-Hop Traversal (graph_hops)</div>
                  <div className="setting-desc">Number of relationship expansions outward from seed entities (1–5)</div>
                </div>
              </div>
              <span className="setting-val-badge cyan">{options.graph_hops} Hops</span>
            </div>
            <div className="segmented-control">
              {[1, 2, 3, 4, 5].map(hop => (
                <button
                  key={hop}
                  type="button"
                  className={`segmented-btn ${options.graph_hops === hop ? 'active' : ''}`}
                  onClick={() => update('graph_hops', hop)}
                >
                  {hop} {hop === 1 ? 'Hop' : 'Hops'}
                </button>
              ))}
            </div>
          </div>

          {/* SECTION C: LLM GENERATION PARAMETERS */}
          <div className="settings-group-title">
            <Flame size={14} className="group-icon" />
            <span>LLM Generation Hyperparameters</span>
          </div>

          {/* 7. Temperature Slider (0.0 to 2.0) */}
          <div className="setting-card">
            <div className="setting-header">
              <div className="setting-title-box">
                <Flame size={16} className="setting-icon orange" />
                <div>
                  <div className="setting-label">Temperature (temperature)</div>
                  <div className="setting-desc">0.0 = deterministic/factual, 1.0+ = creative</div>
                </div>
              </div>
              <span className="setting-val-badge orange">{options.temperature.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.0}
              max={2.0}
              step={0.05}
              value={options.temperature}
              onChange={e => update('temperature', parseFloat(e.target.value))}
              className="range-slider orange"
            />
            <div className="range-bounds">
              <span>0.0 (Strict / Factual)</span>
              <span>Default: 0.2</span>
              <span>2.0 (Creative)</span>
            </div>
          </div>

          {/* 8. Top-P Slider (0.1 to 1.0) */}
          <div className="setting-card">
            <div className="setting-header">
              <div className="setting-title-box">
                <Gauge size={16} className="setting-icon green" />
                <div>
                  <div className="setting-label">Nucleus Sampling (top_p)</div>
                  <div className="setting-desc">Cumulative probability cutoff for token sampling</div>
                </div>
              </div>
              <span className="setting-val-badge green">{options.top_p.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={1.0}
              step={0.05}
              value={options.top_p}
              onChange={e => update('top_p', parseFloat(e.target.value))}
              className="range-slider green"
            />
            <div className="range-bounds">
              <span>0.1 (Focused)</span>
              <span>Default: 0.9</span>
              <span>1.0 (Full Dist)</span>
            </div>
          </div>

          {/* 9. Max Tokens Slider (64 to 8192) */}
          <div className="setting-card">
            <div className="setting-header">
              <div className="setting-title-box">
                <Zap size={16} className="setting-icon indigo" />
                <div>
                  <div className="setting-label">Max Output Tokens (max_tokens)</div>
                  <div className="setting-desc">Upper limit on synthesized answer response length</div>
                </div>
              </div>
              <span className="setting-val-badge indigo">{options.max_tokens} tokens</span>
            </div>
            <input
              type="range"
              min={64}
              max={8192}
              step={64}
              value={options.max_tokens}
              onChange={e => update('max_tokens', Number(e.target.value))}
              className="range-slider indigo"
            />
            <div className="range-bounds">
              <span>64 (Brief)</span>
              <span>Default: 1024</span>
              <span>8192 (Exhaustive)</span>
            </div>
          </div>

          {/* 10. Query Decomposition Toggle */}
          <div className="setting-card toggle-card">
            <div className="setting-title-box">
              <Sparkles size={16} className="setting-icon gold" />
              <div>
                <div className="setting-label">LLM Query Decomposition</div>
                <div className="setting-desc">Splits complex questions into sub-queries for multi-angle retrieval</div>
              </div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={options.use_query_decomposition}
                onChange={e => update('use_query_decomposition', e.target.checked)}
              />
              <span className="slider round" />
            </label>
          </div>

          {/* 11. Stream Response Toggle */}
          <div className="setting-card toggle-card">
            <div className="setting-title-box">
              <Radio size={16} className="setting-icon green" />
              <div>
                <div className="setting-label">Streaming Response (SSE)</div>
                <div className="setting-desc">Streams retrieval progress & synthesized tokens via EventSource</div>
              </div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={options.stream}
                onChange={e => update('stream', e.target.checked)}
              />
              <span className="slider round" />
            </label>
          </div>

          {/* 12. Graph Canvas Node Density */}
          <div className="setting-card">
            <div className="setting-header">
              <div className="setting-title-box">
                <Sliders size={16} className="setting-icon indigo" />
                <div>
                  <div className="setting-label">Graph Canvas Node Density (limit_nodes)</div>
                  <div className="setting-desc">Maximum high-frequency entities loaded onto force-graph canvas</div>
                </div>
              </div>
              <span className="setting-val-badge">{options.limit_nodes} nodes</span>
            </div>
            <input
              type="range"
              min={10}
              max={300}
              step={10}
              value={options.limit_nodes}
              onChange={e => update('limit_nodes', Number(e.target.value))}
              className="range-slider"
            />
            <div className="range-bounds">
              <span>10 nodes</span>
              <span>300 nodes</span>
            </div>
          </div>

          {/* Architecture Info Callout */}
          <div className="drawer-info-callout">
            <Info size={16} className="callout-icon" />
            <p>
              These parameters directly control the backend OpenCypher query:
              <code> MATCH (e:Entity)-[r*1..{options.graph_hops}]-(neighbor) </code>
              combined with <code>{options.embedding_model}</code> vecf32 cosine similarity indexing and{' '}
              <code>{options.llm_model}</code> synthesis.
            </p>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="drawer-footer">
          <button
            type="button"
            className="reset-btn"
            onClick={() => onChangeOptions(DEFAULT_OPTIONS)}
            title="Reset to default settings"
          >
            <RotateCcw size={14} />
            <span>Reset Defaults</span>
          </button>
          <button type="button" className="done-btn" onClick={onClose}>
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuerySettingsDrawer;
