# GraphRAG UI Architecture: Components, Options & React API Integration Guide

This guide details the complete frontend architecture required to connect your React UI (`GraphHack`) with the GraphRAG FastAPI backend (`graphback`).

---

## 1. System Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React Frontend (GraphHack)                      │
│                                                                        │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │   Sidebar & Documents   │  │       Header & Graph Telemetry      │  │
│  │  - Document Ingestion   │  │  - FalkorDB Status / Health         │  │
│  │  - SSE Upload Tracker   │  │  - Node/Edge/Doc Statistics         │  │
│  │  - Document Chunks View │  │  - Layout Switcher (Chat/Graph/Dual)│  │
│  └─────────────────────────┘  └─────────────────────────────────────┘  │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │     Chat & Reasoning    │  │       Interactive Graph View        │  │
│  │  - Query Decomposition  │  │  - D3 / Force-Graph Visualizer      │  │
│  │  - Streaming Tokens/SSE │  │  - Multi-hop Entity Neighborhood    │  │
│  │  - Chunk Citations      │  │  - Type Filtering & Node Sizing     │  │
│  │  - Graph Facts & Triples│  │  - Subgraph Focus on Click          │  │
│  └─────────────────────────┘  └─────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │          Query Settings & Options (Drawer / Modal)               │  │
│  │  - top_k_chunks, top_k_entities, graph_hops, query_decomposition │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST & SSE (Port 8000)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     FastAPI GraphRAG Backend (graphback)               │
│                                                                        │
│  - /api/v1/health & /config  : Connectivity, model info & config       │
│  - /api/v1/ingest/*          : File upload, SSE progress, job list     │
│  - /api/v1/query & /stream   : Hybrid vector + graph multi-hop RAG     │
│  - /api/v1/graph/*           : Stats, entities, neighborhoods, D3 data │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             FalkorDB (Redis Graph + Vector Index vecf32)               │
│         (:Document)-[:HAS_CHUNK]->(:Chunk)-[:MENTIONS]->(:Entity)      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. UI Components Needed in React

Here is the breakdown of all UI components categorized by view and function:

### 2.1 Navigation & Workspace Layout
| Component | Purpose & Description |
|---|---|
| `AppLayout` | Split-view container managing responsive resizing between the Chat pane and Graph visualizer pane. Supports 3 modes: `chat-only`, `graph-only`, and `split-dual`. |
| `Header` | Displays app title, current backend connection status badge (`FalkorDB Connected / Offline`), live graph metrics pills (Docs, Entities, Relations), and layout toggle buttons. |
| `Sidebar` | Houses chat session history, document upload trigger, quick database statistics, and link to API config modal. |

### 2.2 GraphRAG Chat & Reasoning Components
| Component | Purpose & Description |
|---|---|
| `ChatArea` | Message list displaying conversational Q&A, streaming tokens, thought steps, and synthesis timing. |
| `ChatMessageItem` | Renders a single user query or assistant answer with Markdown support. |
| `QueryDecompositionPills` | Displays sub-queries created when `use_query_decomposition=true` (e.g. Sub-question 1, Sub-question 2). |
| `EntityBadgeList` | Renders clickable tags for all entities retrieved in the answer (color-coded by entity type: `Organization`, `Person`, `Concept`, `Location`). Clicking an entity highlights it in the graph view. |
| `SourceCitationsAccordion` | Expandable drawer showing retrieved document text chunks with similarity scores (e.g., `Score: 0.92`, `Doc: annual_report.pdf`, `Chunk #4`). |
| `GraphFactsViewer` | Shows the exact knowledge graph triples used to answer the question (e.g., `(Company)-[ACQUIRED]->(Startup)`). |
| `ChatInputBar` | User input bar with auto-resizing textarea, submit button, stop-generation button, and quick access button to open **Query Options**. |

### 2.3 Knowledge Graph Visualizer Components
| Component | Purpose & Description |
|---|---|
| `GraphVisualizer` | 2D/3D force-directed canvas (using `force-graph`, `react-force-graph`, or `vis-network`) rendering nodes (`:Entity`) and directed edges (`-[RELATION]->`). |
| `GraphToolbar` | Visual controls: Zoom In, Zoom Out, Center/Fit to Screen, Node Density slider (`limit_nodes`), and Physics Pause/Resume. |
| `EntityTypeFilter` | Multi-select chips to toggle entity visibility by category (`Technology`, `Person`, `Location`, `Event`). |
| `EntityNeighborhoodDrawer` | Side drawer that slides out when clicking a node. Shows entity definition, mention frequency, and direct 1-to-3 hop neighbor relations. |
| `GraphSearchInput` | Quick search input to locate and camera-focus on any specific entity in the graph. |

### 2.4 Document Management & Ingestion Components
| Component | Purpose & Description |
|---|---|
| `DocumentUploadModal` | Modal supporting drag-and-drop file upload (`.pdf`, `.docx`, `.txt`, `.md`, `.csv`, `.json`, `.html`) and raw text pasting. |
| `IngestionProgressTracker` | Live animated pipeline progress widget connected via SSE. Displays phases: `Parsing` ➔ `Chunking` ➔ `Embedding` ➔ `LLM Entity Extraction` ➔ `Graph Storage`. |
| `DocumentListTable` | Table listing all ingested documents, file types, chunk counts, creation timestamps, and action buttons (`View Chunks`, `Delete Document`). |
| `DocumentChunkViewer` | Modal or slide-out displaying all chunk splits for a selected document with their token counts and indices. |

### 2.5 Configuration & Settings Component
| Component | Purpose & Description |
|---|---|
| `QuerySettingsDrawer` | Drawer allowing users to tune GraphRAG retrieval parameters dynamically before asking questions. |

---

## 3. Defining Options & Parameters in the UI

To give users full control over the GraphRAG pipeline, define the following interactive options in `QuerySettingsDrawer`:

```typescript
export interface GraphRAGOptions {
  // 1. Vector Text Retrieval Depth
  top_k_chunks: number;           // Range: 1 - 20 (Default: 8)
  
  // 2. Entity Matching Depth
  top_k_entities: number;         // Range: 1 - 30 (Default: 10)
  
  // 3. Multi-Hop Graph Traversal
  graph_hops: number;             // Range: 1 - 3 (Default: 2)
  
  // 4. Query Decomposition
  use_query_decomposition: boolean; // Toggle: true / false (Default: true)
  
  // 5. Response Streaming
  stream: boolean;                // Toggle: true / false (Default: true)
}
```

### UI Controls Definition Table:

| Option Key | UI Control Type | Allowed Values | Default | Impact on Search / Performance |
|---|---|---|---|---|
| `top_k_chunks` | Slider with numeric counter | `1` to `20` (step `1`) | `8` | Controls how many raw document chunks are fetched via vector KNN search. Higher = more context, slightly higher LLM token usage. |
| `top_k_entities` | Slider with numeric counter | `1` to `30` (step `1`) | `10` | Controls how many seed entities are matched from the query embedding against `:Entity` vector embeddings in FalkorDB. |
| `graph_hops` | Segmented Button Group (`1 Hop`, `2 Hops`, `3 Hops`) | `1`, `2`, `3` | `2` | Number of relationship traversals from seed entities. `1` = immediate neighbors; `2` = standard multi-hop relationships; `3` = deep graph exploration. |
| `use_query_decomposition` | Switch / Toggle | `true` / `false` | `true` | When ON, the LLM splits complex multi-part questions into 2-4 sub-queries for targeted hybrid retrieval. |
| `stream` | Switch / Toggle | `true` / `false` | `true` | Streams retrieval status updates and answers via Server-Sent Events (SSE) for lower perceived latency. |
| `limit_nodes` (Graph View) | Slider | `10` to `500` (step `10`) | `100` | Limits how many high-frequency entities are loaded into the interactive graph canvas for performance. |

---

## 4. Backend APIs to Connect to React

Backend Base URL: `http://localhost:8000`

### 4.1 System & Health APIs

#### `GET /api/v1/health`
- **Purpose**: Verify backend connectivity and FalkorDB status in the `Header`.
- **Response**:
```json
{
  "status": "healthy",
  "falkordb_connected": true,
  "graph_name": "graphrag",
  "embedding_model": "all-MiniLM-L6-v2",
  "llm_model": "nvidia/nemotron-4-340b-instruct"
}
```

#### `GET /api/v1/config`
- **Purpose**: Retrieve non-sensitive backend configuration (chunk size, overlap, embedding dimensions).
- **Response**:
```json
{
  "embedding_model": "all-MiniLM-L6-v2",
  "embedding_dimension": 384,
  "llm_model": "nvidia/nemotron-4-340b-instruct",
  "chunk_size": 500,
  "chunk_overlap": 50,
  "graph_name": "graphrag",
  "falkordb_host": "localhost",
  "falkordb_port": 6379,
  "falkordb_connected": true
}
```

---

### 4.2 Document Ingestion APIs

#### `POST /api/v1/ingest/upload`
- **Purpose**: Upload document files for parsing, chunking, embedding, entity extraction, and FalkorDB storage.
- **Content-Type**: `multipart/form-data`
- **Form Data**:
  - `file`: File (`.pdf`, `.docx`, `.txt`, `.md`, `.csv`, `.json`, `.html`)
  - `async_processing`: `true` (boolean)
- **Response (HTTP 202 Accepted)**:
```json
{
  "doc_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "doc_name": "financial_report.pdf",
  "status": "pending",
  "total_chunks": 0,
  "processed_chunks": 0,
  "progress_pct": 0.0,
  "total_entities": 0,
  "total_relations": 0,
  "error": null,
  "started_at": "",
  "completed_at": null
}
```

#### `POST /api/v1/ingest/raw`
- **Purpose**: Direct ingestion of plain text snippets or articles without saving a file.
- **Content-Type**: `application/json`
- **Body**:
```json
{
  "title": "Quantum Computing Notes",
  "content": "Quantum supremacy refers to...",
  "async_processing": true
}
```

#### `GET /api/v1/ingest/status/{doc_id}/stream` *(Real-time SSE)*
- **Purpose**: Live progress updates for document ingestion.
- **Protocol**: Server-Sent Events (`text/event-stream`)
- **Event payload format**:
```json
{
  "doc_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "doc_name": "financial_report.pdf",
  "status": "extracting",
  "total_chunks": 24,
  "processed_chunks": 12,
  "progress_pct": 50.0,
  "total_entities": 38,
  "total_relations": 52,
  "error": null,
  "started_at": "2026-10-16T19:00:00",
  "completed_at": null
}
```
*Possible `status` values:* `pending`, `parsing`, `chunking`, `embedding`, `extracting`, `writing`, `completed`, `failed`.

#### `GET /api/v1/ingest/jobs`
- **Purpose**: List all pending and past ingestion jobs.

---

### 4.3 GraphRAG Query APIs

#### `POST /api/v1/query` (Standard JSON)
- **Purpose**: Perform hybrid Graph + Vector retrieval and answer generation in a single JSON response.
- **Content-Type**: `application/json`
- **Request Body**:
```json
{
  "query": "How does FalkorDB perform vector search alongside graphs?",
  "use_query_decomposition": true,
  "top_k_chunks": 8,
  "top_k_entities": 10,
  "graph_hops": 2,
  "stream": false
}
```
- **Response**:
```json
{
  "query": "How does FalkorDB perform vector search alongside graphs?",
  "answer": "FalkorDB integrates Redis-based graph structures with native vector indexing...",
  "sub_queries": [
    "What is FalkorDB vector indexing mechanism?",
    "How does FalkorDB combine graph traversal with vector similarity?"
  ],
  "chunks": [
    {
      "id": "c_a1b2c3",
      "text": "FalkorDB supports vecf32 vector indexing using cosine similarity...",
      "document_id": "doc_1",
      "document_name": "falkordb_guide.pdf",
      "chunk_index": 2,
      "score": 0.89
    }
  ],
  "entities": [
    {
      "id": "e_falkordb",
      "name": "FalkorDB",
      "type": "Technology",
      "description": "Redis-based knowledge graph database",
      "mention_count": 14,
      "score": 0.95
    }
  ],
  "graph_context": [
    {
      "source": "FalkorDB",
      "relation": "SUPPORTS",
      "target": "Vector Indexing",
      "weight": 1.0
    }
  ],
  "processing_time_ms": 340.5,
  "sources": ["falkordb_guide.pdf"]
}
```

#### `POST /api/v1/query/stream` *(Streaming SSE)*
- **Purpose**: Stream real-time query status, decomposed sub-queries, and the final synthesized answer.
- **Content-Type**: `application/json`
- **Request Body**: Same as `QueryRequest`.
- **SSE Stream Sequence**:
  1. `{"type": "status", "message": "Retrieving context..."}`
  2. `{"type": "context", "chunks": 8, "entities": 10}`
  3. `{"type": "status", "message": "Generating answer..."}`
  4. `{"type": "answer", "query": "...", "answer": "...", "chunks": [...], "entities": [...], "sources": [...]}`
  5. `data: [DONE]`

---

### 4.4 Knowledge Graph APIs

#### `GET /api/v1/graph/stats`
- **Purpose**: Overview counts for header badges and dashboards.
- **Response**:
```json
{
  "documents": 5,
  "chunks": 142,
  "entities": 284,
  "relations": 490
}
```

#### `GET /api/v1/graph/documents?limit=50&offset=0`
- **Purpose**: Retrieve list of ingested documents for the document manager table.
- **Response**:
```json
[
  {
    "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "name": "financial_report.pdf",
    "type": ".pdf",
    "chunk_count": 24,
    "created_at": "2026-10-16 18:30:00",
    "metadata": {}
  }
]
```

#### `DELETE /api/v1/graph/documents/{doc_id}`
- **Purpose**: Delete document, its chunks, and dangling edges from FalkorDB.
- **Response**: `{"message": "Document 9b1deb4d-... deleted successfully"}`

#### `GET /api/v1/graph/documents/{doc_id}/chunks?limit=20`
- **Purpose**: Inspect all chunk splits for a specific document.

#### `GET /api/v1/graph/entities?entity_type=Technology&limit=100&offset=0`
- **Purpose**: Search and browse entities with pagination and optional type filter.

#### `GET /api/v1/graph/entities/types`
- **Purpose**: Fetch all unique entity labels and their frequencies for filter chips.
- **Response**:
```json
{
  "types": [
    {"type": "Concept", "count": 120},
    {"type": "Technology", "count": 78},
    {"type": "Organization", "count": 45},
    {"type": "Person", "count": 32}
  ]
}
```

#### `POST /api/v1/graph/entities/neighborhood`
- **Purpose**: Fetch connected nodes 1-3 hops away when an entity is clicked in the chat or graph.
- **Request Body**:
```json
{
  "entity_name": "FalkorDB",
  "hops": 2
}
```
- **Response**:
```json
{
  "name": "FalkorDB",
  "type": "Technology",
  "description": "Graph database engine",
  "mention_count": 14,
  "edges": [
    {
      "source": "FalkorDB",
      "relation": "STORES",
      "target": "Knowledge Graph",
      "weight": 1.0
    }
  ]
}
```

#### `GET /api/v1/graph/visualization?limit_nodes=100`
- **Purpose**: Fetch complete nodes and links dataset ready for D3 / Force-Graph canvas.
- **Response**:
```json
{
  "nodes": [
    {
      "id": "e_falkordb",
      "label": "FalkorDB",
      "type": "Technology",
      "mention_count": 14,
      "group": "Technology"
    }
  ],
  "edges": [
    {
      "source": "FalkorDB",
      "relation": "SUPPORTS",
      "target": "Vector Indexing",
      "weight": 1.0,
      "count": 3
    }
  ],
  "node_count": 100,
  "edge_count": 185
}
```

---

## 5. Ready-to-Use React TypeScript Service Layer

Create this file in your React project at `src/services/api.ts`:

```typescript
const BASE_URL = 'http://localhost:8000/api/v1';

export interface QueryOptions {
  query: string;
  use_query_decomposition?: boolean;
  top_k_chunks?: number;
  top_k_entities?: number;
  graph_hops?: number;
  stream?: boolean;
}

export interface QueryResult {
  query: string;
  answer: string;
  sub_queries: string[];
  chunks: Array<{
    id: string;
    text: string;
    document_name: string;
    chunk_index: number;
    score: float;
  }>;
  entities: Array<{
    id: string;
    name: string;
    type: string;
    description?: string;
    mention_count?: number;
    score: float;
  }>;
  graph_context: Array<{
    source?: string;
    relation?: string;
    target?: string;
  }>;
  processing_time_ms: number;
  sources: string[];
}

export interface GraphStats {
  documents: number;
  chunks: number;
  entities: number;
  relations: number;
}

export interface GraphVisualizationData {
  nodes: Array<{
    id: string;
    label: string;
    type: string;
    mention_count: number;
    group: string;
  }>;
  edges: Array<{
    source: string;
    relation: string;
    target: string;
    weight: number;
    count: number;
  }>;
  node_count: number;
  edge_count: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// API Methods
// ─────────────────────────────────────────────────────────────────────────────

export const api = {
  // System Health
  async getHealth() {
    const res = await fetch(`${BASE_URL}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  async getConfig() {
    const res = await fetch(`${BASE_URL}/config`);
    return res.json();
  },

  // Ingestion
  async uploadDocument(file: File, asyncProcessing = true) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('async_processing', String(asyncProcessing));

    const res = await fetch(`${BASE_URL}/ingest/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },

  streamIngestionStatus(docId: string, onUpdate: (data: any) => void) {
    const eventSource = new EventSource(`${BASE_URL}/ingest/status/${docId}/stream`);
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onUpdate(data);
        if (data.status === 'completed' || data.status === 'failed') {
          eventSource.close();
        }
      } catch (err) {
        console.error('SSE Parse Error', err);
      }
    };
    eventSource.onerror = () => eventSource.close();
    return eventSource;
  },

  // Query
  async queryGraphRAG(options: QueryOptions): Promise<QueryResult> {
    const res = await fetch(`${BASE_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        top_k_chunks: 8,
        top_k_entities: 10,
        graph_hops: 2,
        use_query_decomposition: true,
        stream: false,
        ...options,
      }),
    });
    if (!res.ok) throw new Error('Query failed');
    return res.json();
  },

  // Graph Explorer
  async getGraphStats(): Promise<GraphStats> {
    const res = await fetch(`${BASE_URL}/graph/stats`);
    return res.json();
  },

  async getGraphVisualization(limitNodes = 100): Promise<GraphVisualizationData> {
    const res = await fetch(`${BASE_URL}/graph/visualization?limit_nodes=${limitNodes}`);
    return res.json();
  },

  async getEntityTypes() {
    const res = await fetch(`${BASE_URL}/graph/entities/types`);
    return res.json();
  },

  async getEntityNeighborhood(entityName: string, hops = 1) {
    const res = await fetch(`${BASE_URL}/graph/entities/neighborhood`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_name: entityName, hops }),
    });
    return res.json();
  },

  async getDocuments(limit = 50, offset = 0) {
    const res = await fetch(`${BASE_URL}/graph/documents?limit=${limit}&offset=${offset}`);
    return res.json();
  },

  async deleteDocument(docId: string) {
    const res = await fetch(`${BASE_URL}/graph/documents/${docId}`, {
      method: 'DELETE',
    });
    return res.json();
  },
};
```

---

## 6. Recommended Implementation Roadmap

1. **Step 1 - Replace Mock Data with Live API**:
   - In `GraphHack/src/App.tsx`, replace `DEMO_DOCS` with `api.getDocuments()` and `api.getGraphStats()`.
   - Update `handleUploadDocument` to call `api.uploadDocument(file)`.
2. **Step 2 - Connect Query Execution**:
   - When the user sends a message in `ChatInput`, call `api.queryGraphRAG(...)`.
   - Render the `sub_queries`, `entities`, and `chunks` inside `ChatMessageItem`.
3. **Step 3 - Add Query Options Drawer**:
   - Add sliders for `top_k_chunks`, `top_k_entities`, `graph_hops` and toggles for `use_query_decomposition` and `stream`.
4. **Step 4 - Integrate Interactive Graph Visualization**:
   - Install `react-force-graph-2d` or Cytoscape:
     ```bash
     npm install react-force-graph-2d
     ```
   - Connect it to `api.getGraphVisualization()` and handle node click to trigger `api.getEntityNeighborhood()`.
