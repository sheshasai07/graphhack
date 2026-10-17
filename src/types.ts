export type Role = 'user' | 'assistant';

export type LayoutMode = 'split-dual' | 'chat-only' | 'graph-only';

export interface Source {
  id: string;
  title: string;
  excerpt: string;
  score: number;
  page?: number;
  doc?: string;
  chunk_index?: number;
}

export interface EntityItem {
  id: string;
  name: string;
  type: string;
  description?: string;
  mention_count?: number;
  score?: number;
}

export interface GraphFact {
  source?: string;
  relation?: string;
  target?: string;
  weight?: number;
}

export interface ChunkItem {
  id: string;
  text: string;
  document_id?: string;
  document_name: string;
  chunk_index: number;
  score?: number;
  tokens?: number;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: Date;
  sources?: Source[];
  sub_queries?: string[];
  entities?: EntityItem[];
  chunks?: ChunkItem[];
  graph_context?: GraphFact[];
  processing_time_ms?: number;
  isStreaming?: boolean;
}

export interface Document {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date | string;
  status: 'pending' | 'parsing' | 'chunking' | 'embedding' | 'extracting' | 'writing' | 'ready' | 'completed' | 'error' | 'failed' | 'indexing';
  chunks?: number;
  total_chunks?: number;
  processed_chunks?: number;
  progress_pct?: number;
  total_entities?: number;
  total_relations?: number;
  error?: string | null;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GraphRAGOptions {
  top_k_chunks: number;           // 1-50 (Default: 8)
  top_k_entities: number;         // 1-50 (Default: 10)
  graph_hops: number;             // 1-5 (Default: 2)
  temperature: number;            // 0.0 - 2.0 (Default: 0.2)
  top_p: number;                  // 0.0 - 1.0 (Default: 0.9)
  max_tokens: number;             // 64 - 8192 (Default: 1024)
  llm_model: string;              // Model for answer generation
  embedding_model: string;        // Voyage AI embedding model
  graph_name: string;             // Target graph / workspace (Default: 'graphrag')
  use_query_decomposition: boolean; // default true
  stream: boolean;                // default true
  limit_nodes: number;            // 10-500 (Default: 100)
}

export interface UploadOptions {
  chunk_size?: number;            // 256 - 2048 (Default: 512)
  chunk_overlap?: number;         // 0 - 256 (Default: 64)
  chunking_strategy?: 'semantic' | 'recursive' | 'fixed';
  enable_llm_extraction?: boolean; // false = offline NLP (free), true = LLM extraction
  llm_model?: string;
  graph_name?: string;
}

export interface ConfigOptions {
  llm_models: Array<{ id: string; name: string; description?: string }>;
  embedding_models: Array<{ id: string; name: string; dimension?: number; description?: string }>;
  chunking_strategies: Array<{ id: string; name: string; description?: string }>;
  extraction_modes: Array<{ id: string; name: string; description?: string; cost?: string }>;
  defaults?: Record<string, any>;
  ranges?: Record<string, { min: number; max: number; step: number }>;
}

export interface GraphStats {
  documents: number;
  chunks: number;
  entities: number;
  relations: number;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  mention_count: number;
  group: string;
  description?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphEdge {
  source: string;
  relation: string;
  target: string;
  weight?: number;
  count?: number;
}

export interface GraphVisualizationData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  node_count: number;
  edge_count: number;
}

export interface EntityNeighborhood {
  name: string;
  type: string;
  description?: string;
  mention_count: number;
  edges: Array<{
    source: string;
    relation: string;
    target: string;
    weight: number;
  }>;
}

export interface IngestionJob {
  doc_id: string;
  doc_name: string;
  status: string;
  total_chunks: number;
  processed_chunks: number;
  progress_pct: number;
  total_entities: number;
  total_relations: number;
  error?: string | null;
  started_at: string;
  completed_at?: string | null;
}

export interface SystemHealth {
  status: string;
  falkordb_connected: boolean;
  graph_name?: string;
  embedding_model?: string;
  llm_model?: string;
}

export interface SystemConfig {
  embedding_model: string;
  embedding_dimension: number;
  llm_model: string;
  chunk_size: number;
  chunk_overlap: number;
  graph_name: string;
  falkordb_host: string;
  falkordb_port: number;
  falkordb_connected: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// GraphGenie Multi-Agent Schemas & Types
// ─────────────────────────────────────────────────────────────────────────────

export type AppModule = 'agent' | 'rag';
export type AgentPersona = 'auto' | 'investigator' | 'resolver';

export interface Workspace {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  node_count?: number;
  edge_count?: number;
}

export interface ReasoningStep {
  step_number: number;
  agent: string;
  action: string;
  description: string;
  cypher_query?: string;
  output_summary?: string;
  timestamp: string;
}

export interface AgentTask {
  id: string;
  status: 'OPEN' | 'COMPLETED' | 'IN_PROGRESS';
  symptom: string;
  details: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  created_at: string;
  target_service?: string;
  assigned_to?: string;
  resolved_at?: string | null;
  resolution_fix?: string | null;
}

export interface MemoryEpisode {
  id: string;
  session_id?: string;
  timestamp: string;
  symptom: string;
  root_cause: string;
  fix: string;
  service_name?: string;
  service_id?: string;
}

export interface AgentSubgraphNode {
  id: string;
  label: string;
  type: string;
  group?: string;
  properties?: Record<string, any>;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface AgentSubgraphEdge {
  source: string;
  target: string;
  relation: string;
  weight?: number;
}

export interface AgentSubgraph {
  nodes: AgentSubgraphNode[];
  edges: AgentSubgraphEdge[];
  node_count?: number;
  edge_count?: number;
}

export interface AgentChatResponse {
  answer: string;
  active_agent: string;
  session_id: string;
  workspace_id: string;
  reasoning_trail: ReasoningStep[];
  impact_analysis?: any;
  tasks_created: AgentTask[];
  tasks_resolved: AgentTask[];
  episodes_recalled: MemoryEpisode[];
  subgraph: AgentSubgraph;
  execution_time_ms: number;
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  active_agent?: string;
  reasoning_trail?: ReasoningStep[];
  subgraph?: AgentSubgraph;
  tasks_created?: AgentTask[];
  tasks_resolved?: AgentTask[];
  episodes_recalled?: MemoryEpisode[];
  impact_analysis?: any;
  execution_time_ms?: number;
  isStreaming?: boolean;
}
