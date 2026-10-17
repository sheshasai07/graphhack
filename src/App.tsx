import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import ChatInput from './components/ChatInput';
import GraphVisualizer from './components/GraphVisualizer';
import QuerySettingsDrawer from './components/QuerySettingsDrawer';
import DocumentModal from './components/DocumentModal';
import AgentChatArea from './components/agent/AgentChatArea';
import AgentGraphViewer from './components/agent/AgentGraphViewer';
import IncidentBlackboard from './components/agent/IncidentBlackboard';
import { api } from './services/api';
import type {
  Conversation,
  Message,
  Document,
  GraphStats,
  GraphVisualizationData,
  GraphNode,
  GraphEdge,
  LayoutMode,
  GraphRAGOptions,
  SystemHealth,
  EntityItem,
  GraphFact,
  AppModule,
  Workspace,
  AgentTask,
  MemoryEpisode,
  AgentSubgraph,
  AgentMessage,
  AgentPersona,
  ConfigOptions,
} from './types';
import './App.css';

/**
 * Build a GraphVisualizationData object from query-returned entities + graph_context.
 * This creates a subgraph containing only the entities and relationships
 * that are actually relevant to the user's query.
 */
function buildQueryGraph(
  entities: EntityItem[],
  graphContext: GraphFact[]
): GraphVisualizationData {
  const nodeMap = new Map<string, GraphNode>();

  // Add entity nodes from the RAG response
  entities.forEach((ent, idx) => {
    const key = ent.name.toLowerCase();
    if (!nodeMap.has(key)) {
      nodeMap.set(key, {
        id: ent.id || `qe_${idx}`,
        label: ent.name,
        type: ent.type || 'Concept',
        mention_count: ent.mention_count || 1,
        group: ent.type || 'Concept',
        description: ent.description,
      });
    }
  });

  // Build edges from graph_context triples
  const edges: GraphEdge[] = [];
  graphContext.forEach((fact) => {
    if (!fact.source || !fact.target || !fact.relation) return;

    const srcKey = fact.source.toLowerCase();
    const tgtKey = fact.target.toLowerCase();

    // Auto-create source node if it doesn't exist yet
    if (!nodeMap.has(srcKey)) {
      nodeMap.set(srcKey, {
        id: `qn_${srcKey.replace(/\s+/g, '_')}`,
        label: fact.source,
        type: 'Concept',
        mention_count: 1,
        group: 'Concept',
      });
    }

    // Auto-create target node if it doesn't exist yet
    if (!nodeMap.has(tgtKey)) {
      nodeMap.set(tgtKey, {
        id: `qn_${tgtKey.replace(/\s+/g, '_')}`,
        label: fact.target,
        type: 'Concept',
        mention_count: 1,
        group: 'Concept',
      });
    }

    edges.push({
      source: nodeMap.get(srcKey)!.id,
      relation: fact.relation,
      target: nodeMap.get(tgtKey)!.id,
      weight: fact.weight || 1.0,
    });
  });

  const nodes = Array.from(nodeMap.values());
  return {
    nodes,
    edges,
    node_count: nodes.length,
    edge_count: edges.length,
  };
}

