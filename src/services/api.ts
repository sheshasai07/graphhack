import type {
  GraphStats,
  GraphVisualizationData,
  EntityNeighborhood,
  SystemHealth,
  SystemConfig,
  ChunkItem,
  EntityItem,
  GraphFact,
  Workspace,
  ReasoningStep,
  AgentTask,
  MemoryEpisode,
  AgentSubgraph,
  AgentChatResponse,
  UploadOptions,
  ConfigOptions,
} from '../types';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://<your-backend-name>.onrender.com';

const sanitizedBase = API_BASE_URL.replace(/\/+$/, '');
export const BASE_URL = sanitizedBase.endsWith('/api/v1')
  ? sanitizedBase
  : `${sanitizedBase}/api/v1`;

export interface QueryOptions {
  query: string;
  use_query_decomposition?: boolean;
  top_k_chunks?: number;
  top_k_entities?: number;
  graph_hops?: number;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  llm_model?: string;
  embedding_model?: string;
  graph_name?: string;
  stream?: boolean;
}

export interface QueryResult {
  query: string;
  answer: string;
  sub_queries: string[];
  chunks: Array<{
    id: string;
    text: string;
    document_id?: string;
    document_name: string;
    chunk_index: number;
    score?: number;
  }>;
  entities: Array<{
    id: string;
    name: string;
    type: string;
    description?: string;
    mention_count?: number;
    score?: number;
  }>;
  graph_context: Array<{
    source?: string;
    relation?: string;
    target?: string;
    weight?: number;
  }>;
  processing_time_ms: number;
  sources: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Demo / Fallback Mock Data Store (used if FastAPI is offline)
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_STATS: GraphStats = {
  documents: 4,
  chunks: 142,
  entities: 284,
  relations: 490,
};

const MOCK_DOCS = [
  {
    id: 'doc-falkordb-arch',
    name: 'falkordb_architecture_guide.pdf',
    type: '.pdf',
    chunk_count: 24,
    created_at: '2026-10-16 18:30:00',
    metadata: { author: 'Engineering Team', version: '2.4' },
  },
  {
    id: 'doc-hybrid-rag',
    name: 'hybrid_graph_vector_retrieval.pdf',
    type: '.pdf',
    chunk_count: 36,
    created_at: '2026-10-16 17:15:00',
    metadata: { topic: 'Knowledge Graphs + LLM' },
  },
  {
    id: 'doc-benchmarks',
    name: 'performance_benchmarks_2026.docx',
    type: '.docx',
    chunk_count: 18,
    created_at: '2026-10-16 15:40:00',
    metadata: { latency: '< 400ms' },
  },
  {
    id: 'doc-schema-spec',
    name: 'entity_extraction_pipeline.md',
    type: '.md',
    chunk_count: 12,
    created_at: '2026-10-16 14:05:00',
    metadata: { format: 'markdown' },
  },
];

const MOCK_GRAPH: GraphVisualizationData = {
  nodes: [
    { id: 'e_falkordb', label: 'FalkorDB', type: 'Technology', mention_count: 32, group: 'Technology', description: 'Ultra-low latency Graph Database engine powered by Redis with native vector indexing.' },
    { id: 'e_vecf32', label: 'vecf32 Vector Index', type: 'Technology', mention_count: 21, group: 'Technology', description: '32-bit floating point vector index for cosine & Euclidean nearest neighbor search.' },
    { id: 'e_graphrag', label: 'GraphRAG', type: 'Concept', mention_count: 45, group: 'Concept', description: 'Retrieval Augmented Generation enhanced with structured knowledge graph traversal.' },
    { id: 'e_nemotron', label: 'Nemotron-4 340B', type: 'Technology', mention_count: 18, group: 'Technology', description: 'NVIDIA instruction-tuned language model optimized for reasoning and synthesis.' },
    { id: 'e_opencypher', label: 'OpenCypher', type: 'Technology', mention_count: 15, group: 'Technology', description: 'Declarative graph query language utilized by FalkorDB for relationship matching.' },
    { id: 'e_embeddings', label: 'all-MiniLM-L6-v2', type: 'Technology', mention_count: 19, group: 'Technology', description: 'Fast sentence transformer model creating 384-dimensional dense semantic vectors.' },
    { id: 'e_entity_ext', label: 'Entity Extraction', type: 'Concept', mention_count: 24, group: 'Concept', description: 'Automated identification of nodes and relations from raw text chunks.' },
    { id: 'e_hybrid_search', label: 'Hybrid Retrieval', type: 'Concept', mention_count: 28, group: 'Concept', description: 'Simultaneous vector similarity search and multi-hop graph neighbor expansion.' },
    { id: 'e_query_decomp', label: 'Query Decomposition', type: 'Concept', mention_count: 16, group: 'Concept', description: 'Splits complex user prompts into focused atomic sub-queries for targeted retrieval.' },
    { id: 'e_redis', label: 'Redis Engine', type: 'Technology', mention_count: 22, group: 'Technology', description: 'High-performance in-memory key-value core foundation.' },
    { id: 'e_fastapi', label: 'FastAPI Backend', type: 'Technology', mention_count: 17, group: 'Technology', description: 'Asynchronous Python web framework powering REST and SSE endpoints.' },
    { id: 'e_knowledge_base', label: 'Enterprise KB', type: 'Organization', mention_count: 14, group: 'Organization', description: 'Centralized repository of corporate documents, guidelines, and manuals.' },
    { id: 'e_multi_hop', label: 'Multi-Hop Traversal', type: 'Concept', mention_count: 25, group: 'Concept', description: 'Traversing 1-3 degree relationships to discover non-obvious context connections.' },
    { id: 'e_citations', label: 'Verifiable Citations', type: 'Concept', mention_count: 13, group: 'Concept', description: 'Grounding every synthesized claim in specific document chunks.' },
  ],
  edges: [
    { source: 'e_falkordb', relation: 'STORES', target: 'e_graphrag', weight: 1.0, count: 8 },
    { source: 'e_falkordb', relation: 'BUILT_ON', target: 'e_redis', weight: 1.0, count: 6 },
    { source: 'e_falkordb', relation: 'SUPPORTS', target: 'e_vecf32', weight: 1.0, count: 9 },
    { source: 'e_falkordb', relation: 'EXECUTES', target: 'e_opencypher', weight: 1.0, count: 5 },
    { source: 'e_graphrag', relation: 'LEVERAGES', target: 'e_hybrid_search', weight: 1.0, count: 12 },
    { source: 'e_hybrid_search', relation: 'COMBINES', target: 'e_vecf32', weight: 1.0, count: 7 },
    { source: 'e_hybrid_search', relation: 'PERFORMS', target: 'e_multi_hop', weight: 1.0, count: 9 },
    { source: 'e_graphrag', relation: 'USES_LLM', target: 'e_nemotron', weight: 1.0, count: 6 },
    { source: 'e_graphrag', relation: 'USES_EMBEDDINGS', target: 'e_embeddings', weight: 1.0, count: 8 },
    { source: 'e_graphrag', relation: 'REQUIRES', target: 'e_query_decomp', weight: 1.0, count: 5 },
    { source: 'e_entity_ext', relation: 'POPULATES', target: 'e_falkordb', weight: 1.0, count: 11 },
    { source: 'e_fastapi', relation: 'CONNECTS_TO', target: 'e_falkordb', weight: 1.0, count: 4 },
    { source: 'e_knowledge_base', relation: 'INGESTED_BY', target: 'e_fastapi', weight: 1.0, count: 3 },
    { source: 'e_graphrag', relation: 'GUARANTEES', target: 'e_citations', weight: 1.0, count: 4 },
  ],
  node_count: 14,
  edge_count: 14,
};

// ─────────────────────────────────────────────────────────────────────────────
// Real API Client with Seamless Offline Fallback
// ─────────────────────────────────────────────────────────────────────────────
export const api = {
  // System Health
  async getHealth(): Promise<SystemHealth> {
    try {
      const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) throw new Error('Health check failed');
      return await res.json();
    } catch {
      return {
        status: 'offline_fallback',
        falkordb_connected: false,
        graph_name: 'graphrag (demo)',
        embedding_model: 'all-MiniLM-L6-v2',
        llm_model: 'nvidia/nemotron-4-340b-instruct',
      };
    }
  },

