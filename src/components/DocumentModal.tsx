import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  FileText,
  Trash2,
  Eye,
  CheckCircle2,
  Loader,
  Layers,
  Sparkles,
  Database,
  Zap,
  Sliders,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { Document, ChunkItem, IngestionJob, UploadOptions, ConfigOptions } from '../types';
import { api, MOCK_CONFIG_OPTIONS } from '../services/api';
import './DocumentModal.css';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentAdded?: () => void;
  onDocumentDeleted?: () => void;
  configOptions?: ConfigOptions | null;
}

const PIPELINE_STAGES = [
  { key: 'parsing', label: '1. Parsing' },
  { key: 'chunking', label: '2. Chunking' },
  { key: 'embedding', label: '3. Embedding' },
  { key: 'extracting', label: '4. Entity Discovery' },
  { key: 'writing', label: '5. FalkorDB Graph Storage' },
];

const DocumentModal: React.FC<DocumentModalProps> = ({
  isOpen,
  onClose,
  onDocumentAdded,
  onDocumentDeleted,
  configOptions: initialConfigOptions,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'raw' | 'list'>('upload');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Ingestion / Upload Settings State
  const [chunkSize, setChunkSize] = useState(512);
  const [chunkOverlap, setChunkOverlap] = useState(64);
  const [chunkingStrategy, setChunkingStrategy] = useState<'semantic' | 'recursive' | 'fixed'>('semantic');
  const [enableLlmExtraction, setEnableLlmExtraction] = useState(false);
  const [llmModel, setLlmModel] = useState('nvidia/nemotron-3-super-120b-a12b:free');
  const [graphName, setGraphName] = useState('graphrag');
  const [showConfigDetails, setShowConfigDetails] = useState(true);

  // Dynamic Options
  const [config, setConfig] = useState<ConfigOptions>(initialConfigOptions || MOCK_CONFIG_OPTIONS);

  // File upload state
  const [dragOver, setDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeJob, setActiveJob] = useState<IngestionJob | null>(null);

  // Raw text state
  const [rawTitle, setRawTitle] = useState('');
  const [rawContent, setRawContent] = useState('');
  const [submittingRaw, setSubmittingRaw] = useState(false);

  // Chunk inspection state
  const [inspectingDoc, setInspectingDoc] = useState<Document | null>(null);
  const [docChunks, setDocChunks] = useState<ChunkItem[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);

  // Load documents
  const fetchDocuments = async () => {
    setLoadingDocs(true);
    try {
      const docs = await api.getDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error('Error fetching docs', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDocuments();
      if (!initialConfigOptions) {
        api.getConfigOptions().then(data => setConfig(data)).catch(() => {});
      }
    }
  }, [isOpen, initialConfigOptions]);

  if (!isOpen) return null;

  // Handle file upload with user-configured hyperparameters
  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const uploadOpts: UploadOptions = {
        chunk_size: chunkSize,
        chunk_overlap: chunkOverlap,
        chunking_strategy: chunkingStrategy,
        enable_llm_extraction: enableLlmExtraction,
        llm_model: llmModel,
        graph_name: graphName,
      };

      const res = await api.uploadDocument(file, true, uploadOpts);
      const docId = res.doc_id;

      setActiveJob({
        doc_id: docId,
        doc_name: file.name,
        status: 'parsing',
        total_chunks: res.total_chunks || 12,
        processed_chunks: 0,
        progress_pct: 10,
        total_entities: 0,
        total_relations: 0,
        started_at: new Date().toISOString(),
      });

      api.streamIngestionStatus(docId, (update: any) => {
        setActiveJob(prev => ({
          ...prev,
          ...update,
          doc_name: prev?.doc_name || file.name,
        }));

        if (update.status === 'completed') {
          setIsUploading(false);
          fetchDocuments();
          onDocumentAdded?.();
        } else if (update.status === 'failed') {
          setIsUploading(false);
        }
      });
    } catch (err) {
      console.error('Upload failed', err);
      setIsUploading(false);
    }
  };

  // Handle raw text ingestion
  const handleRawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawContent.trim()) return;

    setSubmittingRaw(true);
    try {
      const title = rawTitle.trim() || 'Raw Knowledge Snippet';
      const res = await api.ingestRaw(title, rawContent, true);
      const docId = res.doc_id;

      setActiveJob({
        doc_id: docId,
        doc_name: title,
        status: 'parsing',
        total_chunks: res.total_chunks || 4,
        processed_chunks: 0,
        progress_pct: 15,
        total_entities: 0,
        total_relations: 0,
        started_at: new Date().toISOString(),
      });

      setActiveTab('upload');
      setRawTitle('');
      setRawContent('');

      api.streamIngestionStatus(docId, (update: any) => {
        setActiveJob(prev => ({
          ...prev,
          ...update,
          doc_name: title,
        }));
        if (update.status === 'completed') {
          setSubmittingRaw(false);
          fetchDocuments();
          onDocumentAdded?.();
        }
      });
    } catch (err) {
      console.error('Raw ingest error', err);
      setSubmittingRaw(false);
    }
  };

  // Handle document deletion
  const handleDeleteDoc = async (id: string) => {
    try {
      await api.deleteDocument(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
      onDocumentDeleted?.();
    } catch (err) {
      console.error('Delete error', err);
    }
  };

  // Handle viewing chunks
  const handleViewChunks = async (doc: Document) => {
    setInspectingDoc(doc);
    setLoadingChunks(true);
    try {
      const chunks = await api.getDocumentChunks(doc.id, 20);
      setDocChunks(chunks);
    } catch (err) {
      console.error('Failed to get chunks', err);
    } finally {
      setLoadingChunks(false);
    }
  };

  const getStageStatus = (stageKey: string, currentStatus?: string) => {
    const order = ['pending', 'parsing', 'chunking', 'embedding', 'extracting', 'writing', 'completed'];
    const currentIdx = order.indexOf(currentStatus || 'parsing');
    const stageIdx = order.indexOf(stageKey);

    if (currentStatus === 'completed') return 'done';
    if (currentIdx === stageIdx) return 'active';
    if (currentIdx > stageIdx) return 'done';
    return 'pending';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon">
              <Database size={20} />
            </div>
            <div>
              <h2 className="modal-title">Knowledge Base & Ingestion</h2>
              <p className="modal-subtitle">
                Upload documents to build vector indices & FalkorDB entity graphs
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          <button
            className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            <Upload size={14} />
            Upload File
          </button>
          <button
            className={`tab-btn ${activeTab === 'raw' ? 'active' : ''}`}
            onClick={() => setActiveTab('raw')}
          >
            <FileText size={14} />
            Paste Raw Text
          </button>
          <button
            className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            <Layers size={14} />
            Ingested Documents ({documents.length})
          </button>
        </div>

        {/* Modal Content */}
        <div className="modal-body">
          {/* Active SSE Pipeline Tracker */}
          {activeJob && (
            <div className="pipeline-tracker-box">
              <div className="tracker-top">
                <div className="tracker-doc-name">
                  <Sparkles size={16} className="sparkle-icon" />
                  <span>Processing: <strong>{activeJob.doc_name}</strong></span>
                </div>
                <div className="tracker-pct">{Math.round(activeJob.progress_pct || 0)}%</div>
              </div>

              {/* Progress Bar */}
              <div className="progress-bar-container">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${activeJob.progress_pct || 5}%` }}
                />
              </div>

              {/* 5-Phase Pipeline Stepper */}
              <div className="pipeline-steps">
                {PIPELINE_STAGES.map(stage => {
                  const status = getStageStatus(stage.key, activeJob.status);
                  return (
                    <div key={stage.key} className={`pipeline-step ${status}`}>
                      <div className="step-bullet">
                        {status === 'done' ? (
                          <CheckCircle2 size={13} />
                        ) : status === 'active' ? (
                          <div className="step-spinner" />
                        ) : (
                          <span className="dot" />
                        )}
                      </div>
                      <span className="step-label">{stage.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Counters */}
              <div className="tracker-stats-row">
                <div className="tracker-stat">
                  <span className="ts-num">{activeJob.processed_chunks || 0} / {activeJob.total_chunks || 0}</span>
                  <span className="ts-lbl">Chunks Vectorized</span>
                </div>
                <div className="tracker-stat">
                  <span className="ts-num">{activeJob.total_entities || 0}</span>
                  <span className="ts-lbl">Entities Extracted</span>
                </div>
                <div className="tracker-stat">
                  <span className="ts-num">{activeJob.total_relations || 0}</span>
                  <span className="ts-lbl">Graph Relations Stored</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: FILE UPLOAD */}
          {activeTab === 'upload' && (
            <div className="upload-view">
              {/* Ingestion & Extraction Configuration Card */}
              <div className="ingest-config-card">
                <div
                  className="ingest-config-header"
                  onClick={() => setShowConfigDetails(prev => !prev)}
                >
                  <div className="ingest-header-left">
                    <Sliders size={15} className="config-header-icon" />
                    <span className="config-header-title">Ingestion & Extraction Configuration</span>
                    <span className="batch-embed-badge">
                      <Zap size={10} />
                      2-Call Batch Embeddings
                    </span>
                  </div>
                  <button type="button" className="config-toggle-btn">
                    {showConfigDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                {showConfigDetails && (
                  <div className="ingest-config-body">
                    {/* 1. Extraction Mode Switch */}
                    <div className="ingest-setting-row">
                      <label className="ingest-field-label">Entity Extraction Mode</label>
                      <div className="extraction-mode-switch">
                        <button
                          type="button"
                          className={`mode-btn offline ${!enableLlmExtraction ? 'active' : ''}`}
                          onClick={() => setEnableLlmExtraction(false)}
                          title="High-speed local NLP rule & heuristic extraction with zero token cost"
                        >
                          <span className="mode-status-dot green" />
                          <div className="mode-text-box">
                            <span className="mode-title">Fast Offline NLP (Recommended)</span>
                            <span className="mode-sub">$0 Token Cost • &lt;1ms Execution</span>
                          </div>
                        </button>
                        <button
                          type="button"
                          className={`mode-btn llm ${enableLlmExtraction ? 'active' : ''}`}
                          onClick={() => setEnableLlmExtraction(true)}
                          title="LLM-based extraction for tough, highly-specialized documents"
                        >
                          <span className="mode-status-dot purple" />
                          <div className="mode-text-box">
                            <span className="mode-title">LLM Entity Extraction</span>
                            <span className="mode-sub">Deep Nuance • For Complex Docs</span>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* 2. Grid: Chunking Strategy & Target Graph */}
                    <div className="ingest-grid-2col">
                      <div className="ingest-input-group">
                        <label className="ingest-field-label">Chunking Strategy</label>
                        <select
                          className="ingest-select"
                          value={chunkingStrategy}
                          onChange={e => setChunkingStrategy(e.target.value as any)}
                        >
                          <option value="semantic">Semantic (Sentence & Paragraph aware - Default)</option>
                          <option value="recursive">Recursive (Markdown #, ##, ### section aware)</option>
                          <option value="fixed">Fixed Window (Strict sliding window)</option>
                        </select>
                      </div>

                      <div className="ingest-input-group">
                        <label className="ingest-field-label">Target Graph / Namespace</label>
                        <input
                          type="text"
                          className="ingest-text-input"
                          value={graphName}
                          onChange={e => setGraphName(e.target.value)}
                          placeholder="graphrag"
                        />
                      </div>
                    </div>

                    {/* If LLM mode is active: LLM Model Dropdown */}
                    {enableLlmExtraction && (
                      <div className="ingest-input-group full-width">
                        <label className="ingest-field-label">Extraction LLM Model</label>
                        <select
                          className="ingest-select"
                          value={llmModel}
                          onChange={e => setLlmModel(e.target.value)}
                        >
                          {config.llm_models.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* 3. Sliders: Chunk Size & Chunk Overlap */}
                    <div className="ingest-sliders-grid">
                      <div className="ingest-slider-card">
                        <div className="slider-header-row">
                          <span className="slider-label">Chunk Size (chunk_size)</span>
                          <span className="slider-val-badge">{chunkSize} tokens</span>
                        </div>
                        <input
                          type="range"
                          min={256}
                          max={2048}
                          step={64}
                          value={chunkSize}
                          onChange={e => setChunkSize(Number(e.target.value))}
                          className="ingest-range-slider"
                        />
                        <div className="slider-bounds">
                          <span>256</span>
                          <span>Default: 512</span>
                          <span>2048 tokens</span>
                        </div>
                      </div>

                      <div className="ingest-slider-card">
                        <div className="slider-header-row">
                          <span className="slider-label">Chunk Overlap (chunk_overlap)</span>
                          <span className="slider-val-badge purple">{chunkOverlap} tokens</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={256}
                          step={16}
                          value={chunkOverlap}
                          onChange={e => setChunkOverlap(Number(e.target.value))}
                          className="ingest-range-slider purple"
                        />
                        <div className="slider-bounds">
                          <span>0</span>
                          <span>Default: 64</span>
                          <span>256 tokens</span>
                        </div>
                      </div>
                    </div>

                    {/* Preserved Batch Embeddings Callout */}
                    <div className="batch-embed-hint">
                      <ShieldCheck size={14} className="batch-hint-icon" />
                      <span>
                        <strong>Preserved Batch Embeddings:</strong> Chunks and entities are batch-embedded in 1 API call each (exactly 2 Voyage AI calls per document), completely eliminating rate-limit errors.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Dropzone */}
              <div
                className={`dropzone ${dragOver ? 'dragover' : ''} ${isUploading ? 'uploading' : ''}`}
                onDragOver={e => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              >
                <div className="dropzone-icon">
                  <Upload size={32} />
                </div>
                <h3>Drag & drop documents here</h3>
                <p>Supports .pdf, .docx, .txt, .md, .csv, .json, .html</p>
                <label className="browse-file-btn">
                  Browse Files
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt,.md,.csv,.json,.html"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                      e.target.value = '';
                    }}
                    hidden
                  />
                </label>
              </div>

              <div className="supported-formats-hint">
                <span>⚡ FalkorDB Entity Extraction will discover nodes, categories, and relationship links based on your configuration.</span>
              </div>
            </div>
          )}

          {/* TAB 2: RAW TEXT INGESTION */}
          {activeTab === 'raw' && (
            <form onSubmit={handleRawSubmit} className="raw-text-view">
              <div className="form-group">
                <label>Document / Topic Title</label>
                <input
                  type="text"
                  placeholder="e.g. FalkorDB Architecture Notes"
                  value={rawTitle}
                  onChange={e => setRawTitle(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group flex-1">
                <label>Content (Articles, Notes, Specifications)</label>
                <textarea
                  placeholder="Paste raw text or documentation here..."
                  value={rawContent}
                  onChange={e => setRawContent(e.target.value)}
                  className="form-textarea"
                  rows={8}
                  required
                />
              </div>

              <button
                type="submit"
                className="submit-raw-btn"
                disabled={submittingRaw || !rawContent.trim()}
              >
                {submittingRaw ? (
                  <>
                    <Loader size={15} className="spinner" />
                    Extracting & Ingesting...
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    Ingest into FalkorDB
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 3: INGESTED DOCUMENTS LIST */}
          {activeTab === 'list' && (
            <div className="docs-table-view">
              {loadingDocs ? (
                <div className="loading-state">
                  <Loader size={24} className="spinner" />
                  <p>Loading ingested documents...</p>
                </div>
              ) : documents.length === 0 ? (
                <div className="empty-docs-box">
                  <FileText size={32} className="muted-icon" />
                  <p>No documents ingested yet.</p>
                  <button className="primary-btn-sm" onClick={() => setActiveTab('upload')}>
                    Upload Your First Document
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="docs-table">
                    <thead>
                      <tr>
                        <th>Document Name</th>
                        <th>Type</th>
                        <th>Chunks</th>
                        <th>Created</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map(doc => (
                        <tr key={doc.id}>
                          <td className="doc-name-cell">
                            <FileText size={14} className="doc-cell-icon" />
                            <span>{doc.name}</span>
                          </td>
                          <td>
                            <span className="file-type-pill">{doc.type || '.pdf'}</span>
                          </td>
                          <td>{doc.chunks || (doc as any).chunk_count || 12}</td>
                          <td className="created-cell">
                            {doc.uploadedAt
                              ? new Date(doc.uploadedAt).toLocaleDateString()
                              : 'Recent'}
                          </td>
                          <td className="text-right actions-cell">
                            <button
                              className="table-action-btn view"
                              onClick={() => handleViewChunks(doc)}
                              title="Inspect Document Chunks"
                            >
                              <Eye size={13} />
                              Chunks
                            </button>
                            <button
                              className="table-action-btn delete"
                              onClick={() => handleDeleteDoc(doc.id)}
                              title="Delete from Graph"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chunk Inspection Slide-out Modal */}
        {inspectingDoc && (
          <div className="chunk-inspector-overlay" onClick={() => setInspectingDoc(null)}>
            <div className="chunk-inspector-panel" onClick={e => e.stopPropagation()}>
              <div className="inspector-header">
                <div>
                  <span className="inspector-tag">Document Chunks Inspection</span>
                  <h3 className="inspector-title">{inspectingDoc.name}</h3>
                </div>
                <button className="close-inspector-btn" onClick={() => setInspectingDoc(null)}>
                  <X size={16} />
                </button>
              </div>

              <div className="inspector-body">
                {loadingChunks ? (
                  <div className="loading-state">
                    <Loader size={20} className="spinner" />
                    <p>Fetching chunk splits...</p>
                  </div>
                ) : docChunks.length === 0 ? (
                  <p className="empty-chunks">No chunk splits recorded.</p>
                ) : (
                  <div className="chunks-list">
                    {docChunks.map((c, i) => (
                      <div key={c.id || i} className="chunk-card">
                        <div className="chunk-header">
                          <span className="chunk-badge">Chunk #{c.chunk_index ?? i + 1}</span>
                          {c.tokens && <span className="chunk-tokens">{c.tokens} tokens</span>}
                        </div>
                        <p className="chunk-text">{c.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentModal;