const DEFAULT_OPTIONS: GraphRAGOptions = {
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

// Initial Seed Subgraph for Enterprise Microservices Topology
const INITIAL_AGENT_SUBGRAPH: AgentSubgraph = {
  nodes: [
    { id: 'srv_auth', label: 'AuthService', type: 'Service', properties: { tier: 'Tier-1', sla: '99.99%', owner: 'Sam Chen' } },
    { id: 'srv_gateway', label: 'APIGateway', type: 'Service', properties: { tier: 'Tier-1', routing: 'Envoy/Kong' } },
    { id: 'srv_notif', label: 'NotificationGateway', type: 'Service', properties: { vendor: 'Twilio', owner: 'Alex Rivera' } },
    { id: 'srv_userdir', label: 'UserDirectory', type: 'Service', properties: { replicaCount: 3, engine: 'PostgreSQL' } },
    { id: 'srv_billing', label: 'BillingService', type: 'Service', properties: { pci_compliant: true, gateway: 'Stripe' } },
    { id: 'srv_session', label: 'SessionStore', type: 'Service', properties: { engine: 'Redis', ttl: '24h' } },
    { id: 'feat_sms', label: 'SMS 2FA', type: 'Feature', properties: { status: 'DEPRECATION_CANDIDATE', tier: 'P1' } },
    { id: 'feat_social', label: 'SocialAuth', type: 'Feature', properties: { providers: 'Google, GitHub' } },
    { id: 'feat_bio', label: 'BiometricLogin', type: 'Feature', properties: { standard: 'WebAuthn' } },
    { id: 'person_alex', label: 'Alex Rivera', type: 'Person', properties: { email: 'alex@enterprise.com', role: 'Staff SRE' } },
    { id: 'person_sam', label: 'Sam Chen', type: 'Person', properties: { email: 'sam@enterprise.com', role: 'Lead Architect' } },
    { id: 'person_elena', label: 'Elena Rostova', type: 'Person', properties: { email: 'elena@enterprise.com', role: 'Gateway Maintainer' } },
    { id: 'pol_401', label: 'SEC-Policy-401', type: 'Policy', properties: { mandate: 'MFA Required for Elevated Access' } },
    { id: 'ep_102', label: 'ep_102: SMS Throttle', type: 'MemoryEpisode', properties: { fix: 'Shortcode pool with SQS' } },
    { id: 'ep_101', label: 'ep_101: 504 Timeout', type: 'MemoryEpisode', properties: { fix: 'Scaled connection pool to 200' } },
  ],
  edges: [
    { source: 'srv_gateway', target: 'srv_auth', relation: 'DEPENDS_ON', weight: 1.0 },
    { source: 'srv_gateway', target: 'srv_billing', relation: 'DEPENDS_ON', weight: 1.0 },
    { source: 'srv_auth', target: 'srv_notif', relation: 'DEPENDS_ON', weight: 1.0 },
    { source: 'srv_auth', target: 'srv_userdir', relation: 'DEPENDS_ON', weight: 0.9 },
    { source: 'srv_auth', target: 'srv_session', relation: 'DEPENDS_ON', weight: 1.0 },
    { source: 'srv_notif', target: 'feat_sms', relation: 'PROVIDES', weight: 1.0 },
    { source: 'srv_auth', target: 'feat_social', relation: 'PROVIDES', weight: 0.8 },
    { source: 'srv_auth', target: 'feat_bio', relation: 'PROVIDES', weight: 0.9 },
    { source: 'person_alex', target: 'srv_notif', relation: 'MAINTAINS', weight: 1.0 },
    { source: 'person_sam', target: 'srv_auth', relation: 'MAINTAINS', weight: 1.0 },
    { source: 'person_elena', target: 'srv_gateway', relation: 'MAINTAINS', weight: 1.0 },
    { source: 'srv_auth', target: 'pol_401', relation: 'GOVERNED_BY', weight: 1.0 },
    { source: 'ep_102', target: 'srv_notif', relation: 'AFFECTED', weight: 1.0 },
    { source: 'ep_101', target: 'srv_auth', relation: 'AFFECTED', weight: 1.0 },
  ],
};

let convCounter = 1;
let msgCounter = 100;
let agentMsgCounter = 200;

function createConversation(): Conversation {
  return {
    id: `conv-${convCounter++}`,
    title: `Chat ${convCounter - 1}`,
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const App: React.FC = () => {
  // Top-Level Module: 'agent' (Main GraphGenie Flow) vs 'rag' (Document Knowledge Base)
  const [activeModule, setActiveModule] = useState<AppModule>('agent');

  // Multi-Tenant Workspaces
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState('workspace_default');
  const [isSeeding, setIsSeeding] = useState(false);

  // GraphGenie Agent Flow State
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  const [agentTasks, setAgentTasks] = useState<AgentTask[]>([]);
  const [memoryEpisodes, setMemoryEpisodes] = useState<MemoryEpisode[]>([]);
  const [agentSubgraph, setAgentSubgraph] = useState<AgentSubgraph>(INITIAL_AGENT_SUBGRAPH);
  const [isAgentLoading, setIsAgentLoading] = useState(false);
  const [selectedAgentNode, setSelectedAgentNode] = useState<string | null>(null);

  // App Layout State for RAG module: 'split-dual' | 'chat-only' | 'graph-only'
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('split-dual');

  // Backend Health & Telemetry
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [graphStats, setGraphStats] = useState<GraphStats>({
    documents: 0,
    chunks: 0,
    entities: 0,
    relations: 0,
  });

  // Graph Visualization Data (full knowledge graph from DB)
  const [graphData, setGraphData] = useState<GraphVisualizationData>({
    nodes: [],
    edges: [],
    node_count: 0,
    edge_count: 0,
  });

  // Query-specific subgraph built from the latest RAG response
  const [queryGraphData, setQueryGraphData] = useState<GraphVisualizationData | null>(null);

  // Selected Entity to highlight in Graph
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);

  // Conversations & Chat for RAG Module
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Documents
  const [documents, setDocuments] = useState<Document[]>([]);

  // Drawers & Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [options, setOptions] = useState<GraphRAGOptions>(DEFAULT_OPTIONS);
  const [configOptions, setConfigOptions] = useState<ConfigOptions | null>(null);

  const activeConversation = conversations.find(c => c.id === activeId) ?? null;

  // 1. Initial Load & Sync with FastAPI Backend & Agent Blackboard
  const syncBackendData = useCallback(async () => {
    try {
      const [h, s, d, g, wsList, tasksList, episodesList, cfg] = await Promise.all([
        api.getHealth(),
        api.getGraphStats(),
        api.getDocuments(),
        api.getGraphVisualization(options.limit_nodes),
        api.getWorkspaces(),
        api.getAgentTasks(),
        api.getMemoryEpisodes(),
        api.getConfigOptions().catch(() => null),
      ]);
      setHealth(h);
      setGraphStats(s);
      setDocuments(d);
      setGraphData(g);
      setWorkspaces(wsList);
      setAgentTasks(tasksList);
      setMemoryEpisodes(episodesList);
      if (cfg) setConfigOptions(cfg);

      const activeWs = wsList.find(w => w.is_active);
      if (activeWs) setCurrentWorkspace(activeWs.id);
    } catch (err) {
      console.warn('Backend sync error', err);
    }
  }, [options.limit_nodes]);

  useEffect(() => {
    syncBackendData();
    // Create initial conversation for RAG module
    const initialConv = createConversation();
    setConversations([initialConv]);
    setActiveId(initialConv.id);
  }, [syncBackendData]);

  // Refresh agent blackboard tasks
  const handleRefreshTasks = useCallback(async () => {
    try {
      const tasksList = await api.getAgentTasks();
      setAgentTasks(tasksList);
    } catch (err) {
      console.warn('Error refreshing tasks', err);
    }
  }, []);

  // Refresh episodic memories
  const handleRefreshEpisodes = useCallback(async () => {
    try {
      const episodesList = await api.getMemoryEpisodes();
      setMemoryEpisodes(episodesList);
    } catch (err) {
      console.warn('Error refreshing episodes', err);
    }
  }, []);

  // Switch Active Tenant Workspace
  const handleSelectWorkspace = useCallback(async (workspaceId: string) => {
    try {
      await api.selectWorkspace(workspaceId);
      setCurrentWorkspace(workspaceId);
      setWorkspaces(prev =>
        prev.map(w => ({ ...w, is_active: w.id === workspaceId }))
      );
      await Promise.all([handleRefreshTasks(), handleRefreshEpisodes()]);
    } catch (err) {
      console.error('Error selecting workspace', err);
    }
  }, [handleRefreshTasks, handleRefreshEpisodes]);

  // Reseed Enterprise Graph Topology
  const handleSeedGraph = useCallback(async () => {
    setIsSeeding(true);
    try {
      await api.seedAgentGraph();
      await syncBackendData();
      setAgentSubgraph(INITIAL_AGENT_SUBGRAPH);
    } catch (err) {
      console.error('Seed error', err);
    } finally {
      setIsSeeding(false);
    }
  }, [syncBackendData]);

  // Claim & Resolve Handoff Task
  const handleResolveTask = useCallback(
    async (taskId: string, rootCause: string, fix: string) => {
      try {
        await api.resolveAgentTask(taskId, rootCause, fix);
        await Promise.all([handleRefreshTasks(), handleRefreshEpisodes()]);
      } catch (err) {
        console.error('Resolve task error', err);
      }
    },
    [handleRefreshTasks, handleRefreshEpisodes]
  );

  // Manual Dispatch Task
  const handleCreateTask = useCallback(
    async (data: { symptom: string; details: string; priority: string; target_service?: string; assigned_to?: string }) => {
      try {
        await api.createAgentTask(data);
        await handleRefreshTasks();
      } catch (err) {
        console.error('Create task error', err);
      }
    },
    [handleRefreshTasks]
  );

  // 2. Multi-Agent Conversation Dispatch
  const handleAgentSendMessage = useCallback(
    async (text: string, persona: AgentPersona, autoResolve: boolean) => {
      const userMsg: AgentMessage = {
        id: `agent-msg-${agentMsgCounter++}`,
        role: 'user',
        content: text,
        timestamp: new Date(),
      };

      setAgentMessages(prev => [...prev, userMsg]);
      setIsAgentLoading(true);

      try {
        const assignedAgent =
          persona === 'investigator'
            ? 'Investigator Agent'
            : persona === 'resolver'
            ? 'Resolver Agent'
            : undefined;

        const response = await api.agentChat(text, {
          assigned_agent: assignedAgent,
          workspace_id: currentWorkspace,
          auto_resolve: autoResolve,
        });

        const assistantMsg: AgentMessage = {
          id: `agent-msg-${agentMsgCounter++}`,
          role: 'assistant',
          content: response.answer,
          timestamp: new Date(),
          active_agent: response.active_agent,
          reasoning_trail: response.reasoning_trail,
          subgraph: response.subgraph,
          tasks_created: response.tasks_created,
          tasks_resolved: response.tasks_resolved,
          episodes_recalled: response.episodes_recalled,
          impact_analysis: response.impact_analysis,
          execution_time_ms: response.execution_time_ms,
        };

        setAgentMessages(prev => [...prev, assistantMsg]);

        // Update Subgraph Canvas with the newly returned incident topology
        if (response.subgraph && response.subgraph.nodes && response.subgraph.nodes.length > 0) {
          setAgentSubgraph(response.subgraph);
          setSelectedAgentNode(response.subgraph.nodes[0]?.id || null);
        }

        // Refresh Blackboard tasks and memories if tasks were created or resolved
        await Promise.all([handleRefreshTasks(), handleRefreshEpisodes()]);
      } catch (err) {
        console.error('Agent chat error', err);
        const errorMsg: AgentMessage = {
          id: `agent-msg-${agentMsgCounter++}`,
          role: 'assistant',
          content: 'An unexpected error occurred while communicating with the Multi-Agent engine. Please check the backend connection.',
          timestamp: new Date(),
          active_agent: 'Error Handler',
        };
        setAgentMessages(prev => [...prev, errorMsg]);
      } finally {
        setIsAgentLoading(false);
      }
    },
    [currentWorkspace, handleRefreshTasks, handleRefreshEpisodes]
  );

  // Handle entity click in chat -> Switch to dual or graph view if chat-only, and focus node
  const handleSelectEntity = useCallback((entityName: string) => {
    setSelectedEntity(entityName);
    if (layoutMode === 'chat-only') {
      setLayoutMode('split-dual');
    }
  }, [layoutMode]);

  // Load Entity Neighborhood
  const handleLoadNeighborhood = useCallback(
    async (entityName: string) => {
      return await api.getEntityNeighborhood(entityName, options.graph_hops);
    },
    [options.graph_hops]
  );

  // Conversation Actions for RAG
  const handleNewConversation = useCallback(() => {
    const conv = createConversation();
    setConversations(prev => [conv, ...prev]);
    setActiveId(conv.id);
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const handleDeleteConversation = useCallback((id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    setActiveId(prev => (prev === id ? null : prev));
  }, []);

  // RAG Query Execution via Live GraphRAG API
  const handleSendMessage = useCallback(
    async (content: string) => {
      let convId = activeId;
      if (!convId) {
        const conv = createConversation();
        setConversations(prev => [conv, ...prev]);
        convId = conv.id;
        setActiveId(convId);
      }

      const userMsg: Message = {
        id: `msg-${msgCounter++}`,
        role: 'user',
        content,
        timestamp: new Date(),
      };

      setConversations(prev =>
        prev.map(c =>
          c.id === convId
            ? {
                ...c,
                messages: [...c.messages, userMsg],
                title: c.messages.length === 0 ? content.slice(0, 36) : c.title,
                updatedAt: new Date(),
              }
            : c
        )
      );

      setIsLoading(true);

      try {
        const result = await api.queryGraphRAG({
          query: content,
          top_k_chunks: options.top_k_chunks,
          top_k_entities: options.top_k_entities,
          graph_hops: options.graph_hops,
          temperature: options.temperature,
          top_p: options.top_p,
          max_tokens: options.max_tokens,
          llm_model: options.llm_model,
          embedding_model: options.embedding_model,
          graph_name: options.graph_name,
          use_query_decomposition: options.use_query_decomposition,
          stream: options.stream,
        });

        const assistantMsg: Message = {
          id: `msg-${msgCounter++}`,
          role: 'assistant',
          content: result.answer,
          timestamp: new Date(),
          sub_queries: result.sub_queries,
          entities: result.entities,
          chunks: result.chunks,
          graph_context: result.graph_context,
          processing_time_ms: result.processing_time_ms,
          sources: result.sources.map((s, idx) => ({
            id: `src-${idx}`,
            title: s,
            excerpt: result.chunks?.[idx]?.text || 'Verified knowledge snippet',
            score: result.chunks?.[idx]?.score || 0.9,
            doc: s,
          })),
        };

        setConversations(prev =>
          prev.map(c =>
            c.id === convId
              ? {
                  ...c,
                  messages: [...c.messages, assistantMsg],
                  updatedAt: new Date(),
                }
              : c
          )
        );

        // Build query-specific graph from returned entities + graph_context
        if (
          (result.entities && result.entities.length > 0) ||
          (result.graph_context && result.graph_context.length > 0)
        ) {
          const queryGraph = buildQueryGraph(
            result.entities || [],
            result.graph_context || []
          );
          setQueryGraphData(queryGraph);

          if (result.entities && result.entities.length > 0) {
            setSelectedEntity(result.entities[0].name);
          }

          if (layoutMode === 'chat-only') {
            setLayoutMode('split-dual');
          }
        }
      } catch (err) {
        console.error('Query execution error', err);
        const errorMsg: Message = {
          id: `msg-${msgCounter++}`,
          role: 'assistant',
          content: `Unable to complete query. Please check that FalkorDB and the FastAPI backend are running, or adjust retrieval parameters in Settings.`,
          timestamp: new Date(),
        };

        setConversations(prev =>
          prev.map(c =>
            c.id === convId
              ? {
                  ...c,
                  messages: [...c.messages, errorMsg],
                  updatedAt: new Date(),
                }
              : c
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [activeId, options, layoutMode]
  );

  return (
    <div className="app-layout">
      {/* 1. Header with Tab Switcher, Workspace Selector & Health Status */}
      <Header
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        onSelectWorkspace={handleSelectWorkspace}
        onSeedGraph={handleSeedGraph}
        isSeeding={isSeeding}
        layoutMode={layoutMode}
        onLayoutChange={setLayoutMode}
        stats={graphStats}
        health={health}
        onRefreshHealth={syncBackendData}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDocuments={() => setIsDocModalOpen(true)}
      />

      <div className="app-body">
        {/* MODULE 1: GraphGenie Multi-Agent Flow (Main) */}
        {activeModule === 'agent' ? (
          <div className="agent-module-view">
            {/* Left Half: Agent Chat Area with Persona Selector & Reasoning Trail */}
            <div className="agent-chat-pane">
              <AgentChatArea
                messages={agentMessages}
                isLoading={isAgentLoading}
                onSendMessage={handleAgentSendMessage}
                onClearChat={() => setAgentMessages([])}
                onSelectNodeInGraph={setSelectedAgentNode}
              />
            </div>

            {/* Right Half: Agent Graph Viewer (Top) & Incident Blackboard (Bottom) */}
            <div className="agent-right-pane">
              <div className="agent-graph-section">
                <AgentGraphViewer
                  subgraph={agentSubgraph}
                  selectedNodeId={selectedAgentNode}
                  onSelectNode={setSelectedAgentNode}
                  title="Enterprise Microservices & Incident Topology"
                />
              </div>

              <div className="agent-blackboard-section">
                <IncidentBlackboard
                  tasks={agentTasks}
                  episodes={memoryEpisodes}
                  onRefreshTasks={handleRefreshTasks}
                  onRefreshEpisodes={handleRefreshEpisodes}
                  onResolveTask={handleResolveTask}
                  onCreateTask={handleCreateTask}
                />
              </div>
            </div>
          </div>
        ) : (
          /* MODULE 2: Preserved Document RAG Module */
          <>
            <Sidebar
              conversations={conversations}
              activeConversationId={activeId}
              documents={documents}
              stats={graphStats}
              onNewConversation={handleNewConversation}
              onSelectConversation={handleSelectConversation}
              onDeleteConversation={handleDeleteConversation}
              onOpenUploadModal={() => setIsDocModalOpen(true)}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />

            <main className={`workspace-panel layout-${layoutMode}`}>
              {(layoutMode === 'split-dual' || layoutMode === 'chat-only') && (
                <div className="chat-pane">
                  <ChatArea
                    messages={activeConversation?.messages || []}
                    isLoading={isLoading}
                    onSelectEntity={handleSelectEntity}
                    onOpenDocuments={() => setIsDocModalOpen(true)}
                  />
                  <ChatInput
                    onSendMessage={handleSendMessage}
                    disabled={isLoading}
                    options={options}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    onOpenDocuments={() => setIsDocModalOpen(true)}
                  />
                </div>
              )}

              {(layoutMode === 'split-dual' || layoutMode === 'graph-only') && (
                <div className="graph-pane">
                  <GraphVisualizer
                    data={graphData}
                    queryData={queryGraphData}
                    onSelectEntity={handleSelectEntity}
                    selectedEntityName={selectedEntity}
                    onLoadNeighborhood={handleLoadNeighborhood}
                    onOpenUpload={() => setIsDocModalOpen(true)}
                    falkorConnected={Boolean(health?.falkordb_connected)}
                  />
                </div>
              )}
            </main>
          </>
        )}
      </div>

      {/* Query & Graph Retrieval Settings Drawer (available across both modules) */}
      <QuerySettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        options={options}
        onChangeOptions={setOptions}
        configOptions={configOptions}
      />

      {/* Knowledge Base & Document Ingestion Modal */}
      <DocumentModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        onDocumentAdded={syncBackendData}
        onDocumentDeleted={syncBackendData}
        configOptions={configOptions}
      />
    </div>
  );
};

export default App;