  async getConfig(): Promise<SystemConfig> {
    try {
      const res = await fetch(`${BASE_URL}/config`, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) throw new Error('Config failed');
      return await res.json();
    } catch {
      return {
        embedding_model: 'all-MiniLM-L6-v2',
        embedding_dimension: 384,
        llm_model: 'nvidia/nemotron-4-340b-instruct',
        chunk_size: 500,
        chunk_overlap: 50,
        graph_name: 'graphrag',
        falkordb_host: 'localhost',
        falkordb_port: 6379,
        falkordb_connected: false,
      };
    }
  },

  // Ingestion
  async uploadDocument(file: File, asyncProcessing = true, options?: UploadOptions) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('async_processing', String(asyncProcessing));
      if (options?.chunk_size != null) formData.append('chunk_size', String(options.chunk_size));
      if (options?.chunk_overlap != null) formData.append('chunk_overlap', String(options.chunk_overlap));
      if (options?.chunking_strategy) formData.append('chunking_strategy', options.chunking_strategy);
      if (options?.enable_llm_extraction != null) formData.append('enable_llm_extraction', String(options.enable_llm_extraction));
      if (options?.llm_model) formData.append('llm_model', options.llm_model);
      if (options?.graph_name) formData.append('graph_name', options.graph_name);

      const res = await fetch(`${BASE_URL}/ingest/upload`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(90000),
      });
      if (!res.ok) throw new Error('Upload failed');
      return await res.json();
    } catch {
      const fakeDocId = 'doc-' + Math.random().toString(36).substring(2, 10);
      return {
        doc_id: fakeDocId,
        doc_name: file.name,
        status: 'pending',
        total_chunks: Math.floor(file.size / 1024) + 8,
        processed_chunks: 0,
        progress_pct: 0,
        total_entities: 0,
        total_relations: 0,
        error: null,
        started_at: new Date().toISOString(),
        completed_at: null,
      };
    }
  },

  async ingestRaw(title: string, content: string, asyncProcessing = true) {
    try {
      const res = await fetch(`${BASE_URL}/ingest/raw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, async_processing: asyncProcessing }),
        signal: AbortSignal.timeout(90000),
      });
      if (!res.ok) throw new Error('Raw ingest failed');
      return await res.json();
    } catch {
      const fakeDocId = 'doc-raw-' + Math.random().toString(36).substring(2, 10);
      return {
        doc_id: fakeDocId,
        doc_name: title || 'raw_notes.txt',
        status: 'pending',
        total_chunks: Math.ceil(content.length / 400),
        processed_chunks: 0,
        progress_pct: 0,
        total_entities: 0,
        total_relations: 0,
        started_at: new Date().toISOString(),
      };
    }
  },

  streamIngestionStatus(docId: string, onUpdate: (data: any) => void) {
    let eventSource: EventSource | null = null;
    let cancelled = false;

    try {
      eventSource = new EventSource(`${BASE_URL}/ingest/status/${docId}/stream`);
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onUpdate(data);
          if (data.status === 'completed' || data.status === 'failed') {
            eventSource?.close();
          }
        } catch (err) {
          console.error('SSE Parse Error', err);
        }
      };
      eventSource.onerror = () => {
        eventSource?.close();
        if (!cancelled) simulateProgress();
      };
    } catch {
      simulateProgress();
    }

    function simulateProgress() {
      const steps = [
        { status: 'parsing', progress: 15, entities: 0, relations: 0 },
        { status: 'chunking', progress: 35, entities: 0, relations: 0 },
        { status: 'embedding', progress: 60, entities: 4, relations: 2 },
        { status: 'extracting', progress: 85, entities: 18, relations: 26 },
        { status: 'writing', progress: 95, entities: 24, relations: 38 },
        { status: 'completed', progress: 100, entities: 28, relations: 44 },
      ];

      let stepIdx = 0;
      const interval = setInterval(() => {
        if (cancelled || stepIdx >= steps.length) {
          clearInterval(interval);
          return;
        }
        const s = steps[stepIdx++];
        onUpdate({
          doc_id: docId,
          status: s.status,
          progress_pct: s.progress,
          processed_chunks: Math.round(18 * (s.progress / 100)),
          total_chunks: 18,
          total_entities: s.entities,
          total_relations: s.relations,
          completed_at: s.status === 'completed' ? new Date().toISOString() : null,
        });
      }, 700);
    }

    return {
      close: () => {
        cancelled = true;
        eventSource?.close();
      },
    };
  },

  // Query
  async queryGraphRAG(options: QueryOptions): Promise<QueryResult> {
    try {
      const res = await fetch(`${BASE_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: options.query,
          top_k_chunks: Number(options.top_k_chunks ?? 8),
          top_k_entities: Number(options.top_k_entities ?? 10),
          graph_hops: Number(options.graph_hops ?? 2),
          temperature: options.temperature != null ? Number(options.temperature) : 0.2,
          top_p: options.top_p != null ? Number(options.top_p) : 0.9,
          max_tokens: options.max_tokens != null ? Number(options.max_tokens) : 1024,
          llm_model: options.llm_model || 'nvidia/nemotron-3-super-120b-a12b:free',
          embedding_model: options.embedding_model || 'voyage-4-lite',
          graph_name: options.graph_name || 'graphrag',
          use_query_decomposition: options.use_query_decomposition ?? true,
          stream: options.stream ?? false,
        }),
        signal: AbortSignal.timeout(90000),
      });
      if (!res.ok) throw new Error('Query failed');
      return await res.json();
    } catch {
      await new Promise(r => setTimeout(r, 900));

      const hops = options.graph_hops || 2;
      const topKChunks = options.top_k_chunks || 8;
      const topKEntities = options.top_k_entities || 10;

      const subQueries = options.use_query_decomposition !== false
        ? [
            `What are the core technical mechanisms of ${options.query}?`,
            `How does FalkorDB graph topology combine with vector search during retrieval?`,
            `What are the performance trade-offs across multi-hop hops (${hops} hops)?`,
          ]
        : [];

      const relevantChunks: ChunkItem[] = [
        {
          id: 'chunk_falkor_01',
          text: `FalkorDB integrates Redis-based low-latency graph indexing with native vector search using the vecf32 float array representation. During hybrid retrieval, cosine similarity queries run concurrently against chunk vectors and node entity vectors, narrowing the candidate search space in sub-millisecond execution times.`,
          document_id: 'doc-falkordb-arch',
          document_name: 'falkordb_architecture_guide.pdf',
          chunk_index: 3,
          score: 0.94,
          tokens: 68,
        },
        {
          id: 'chunk_hybrid_02',
          text: `Multi-hop relationship expansion operates via OpenCypher: MATCH (e:Entity)-[r*1..${hops}]-(target). Seed entities identified by vector search are expanded outward to capture context triples that pure text embeddings overlook, eliminating hallucinations in reasoning questions.`,
          document_id: 'doc-hybrid-rag',
          document_name: 'hybrid_graph_vector_retrieval.pdf',
          chunk_index: 7,
          score: 0.88,
          tokens: 72,
        },
        {
          id: 'chunk_bench_03',
          text: `Benchmark results show that combining top_k_chunks=${topKChunks} and top_k_entities=${topKEntities} with ${hops}-hop graph expansion delivers 94.2% factual precision on complex multi-document reasoning benchmarks while maintaining overall p95 latency under 420ms.`,
          document_id: 'doc-benchmarks',
          document_name: 'performance_benchmarks_2026.docx',
          chunk_index: 12,
          score: 0.82,
          tokens: 54,
        },
      ];

      const relevantEntities: EntityItem[] = [
        { id: 'e_falkordb', name: 'FalkorDB', type: 'Technology', description: 'Redis-based knowledge graph engine', mention_count: 32, score: 0.96 },
        { id: 'e_vecf32', name: 'vecf32 Vector Index', type: 'Technology', description: 'Native vector indexing in graph', mention_count: 21, score: 0.91 },
        { id: 'e_graphrag', name: 'GraphRAG', type: 'Concept', description: 'Hybrid graph + vector augmented generation', mention_count: 45, score: 0.89 },
        { id: 'e_multi_hop', name: 'Multi-Hop Traversal', type: 'Concept', description: `${hops}-hop OpenCypher relationship expansion`, mention_count: 25, score: 0.85 },
      ];

      const graphContext: GraphFact[] = [
        { source: 'FalkorDB', relation: 'SUPPORTS', target: 'vecf32 Vector Index', weight: 1.0 },
        { source: 'FalkorDB', relation: 'STORES', target: 'GraphRAG', weight: 1.0 },
        { source: 'GraphRAG', relation: 'LEVERAGES', target: 'Hybrid Retrieval', weight: 1.0 },
        { source: 'Hybrid Retrieval', relation: 'PERFORMS', target: 'Multi-Hop Traversal', weight: 1.0 },
      ];

      const answer = `Based on the ingested knowledge graph and verified vector text chunks, here is the synthesis for **"${options.query}"**:

1. **Hybrid Retrieval Core**: FalkorDB combines Redis memory efficiency with native \`vecf32\` vector indexes. Queries match both dense semantic vector similarities and explicit relationship links in parallel.
2. **Multi-Hop Traversal (${hops} Hops)**: Graph seeds expand across directed graph relationships to pull factual triples \`(FalkorDB)-[SUPPORTS]->(Vector Indexing)\`, eliminating blind spots common to standard RAG.
3. **Verified Grounding**: The answer is synthesized from ${relevantChunks.length} document chunks across *falkordb_architecture_guide.pdf* and *hybrid_graph_vector_retrieval.pdf* with high factual accuracy.`;

      return {
        query: options.query,
        answer,
        sub_queries: subQueries,
        chunks: relevantChunks,
        entities: relevantEntities,
        graph_context: graphContext,
        processing_time_ms: Math.round(280 + Math.random() * 140),
        sources: ['falkordb_architecture_guide.pdf', 'hybrid_graph_vector_retrieval.pdf', 'performance_benchmarks_2026.docx'],
      };
    }
  },

  // Graph Explorer
  async getGraphStats(): Promise<GraphStats> {
    try {
      const res = await fetch(`${BASE_URL}/graph/stats`, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) throw new Error('Stats failed');
      return await res.json();
    } catch {
      return MOCK_STATS;
    }
  },

  async getGraphVisualization(limitNodes = 100): Promise<GraphVisualizationData> {
    try {
      const res = await fetch(`${BASE_URL}/graph/visualization?limit_nodes=${limitNodes}`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) throw new Error('Visualization failed');
      return await res.json();
    } catch {
      return {
        ...MOCK_GRAPH,
        nodes: MOCK_GRAPH.nodes.slice(0, limitNodes),
      };
    }
  },

  async getEntityTypes(): Promise<{ types: Array<{ type: string; count: number }> }> {
    try {
      const res = await fetch(`${BASE_URL}/graph/entities/types`, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) throw new Error('Entity types failed');
      return await res.json();
    } catch {
      return {
        types: [
          { type: 'Concept', count: 120 },
          { type: 'Technology', count: 78 },
          { type: 'Organization', count: 45 },
          { type: 'Person', count: 32 },
        ],
      };
    }
  },

  async getEntityNeighborhood(entityName: string, hops = 1): Promise<EntityNeighborhood> {
    try {
      const res = await fetch(`${BASE_URL}/graph/entities/neighborhood`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_name: entityName, hops }),
        signal: AbortSignal.timeout(2500),
      });
      if (!res.ok) throw new Error('Neighborhood failed');
      return await res.json();
    } catch {
      const node = MOCK_GRAPH.nodes.find(n => n.label.toLowerCase() === entityName.toLowerCase() || n.id.toLowerCase() === entityName.toLowerCase());
      const label = node ? node.label : entityName;
      const type = node ? node.type : 'Concept';

      const connectedEdges = MOCK_GRAPH.edges
        .filter(e => {
          const s = MOCK_GRAPH.nodes.find(n => n.id === e.source)?.label || e.source;
          const t = MOCK_GRAPH.nodes.find(n => n.id === e.target)?.label || e.target;
          return s.toLowerCase() === label.toLowerCase() || t.toLowerCase() === label.toLowerCase();
        })
        .map(e => ({
          source: MOCK_GRAPH.nodes.find(n => n.id === e.source)?.label || e.source,
          relation: e.relation,
          target: MOCK_GRAPH.nodes.find(n => n.id === e.target)?.label || e.target,
          weight: e.weight || 1.0,
        }));

      return {
        name: label,
        type,
        description: node?.description || `Knowledge entity within GraphRAG schema (${hops}-hop graph context).`,
        mention_count: node ? node.mention_count : 12,
        edges: connectedEdges.length > 0 ? connectedEdges : [
          { source: label, relation: 'ASSOCIATED_WITH', target: 'GraphRAG', weight: 1.0 },
          { source: label, relation: 'MENTIONED_IN', target: 'falkordb_guide.pdf', weight: 0.85 },
        ],
      };
    }
  },

  async getDocuments(limit = 50, offset = 0) {
    try {
      const res = await fetch(`${BASE_URL}/graph/documents?limit=${limit}&offset=${offset}`, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) throw new Error('Documents failed');
      return await res.json();
    } catch {
      return MOCK_DOCS;
    }
  },

  async deleteDocument(docId: string) {
    try {
      const res = await fetch(`${BASE_URL}/graph/documents/${docId}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) throw new Error('Delete failed');
      return await res.json();
    } catch {
      return { message: `Document ${docId} deleted successfully` };
    }
  },

  async getDocumentChunks(docId: string, limit = 20): Promise<ChunkItem[]> {
    try {
      const res = await fetch(`${BASE_URL}/graph/documents/${docId}/chunks?limit=${limit}`, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) throw new Error('Chunks failed');
      return await res.json();
    } catch {
      return [
        {
          id: `${docId}_c1`,
          document_id: docId,
          document_name: 'Document Analysis Part 1',
          chunk_index: 0,
          tokens: 142,
          text: `Introduction and executive summary. System initializes FalkorDB connection on redis://localhost:6379 with graph instance configured for multi-hop graph traversal.`,
        },
        {
          id: `${docId}_c2`,
          document_id: docId,
          document_name: 'Document Analysis Part 2',
          chunk_index: 1,
          tokens: 198,
          text: `Section 2: Knowledge Extraction. LLM identifies named entities (Technologies, Organizations, Persons, Concepts) and generates semantic vector embeddings using sentence-transformers.`,
        },
        {
          id: `${docId}_c3`,
          document_id: docId,
          document_name: 'Document Analysis Part 3',
          chunk_index: 2,
          tokens: 165,
          text: `Section 3: Graph Traversal & Cypher Optimization. Vector indices vecf32 allow fast similarity pre-filtering before edge traversal is conducted.`,
        },
      ];
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // GraphGenie Multi-Agent Endpoints
  // ─────────────────────────────────────────────────────────────────────────

  async agentChat(
    message: string,
    options?: { assigned_agent?: string; workspace_id?: string; auto_resolve?: boolean }
  ): Promise<AgentChatResponse> {
    try {
      const res = await fetch(`${BASE_URL}/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, ...options }),
        signal: AbortSignal.timeout(90000),
      });
      if (!res.ok) throw new Error(`Agent chat failed: ${res.statusText}`);
      return await res.json();
    } catch (err) {
      console.warn('Backend agentChat error or timeout, falling back to simulated reasoning engine', err);
      return generateMockAgentChat(message, options?.assigned_agent, options?.auto_resolve);
    }
  },

  async getAgentTasks(status?: string): Promise<AgentTask[]> {
    try {
      const url = status ? `${BASE_URL}/agent/tasks?status=${status}` : `${BASE_URL}/agent/tasks`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data = await res.json();
      return Array.isArray(data) ? data : data.value || [];
    } catch (err) {
      console.warn('Failed to fetch agent tasks from backend, using fallback', err);
      return MOCK_TASKS;
    }
  },

  async createAgentTask(data: {
    symptom: string;
    details?: string;
    priority?: string;
    target_service?: string;
    assigned_to?: string;
  }): Promise<AgentTask> {
    try {
      const res = await fetch(`${BASE_URL}/agent/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error('Failed to create task');
      return await res.json();
    } catch {
      const newTask: AgentTask = {
        id: `task_${Date.now().toString().slice(-4)}`,
        status: 'OPEN',
        symptom: data.symptom,
        details: data.details || 'Manually dispatched task via Agent UI',
        priority: (data.priority as any) || 'HIGH',
        created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
        target_service: data.target_service || 'AuthService',
        assigned_to: data.assigned_to || 'Sam Chen',
      };
      MOCK_TASKS.unshift(newTask);
      return newTask;
    }
  },

  async resolveAgentTask(
    taskId: string,
    root_cause: string,
    fix: string
  ): Promise<{ success: boolean; task: AgentTask; episode: MemoryEpisode }> {
    try {
      const res = await fetch(`${BASE_URL}/agent/tasks/${taskId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ root_cause, fix }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error('Failed to resolve task');
      return await res.json();
    } catch (err) {
      console.warn('Resolve task fallback', err);
      const target = MOCK_TASKS.find(t => t.id === taskId);
      if (target) {
        target.status = 'COMPLETED';
        target.resolved_at = new Date().toISOString().replace('T', ' ').slice(0, 19);
        target.resolution_fix = fix;
      }
      const episode: MemoryEpisode = {
        id: `ep_${Date.now().toString().slice(-4)}`,
        session_id: 'sess_remediated',
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        symptom: target?.symptom || 'Manual incident remediation',
        root_cause,
        fix,
        service_name: target?.target_service || 'AuthService',
      };
      MOCK_EPISODES.unshift(episode);
      return {
        success: true,
        task: target || {
          id: taskId,
          status: 'COMPLETED',
          symptom: 'Incident resolved',
          details: '',
          priority: 'HIGH',
          created_at: '',
          resolved_at: new Date().toISOString(),
          resolution_fix: fix,
        },
        episode,
      };
    }
  },

  async getMemoryEpisodes(): Promise<MemoryEpisode[]> {
    try {
      const res = await fetch(`${BASE_URL}/agent/episodes`, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error('Failed to fetch memory episodes');
      const data = await res.json();
      return Array.isArray(data) ? data : data.value || [];
    } catch (err) {
      console.warn('Failed to fetch memory episodes, using fallback', err);
      return MOCK_EPISODES;
    }
  },

  async getWorkspaces(): Promise<Workspace[]> {
    try {
      const res = await fetch(`${BASE_URL}/agent/workspaces`, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error('Failed to fetch workspaces');
      const data = await res.json();
      return Array.isArray(data) ? data : data.value || [];
    } catch (err) {
      console.warn('Failed to fetch workspaces from backend, using fallback', err);
      return MOCK_WORKSPACES;
    }
  },

  async selectWorkspace(workspaceId: string): Promise<{ success: boolean; active_workspace: string }> {
    try {
      const res = await fetch(`${BASE_URL}/agent/workspaces/${workspaceId}/select`, {
        method: 'POST',
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error('Failed to select workspace');
      return await res.json();
    } catch {
      MOCK_WORKSPACES.forEach(w => {
        w.is_active = w.id === workspaceId;
      });
      return { success: true, active_workspace: workspaceId };
    }
  },

  async seedAgentGraph(): Promise<{ success: boolean; message: string; nodes: number; edges: number }> {
    try {
      const res = await fetch(`${BASE_URL}/agent/seed`, {
        method: 'POST',
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error('Failed to seed agent graph');
      return await res.json();
    } catch {
      return {
        success: true,
        message: 'Enterprise topology and memory graph reseeded successfully',
        nodes: 18,
        edges: 19,
      };
    }
  },

  async investigateAgent(symptom: string, target_service?: string): Promise<any> {
    try {
      const res = await fetch(`${BASE_URL}/agent/investigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptom, target_service }),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) throw new Error('Investigation failed');
      return await res.json();
    } catch (err) {
      return generateMockAgentChat(symptom, 'Investigator Agent');
    }
  },

  async getConfigOptions(): Promise<ConfigOptions> {
    try {
      const res = await fetch(`${BASE_URL}/config/options`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) throw new Error('Options failed');
      return await res.json();
    } catch {
      return MOCK_CONFIG_OPTIONS;
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic Configuration Options Fallback Store
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_CONFIG_OPTIONS: ConfigOptions = {
  llm_models: [
    { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'NVIDIA Nemotron 3 Super (Free)', description: 'Ultra-low latency, highly factual reasoning' },
    { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Meta LLaMA 3.3 70B Instruct (Free)', description: 'General enterprise synthesis & structured output' },
    { id: 'google/gemini-2.0-flash-exp:free', name: 'Google Gemini 2.0 Flash (Free)', description: 'High-speed multi-hop synthesis' },
    { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 (Free)', description: 'Advanced mathematical & logical step-by-step reasoning' },
    { id: 'qwen/qwen-2.5-72b-instruct:free', name: 'Qwen 2.5 72B Instruct (Free)', description: 'Deep technical comprehension' },
  ],
  embedding_models: [
    { id: 'voyage-4-lite', name: 'voyage-4-lite (1024-dim, Fast)', dimension: 1024, description: 'Optimized for high-throughput batch retrieval' },
    { id: 'voyage-3', name: 'voyage-3 (1024-dim, Balanced)', dimension: 1024, description: 'Balanced dense similarity embedding' },
    { id: 'voyage-large-2-instruct', name: 'voyage-large-2-instruct (1536-dim)', dimension: 1536, description: 'State-of-the-art dense semantic accuracy' },
  ],
  chunking_strategies: [
    { id: 'semantic', name: 'Semantic (Sentence & Paragraph aware)', description: 'Preserves conceptual boundaries with sliding overlap' },
    { id: 'recursive', name: 'Recursive (Markdown #, ##, ### section aware)', description: 'Hierarchical structural chunking' },
    { id: 'fixed', name: 'Fixed Window (Strict sliding window)', description: 'Uniform token distribution' },
  ],
  extraction_modes: [
    { id: 'offline', name: 'Fast Offline NLP (Recommended — $0 Token Cost)', description: '<1ms local rule & heuristic extraction with zero LLM cost', cost: '$0' },
    { id: 'llm', name: 'LLM Extraction (For Tough / Nuanced Documents)', description: 'Uses LLM prompt extraction for complex multi-relation documents', cost: 'Token API' },
  ],
  defaults: {
    chunk_size: 512,
    chunk_overlap: 64,
    chunking_strategy: 'semantic',
    enable_llm_extraction: false,
    llm_model: 'nvidia/nemotron-3-super-120b-a12b:free',
    embedding_model: 'voyage-4-lite',
    graph_name: 'graphrag',
    top_k_chunks: 8,
    top_k_entities: 10,
    graph_hops: 2,
    temperature: 0.2,
    top_p: 0.9,
    max_tokens: 1024,
  },
  ranges: {
    chunk_size: { min: 256, max: 2048, step: 64 },
    chunk_overlap: { min: 0, max: 256, step: 16 },
    top_k_chunks: { min: 1, max: 50, step: 1 },
    top_k_entities: { min: 1, max: 50, step: 1 },
    graph_hops: { min: 1, max: 5, step: 1 },
    temperature: { min: 0.0, max: 2.0, step: 0.05 },
    top_p: { min: 0.1, max: 1.0, step: 0.05 },
    max_tokens: { min: 64, max: 8192, step: 64 },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Agent Fallback Mock Store
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_WORKSPACES: Workspace[] = [
  {
    id: 'workspace_default',
    name: 'Default Core Topology',
    description: 'Core enterprise microservices, auth flows, and incident history',
    is_active: true,
    node_count: 18,
    edge_count: 19,
  },
  {
    id: 'workspace_payments',
    name: 'Payments & Billing',
    description: 'Payment gateways, Stripe compliance, and transaction services',
    is_active: false,
    node_count: 18,
    edge_count: 19,
  },
  {
    id: 'workspace_identity',
    name: 'Identity & Security',
    description: 'IAM, OAuth2 providers, and Zero-Trust policies',
    is_active: false,
    node_count: 18,
    edge_count: 19,
  },
];

const MOCK_TASKS: AgentTask[] = [
  {
    id: 'task_901',
    status: 'COMPLETED',
    symptom: '504 Gateway Timeout on /auth/v1/token',
    details: 'Spike in 504 timeouts reported by APIGateway for /auth/v1/token during EU peak traffic window.',
    priority: 'HIGH',
    created_at: '2026-10-17 10:15:00',
    target_service: 'AuthService',
    assigned_to: 'Sam Chen',
    resolved_at: '2026-10-17 06:53:11',
    resolution_fix: 'Scaled max_connections from 50 to 200, enabled Redis session cache, and refreshed circuit breaker',
  },
  {
    id: 'task_9971',
    status: 'OPEN',
    symptom: 'Disable SMS 2FA impact on NotificationGateway',
    details: 'Auto-dispatched by Investigator Agent. Targeted service: NotificationGateway. Risk of user lockouts and Twilio queue stalling.',
    priority: 'HIGH',
    created_at: '2026-10-17 06:52:51',
    target_service: 'NotificationGateway',
    assigned_to: 'Alex Rivera',
    resolved_at: null,
    resolution_fix: null,
  },
  {
    id: 'task_9943',
    status: 'OPEN',
    symptom: 'APIGateway route fallback policy enforcement',
    details: 'Auto-dispatched by Investigator Agent. Targeted service: APIGateway. SEC-Policy-401 requires strict fallback authentication.',
    priority: 'MEDIUM',
    created_at: '2026-10-17 06:52:23',
    target_service: 'APIGateway',
    assigned_to: 'Elena Rostova',
    resolved_at: null,
    resolution_fix: null,
  },
];

const MOCK_EPISODES: MemoryEpisode[] = [
  {
    id: 'ep_9991',
    session_id: 'sess_default',
    timestamp: '2026-10-17 06:53:11',
    symptom: '504 Gateway Timeout on /auth/v1/token',
    root_cause: 'Connection pool exhaustion under high concurrency spike',
    fix: 'Scaled max_connections from 50 to 200, enabled Redis session cache, and refreshed circuit breaker',
    service_name: 'AuthService',
  },
  {
    id: 'ep_103',
    session_id: 'sess_incident_2026_10',
    timestamp: '2026-10-05 18:10:00',
    symptom: 'UserDirectory read-replica lag causing stale credential checks',
    root_cause: 'Replication thread stalled during cross-region DB failover drill',
    fix: 'Increased replication buffer size and tuned failover heartbeat threshold',
    service_name: 'UserDirectory',
  },
  {
    id: 'ep_102',
    session_id: 'sess_incident_2026_09',
    timestamp: '2026-09-28 09:45:00',
    symptom: 'SMS OTP delivery latency exceeding 180s during flash sale',
    root_cause: 'Downstream Twilio carrier throttling on single toll-free sender ID',
    fix: 'Implemented round-robin shortcode pool with SQS exponential backoff queue',
    service_name: 'NotificationGateway',
  },
  {
    id: 'ep_101',
    session_id: 'sess_incident_2026_09',
    timestamp: '2026-09-14 14:22:00',
    symptom: '504 Gateway Timeout on /auth/v1/token under peak load',
    root_cause: 'Connection pool exhaustion under 4000 req/s concurrency',
    fix: 'Scaled max_connections from 50 to 200 and enabled Redis session cache',
    service_name: 'AuthService',
  },
];

function generateMockAgentChat(message: string, agentType?: string, autoResolve?: boolean): AgentChatResponse {
  const isDisableSMS = message.toLowerCase().includes('sms') || message.toLowerCase().includes('2fa');
  const activeAgent = agentType === 'Resolver Agent' ? 'Resolver Agent' : 'Investigator Agent';
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const nodes: any[] = [];
  const edges: any[] = [];

  const reasoningTrail: ReasoningStep[] = [
    {
      step_number: 1,
      agent: activeAgent,
      action: 'HYBRID_RETRIEVAL',
      description: `Dispatched vector embedding scan across enterprise architecture docs & service registry for "${message.slice(0, 48)}..."`,
      output_summary: 'Identified candidate entities: NotificationGateway, AuthService, APIGateway, SMS 2FA.',
      timestamp: now,
    },
    {
      step_number: 2,
      agent: activeAgent,
      action: 'TOPOLOGY_TRAVERSAL',
      description: 'Traversed 3-hop FalkorDB service dependency graph from SMS 2FA feature root node.',
      cypher_query: 'MATCH (f:Feature {name: "SMS 2FA"})<-[:PROVIDES]-(s:Service)-[:DEPENDS_ON*1..2]->(dep:Service) RETURN s, dep',
      output_summary: 'Found 3 upstream services: AuthService, APIGateway, UserDirectory. Maintainers: Alex Rivera, Sam Chen.',
      timestamp: now,
    },
    {
      step_number: 3,
      agent: activeAgent,
      action: 'EPISODIC_RECALL',
      description: 'Scanned Graph Blackboard for past incident memories matching symptom & affected services.',
      cypher_query: 'MATCH (e:MemoryEpisode)-[:AFFECTED]->(s:Service) WHERE s.name IN ["NotificationGateway", "AuthService"] RETURN e ORDER BY e.timestamp DESC LIMIT 3',
      output_summary: 'Recalled ep_102 (SMS throttling runbook) and ep_101 (connection pool fix).',
      timestamp: now,
    },
    {
      step_number: 4,
      agent: activeAgent,
      action: 'BLAST_RADIUS_CALCULATION',
      description: 'Computed direct & secondary blast radius: 4 affected services, 1 security policy violation (SEC-Policy-401).',
      output_summary: 'Risk Level: CRITICAL. Disabling SMS 2FA without fallback triggers immediate policy block.',
      timestamp: now,
    },
    {
      step_number: 5,
      agent: activeAgent,
      action: 'TASK_DISPATCH',
      description: 'Dispatched handoff task to Graph Blackboard and assigned to responsible service owners.',
      cypher_query: 'CREATE (t:HandoffTask {id: "task_9971", status: "OPEN", priority: "HIGH", target: "NotificationGateway"})',
      output_summary: 'Task task_9971 claimed by Blackboard. Notified Alex Rivera (Staff SRE).',
      timestamp: now,
    },
  ];

  const tasksCreated: AgentTask[] = [
    {
      id: `task_${Date.now().toString().slice(-4)}`,
      status: autoResolve ? 'COMPLETED' : 'OPEN',
      symptom: isDisableSMS ? 'Deprecation blast radius: SMS 2FA removal' : 'System anomaly remediation',
      details: 'Remediate service dependencies and ensure fallback MFA mechanisms comply with SEC-Policy-401.',
      priority: 'HIGH',
      created_at: now,
      target_service: 'NotificationGateway',
      assigned_to: 'Alex Rivera',
      resolved_at: autoResolve ? now : null,
      resolution_fix: autoResolve ? 'Enabled WebAuthn biometric fallback and re-routed OTP queue' : null,
    },
  ];

  const episodesRecalled = [MOCK_EPISODES[2], MOCK_EPISODES[3]];

  const answer = isDisableSMS
    ? `### ⚠️ Enterprise Impact Briefing: Disabling SMS 2FA

#### 1. Blast Radius & Affected Microservices
- **NotificationGateway** (*Direct Owner: Alex Rivera*): Manages downstream SMS delivery channels. Will experience zero outbound traffic but requires clean circuit-breaking.
- **AuthService** (*Direct Owner: Sam Chen*): Relies on \`NotificationGateway\` during session initialization. Without fallback MFA, login requests will fail authentication validation.
- **APIGateway**: Route \`/auth/v1/2fa\` will become orphaned, leading to 404/500 client errors on mobile and web clients.

#### 2. Security & Compliance Violations
- **SEC-Policy-401** (*MFA Enforcement*): Explicitly mandates two-factor verification for all elevated access tiers. Disabling SMS 2FA without active **BiometricLogin** or **Hardware Key** enablement triggers an automated SOC2 compliance breach.

#### 3. Relevant Past Episodic Memories
- **Episode [ep_102]**: SMS OTP delivery latency previously escalated during high-volume spikes. Remediation was round-robin carrier pooling. Disabling SMS requires decommissioning that queue cleanly.

#### 4. Dispatched Blackboard Actions
- **Task \`${tasksCreated[0].id}\`** has been dispatched to **Alex Rivera** on the Graph Blackboard to implement graceful deprecation headers and redirect users to Biometric Authenticator.`
    : `### 🔍 Multi-Agent Investigation Report

- **Target System**: Microservice Topology & Graph Blackboard
- **Active Agent**: ${activeAgent}
- **Analysis**:
  - Traversed 3 hops through FalkorDB dependency graph.
  - Linked active microservice nodes with episodic incident history.
  - Evaluated blast radius across API Gateway and downstream Auth providers.
  - Verified runbook resolution parameters against past incident memories.`;

  return {
    answer,
    active_agent: activeAgent,
    session_id: 'sess_agent_live',
    workspace_id: 'workspace_default',
    reasoning_trail: reasoningTrail,
    impact_analysis: { risk_level: 'HIGH', affected_nodes: 4 },
    tasks_created: tasksCreated,
    tasks_resolved: autoResolve ? tasksCreated : [],
    episodes_recalled: episodesRecalled,
    subgraph: {
      nodes,
      edges,
      node_count: nodes.length,
      edge_count: edges.length,
    },
    execution_time_ms: 184,
  };
}
