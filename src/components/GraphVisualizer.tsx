import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Play,
  Pause,
  Search,
  Filter,
  Share2,
  Database,
  Sparkles,
} from 'lucide-react';
import type { GraphVisualizationData, GraphNode, GraphEdge, EntityNeighborhood } from '../types';
import './GraphVisualizer.css';

type GraphViewMode = 'query' | 'full';

interface GraphVisualizerProps {
  data: GraphVisualizationData;
  queryData?: GraphVisualizationData | null;
  onSelectEntity?: (entityName: string) => void;
  selectedEntityName?: string | null;
  onLoadNeighborhood?: (entityName: string) => Promise<EntityNeighborhood>;
  onOpenUpload?: () => void;
  falkorConnected?: boolean;
}

const TYPE_COLORS: Record<string, { bg: string; border: string; glow: string; text: string }> = {
  Technology: { bg: '#3b82f6', border: '#60a5fa', glow: 'rgba(59, 130, 246, 0.4)', text: '#ffffff' },
  Concept: { bg: '#8b5cf6', border: '#a78bfa', glow: 'rgba(139, 92, 246, 0.4)', text: '#ffffff' },
  Organization: { bg: '#10b981', border: '#34d399', glow: 'rgba(16, 185, 129, 0.4)', text: '#ffffff' },
  Person: { bg: '#f59e0b', border: '#fbbf24', glow: 'rgba(245, 158, 11, 0.4)', text: '#ffffff' },
  Location: { bg: '#ec4899', border: '#f472b6', glow: 'rgba(236, 72, 153, 0.4)', text: '#ffffff' },
  Default: { bg: '#6366f1', border: '#818cf8', glow: 'rgba(99, 102, 241, 0.4)', text: '#ffffff' },
};

const GraphVisualizer: React.FC<GraphVisualizerProps> = ({
  data,
  queryData,
  onSelectEntity,
  selectedEntityName,
  onLoadNeighborhood,
  onOpenUpload,
  falkorConnected = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Viewport transformation
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Physics simulation
  const [isRunning, setIsRunning] = useState(true);
  const nodesRef = useRef<Array<GraphNode & { x: number; y: number; vx: number; vy: number; radius: number }>>([]);
  const edgesRef = useRef<GraphEdge[]>([]);

  // Dragging nodes
  const draggingNodeRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  // Filters & Search
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Active neighborhood slideout
  const [neighborhood, setNeighborhood] = useState<EntityNeighborhood | null>(null);

  // Fallback demo graph toggle if database is currently empty
  const [useDemoGraph, setUseDemoGraph] = useState(false);

  // Graph view mode: 'query' shows RAG-response subgraph, 'full' shows complete KB
  const [graphMode, setGraphMode] = useState<GraphViewMode>('query');

  // Auto-switch to query mode when new queryData arrives
  useEffect(() => {
    if (queryData && queryData.nodes.length > 0) {
      setGraphMode('query');
    }
  }, [queryData]);

  // Determine active dataset based on mode
  const activeData = useMemo(() => {
    // Query mode: show the RAG response subgraph
    if (graphMode === 'query' && queryData && queryData.nodes.length > 0) {
      return queryData;
    }

    // Full mode: show the full knowledge graph from DB
    if (data.nodes.length > 0 && !useDemoGraph) {
      return data;
    }

    // Fallback: demo data only if user explicitly requests it
    if (useDemoGraph) {
      return {
        nodes: [
          { id: 'e_falkordb', label: 'FalkorDB', type: 'Technology', mention_count: 32, group: 'Technology', description: 'Low-latency Redis graph database with native vector indexing.' },
          { id: 'e_vecf32', label: 'vecf32 Index', type: 'Technology', mention_count: 22, group: 'Technology', description: 'Cosine vector index for fast semantic similarity matching.' },
          { id: 'e_graphrag', label: 'GraphRAG', type: 'Concept', mention_count: 45, group: 'Concept', description: 'Hybrid graph traversal + vector augmented generation pipeline.' },
          { id: 'e_nemotron', label: 'Nemotron LLM', type: 'Technology', mention_count: 18, group: 'Technology', description: 'NVIDIA instruction-tuned language model.' },
          { id: 'e_opencypher', label: 'OpenCypher', type: 'Technology', mention_count: 15, group: 'Technology', description: 'Declarative query language for relationship pattern matching.' },
          { id: 'e_hybrid_search', label: 'Hybrid Search', type: 'Concept', mention_count: 28, group: 'Concept', description: 'Simultaneous vector similarity search and multi-hop graph traversal.' },
          { id: 'e_multi_hop', label: 'Multi-Hop', type: 'Concept', mention_count: 25, group: 'Concept', description: '1-to-3 degree relationship discovery.' },
          { id: 'e_entity_ext', label: 'Entity Extraction', type: 'Concept', mention_count: 24, group: 'Concept', description: 'LLM chunk parsing into nodes and relations.' },
          { id: 'e_redis', label: 'Redis Core', type: 'Technology', mention_count: 20, group: 'Technology', description: 'High-speed in-memory database engine.' },
          { id: 'e_enterprise_kb', label: 'Enterprise KB', type: 'Organization', mention_count: 16, group: 'Organization', description: 'Centralized document repository.' },
          { id: 'e_citations', label: 'Citations', type: 'Concept', mention_count: 14, group: 'Concept', description: 'Direct provenance links to document chunks.' },
        ],
        edges: [
          { source: 'e_falkordb', relation: 'STORES', target: 'e_graphrag' },
          { source: 'e_falkordb', relation: 'BUILT_ON', target: 'e_redis' },
          { source: 'e_falkordb', relation: 'SUPPORTS', target: 'e_vecf32' },
          { source: 'e_falkordb', relation: 'EXECUTES', target: 'e_opencypher' },
          { source: 'e_graphrag', relation: 'LEVERAGES', target: 'e_hybrid_search' },
          { source: 'e_hybrid_search', relation: 'COMBINES', target: 'e_vecf32' },
          { source: 'e_hybrid_search', relation: 'PERFORMS', target: 'e_multi_hop' },
          { source: 'e_graphrag', relation: 'USES_LLM', target: 'e_nemotron' },
          { source: 'e_entity_ext', relation: 'POPULATES', target: 'e_falkordb' },
          { source: 'e_enterprise_kb', relation: 'INGESTED_INTO', target: 'e_graphrag' },
          { source: 'e_graphrag', relation: 'GUARANTEES', target: 'e_citations' },
        ],
        node_count: 11,
        edge_count: 11,
      };
    }

    // Empty state
    return { nodes: [], edges: [], node_count: 0, edge_count: 0 };
  }, [data, queryData, useDemoGraph, graphMode]);

  // Extract all available entity types
  const allTypes = useMemo(() => {
    const set = new Set<string>();
    activeData.nodes.forEach(n => set.add(n.type));
    return Array.from(set);
  }, [activeData]);

  // Initialize node physics layout
  useEffect(() => {
    const width = containerRef.current?.clientWidth || 700;
    const height = containerRef.current?.clientHeight || 500;
    const centerX = width / 2;
    const centerY = height / 2;

    const angleStep = (2 * Math.PI) / (activeData.nodes.length || 1);

    nodesRef.current = activeData.nodes.map((node, i) => {
      const radius = Math.max(16, Math.min(32, 14 + (node.mention_count || 10) * 0.45));
      const dist = 120 + (i % 3) * 60;
      const angle = i * angleStep;

      return {
        ...node,
        x: centerX + Math.cos(angle) * dist + (Math.random() - 0.5) * 40,
        y: centerY + Math.sin(angle) * dist + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0,
        radius,
      };
    });

    edgesRef.current = activeData.edges;
  }, [activeData]);

  // Handle external selected entity change
  useEffect(() => {
    if (!selectedEntityName) return;
    const target = nodesRef.current.find(
      n => n.label.toLowerCase() === selectedEntityName.toLowerCase() || n.id.toLowerCase() === selectedEntityName.toLowerCase()
    );
    if (target && containerRef.current) {
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      setZoom(1.3);
      setPan({
        x: width / 2 - target.x * 1.3,
        y: height / 2 - target.y * 1.3,
      });
      handleInspectNode(target.label);
    }
  }, [selectedEntityName]);

  // Main Render Loop
  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Background grid
      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      const startX = -pan.x / zoom - 200;
      const endX = (width - pan.x) / zoom + 200;
      const startY = -pan.y / zoom - 200;
      const endY = (height - pan.y) / zoom + 200;

      for (let x = Math.floor(startX / gridSize) * gridSize; x < endX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
      }
      for (let y = Math.floor(startY / gridSize) * gridSize; y < endY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
      }
      ctx.restore();

      // Physics update step
      if (isRunning) {
        const nodes = nodesRef.current;
        const edges = edgesRef.current;
        const k = 0.03;
        const rep = 800;

        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[j].x - nodes[i].x;
            const dy = nodes[j].y - nodes[i].y;
            const dist = Math.hypot(dx, dy) || 1;
            if (dist < 260) {
              const force = rep / (dist * dist);
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;
              nodes[i].vx -= fx;
              nodes[i].vy -= fy;
              nodes[j].vx += fx;
              nodes[j].vy += fy;
            }
          }
        }

        edges.forEach(edge => {
          const s = nodes.find(n => n.id === edge.source || n.label === edge.source);
          const t = nodes.find(n => n.id === edge.target || n.label === edge.target);
          if (s && t) {
            const dx = t.x - s.x;
            const dy = t.y - s.y;
            const dist = Math.hypot(dx, dy) || 1;
            const targetDist = 130;
            const force = (dist - targetDist) * k;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            s.vx += fx;
            s.vy += fy;
            t.vx -= fx;
            t.vy -= fy;
          }
        });

        const centerX = width / 2;
        const centerY = height / 2;
        nodes.forEach(node => {
          if (draggingNodeRef.current?.id === node.id) return;
          node.vx += (centerX - node.x) * 0.0008;
          node.vy += (centerY - node.y) * 0.0008;

          node.vx *= 0.88;
          node.vy *= 0.88;

          node.x += node.vx;
          node.y += node.vy;
        });
      }

      // Draw Graph Content
      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      const nodes = nodesRef.current;
      const edges = edgesRef.current;

      // Draw Edges
      edges.forEach(edge => {
        const s = nodes.find(n => n.id === edge.source || n.label === edge.source);
        const t = nodes.find(n => n.id === edge.target || n.label === edge.target);
        if (!s || !t) return;

        if (selectedTypes.size > 0 && (!selectedTypes.has(s.type) || !selectedTypes.has(t.type))) {
          return;
        }

        const isHighlighted =
          s.id === hoveredNode ||
          t.id === hoveredNode ||
          s.label.toLowerCase() === selectedEntityName?.toLowerCase() ||
          t.label.toLowerCase() === selectedEntityName?.toLowerCase();

        ctx.strokeStyle = isHighlighted ? '#a5b4fc' : 'rgba(100, 116, 139, 0.35)';
        ctx.lineWidth = isHighlighted ? 2.2 : 1.2;

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.stroke();

        if (edge.relation && (zoom > 0.85 || isHighlighted)) {
          const midX = (s.x + t.x) / 2;
          const midY = (s.y + t.y) / 2;

          ctx.font = '9px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const text = edge.relation;
          const metrics = ctx.measureText(text);
          ctx.fillStyle = 'rgba(15, 17, 23, 0.85)';
          ctx.fillRect(midX - metrics.width / 2 - 3, midY - 6, metrics.width + 6, 12);

          ctx.fillStyle = isHighlighted ? '#c7d2fe' : '#94a3b8';
          ctx.fillText(text, midX, midY);
        }
      });

      // Draw Nodes
      nodes.forEach(node => {
        if (selectedTypes.size > 0 && !selectedTypes.has(node.type)) {
          return;
        }

        const isHovered = hoveredNode === node.id;
        const isSelected = selectedEntityName?.toLowerCase() === node.label.toLowerCase();
        const matchesSearch = searchQuery && node.label.toLowerCase().includes(searchQuery.toLowerCase());

        const colors = TYPE_COLORS[node.type] || TYPE_COLORS.Default;

        if (isHovered || isSelected || matchesSearch) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 8, 0, Math.PI * 2);
          ctx.fillStyle = colors.glow;
          ctx.fill();
          ctx.restore();
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = colors.bg;
        ctx.fill();

        ctx.strokeStyle = isSelected ? '#ffffff' : colors.border;
        ctx.lineWidth = isSelected ? 3 : 1.5;
        ctx.stroke();

        ctx.font = `${node.radius > 20 ? 11 : 10}px Inter, sans-serif`;
        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const labelY = node.y + node.radius + 4;
        ctx.fillText(node.label, node.x, labelY);
      });

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [pan, zoom, isRunning, selectedTypes, hoveredNode, selectedEntityName, searchQuery]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseY = (e.clientY - rect.top - pan.y) / zoom;

    const clickedNode = nodesRef.current.find(node => {
      const dist = Math.hypot(node.x - mouseX, node.y - mouseY);
      return dist <= node.radius;
    });

    if (clickedNode) {
      draggingNodeRef.current = {
        id: clickedNode.id,
        offsetX: mouseX - clickedNode.x,
        offsetY: mouseY - clickedNode.y,
      };
      handleInspectNode(clickedNode.label);
    } else {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseY = (e.clientY - rect.top - pan.y) / zoom;

    if (draggingNodeRef.current) {
      const node = nodesRef.current.find(n => n.id === draggingNodeRef.current?.id);
      if (node) {
        node.x = mouseX - draggingNodeRef.current.offsetX;
        node.y = mouseY - draggingNodeRef.current.offsetY;
        node.vx = 0;
        node.vy = 0;
      }
    } else if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
    } else {
      const node = nodesRef.current.find(n => {
        const dist = Math.hypot(n.x - mouseX, n.y - mouseY);
        return dist <= n.radius;
      });
      setHoveredNode(node ? node.id : null);
    }
  };

  const handleMouseUp = () => {
    draggingNodeRef.current = null;
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom(z => Math.max(0.3, Math.min(3, z * factor)));
  };

  const handleInspectNode = async (entityName: string) => {
    onSelectEntity?.(entityName);
    if (onLoadNeighborhood) {
      try {
        const res = await onLoadNeighborhood(entityName);
        setNeighborhood(res);
      } catch (err) {
        console.error('Failed to load neighborhood', err);
      }
    }
  };

  const handleFitToScreen = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const toggleTypeFilter = (type: string) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const isEmpty = activeData.nodes.length === 0 && !useDemoGraph;

  const hasQueryData = queryData && queryData.nodes.length > 0;
  const hasFullData = data.nodes.length > 0;

  return (
    <div className="graph-visualizer-container" ref={containerRef}>
      {/* Top Search & Filter Toolbar */}
      <div className="graph-top-bar">
        {/* Graph Mode Toggle */}
        {(hasQueryData || hasFullData) && (
          <div className="graph-mode-toggle">
            <button
              className={`mode-btn ${graphMode === 'query' ? 'active' : ''}`}
              onClick={() => setGraphMode('query')}
              disabled={!hasQueryData}
              title={hasQueryData ? 'Show entities & relations from latest query' : 'No query results yet'}
            >
              <Sparkles size={12} />
              Query Graph
              {hasQueryData && <span className="mode-count">{queryData!.node_count}</span>}
            </button>
            <button
              className={`mode-btn ${graphMode === 'full' ? 'active' : ''}`}
              onClick={() => setGraphMode('full')}
              disabled={!hasFullData}
              title="Show complete knowledge graph from FalkorDB"
            >
              <Database size={12} />
              Full Graph
              {hasFullData && <span className="mode-count">{data.node_count}</span>}
            </button>
          </div>
        )}
        <div className="graph-search-box">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Search entity node..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="graph-search-input"
          />
        </div>

        {/* Entity Type Filter Chips */}
        <div className="type-filters">
          <Filter size={13} className="filter-icon" />
          {allTypes.map(type => {
            const isSelected = selectedTypes.size === 0 || selectedTypes.has(type);
            const colors = TYPE_COLORS[type] || TYPE_COLORS.Default;
            return (
              <button
                key={type}
                className={`type-chip ${isSelected ? 'active' : ''}`}
                style={{
                  borderColor: isSelected ? colors.border : 'transparent',
                  background: isSelected ? `${colors.bg}22` : 'var(--bg-secondary)',
                  color: isSelected ? colors.text : 'var(--text-secondary)',
                }}
                onClick={() => toggleTypeFilter(type)}
              >
                <span className="type-chip-dot" style={{ background: colors.bg }} />
                {type}
              </button>
            );
          })}
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="graph-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Empty State Overlay */}
      {isEmpty && (
        <div className="graph-empty-overlay">
          <div className="empty-content-box">
            <Share2 size={36} className="empty-graph-icon" />
            <h3>Knowledge Graph Empty</h3>
            <p>
              {falkorConnected
                ? 'Your FalkorDB database is connected! Ingest documents to automatically extract entities and relationships.'
                : 'Upload documents to build your FalkorDB knowledge graph, or preview the interactive demo schema.'}
            </p>
            <div className="empty-actions">
              <button className="preview-demo-btn" onClick={() => setUseDemoGraph(true)}>
                <Sparkles size={14} />
                Preview Graph Schema
              </button>
              {onOpenUpload && (
                <button className="upload-graph-btn" onClick={onOpenUpload}>
                  <Database size={14} />
                  Ingest Documents
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom-Right Toolbar */}
      <div className="graph-controls-toolbar">
        <button
          className="control-btn"
          onClick={() => setZoom(z => Math.min(3, z * 1.2))}
          title="Zoom In"
        >
          <ZoomIn size={15} />
        </button>
        <button
          className="control-btn"
          onClick={() => setZoom(z => Math.max(0.3, z / 1.2))}
          title="Zoom Out"
        >
          <ZoomOut size={15} />
        </button>
        <button className="control-btn" onClick={handleFitToScreen} title="Center & Reset View">
          <Maximize2 size={15} />
        </button>
        <div className="control-divider" />
        <button
          className={`control-btn ${isRunning ? 'active' : ''}`}
          onClick={() => setIsRunning(r => !r)}
          title={isRunning ? 'Pause Physics' : 'Resume Physics'}
        >
          {isRunning ? <Pause size={15} /> : <Play size={15} />}
        </button>
      </div>

      {/* Floating Node Neighborhood Slide-out Drawer */}
      {neighborhood && (
        <div className="neighborhood-card">
          <div className="neighborhood-header">
            <div>
              <div className="neighborhood-type-tag">{neighborhood.type}</div>
              <h4 className="neighborhood-title">{neighborhood.name}</h4>
            </div>
            <button className="close-card-btn" onClick={() => setNeighborhood(null)}>
              &times;
            </button>
          </div>

          <p className="neighborhood-desc">
            {neighborhood.description || 'Entity node stored in FalkorDB knowledge graph.'}
          </p>

          <div className="neighborhood-meta">
            <span>Mentioned {neighborhood.mention_count} times</span>
            <span>{neighborhood.edges.length} connected relations</span>
          </div>

          <div className="neighborhood-edges-list">
            <div className="edges-header">Connected Triples:</div>
            {neighborhood.edges.map((e, idx) => (
              <div key={idx} className="edge-item">
                <span className="edge-source">{e.source}</span>
                <span className="edge-relation">──[{e.relation}]──&gt;</span>
                <span className="edge-target">{e.target}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mode badge */}
      {useDemoGraph && (
        <div className="demo-mode-badge" onClick={() => setUseDemoGraph(false)}>
          <span>Schema Preview Mode</span>
          <button className="exit-demo-btn">Switch to Live</button>
        </div>
      )}

      {/* Query graph info badge */}
      {graphMode === 'query' && hasQueryData && (
        <div className="query-graph-badge">
          <Sparkles size={12} />
          <span>Showing {queryData!.node_count} entities & {queryData!.edge_count} relations from latest query</span>
        </div>
      )}
    </div>
  );
};

export default GraphVisualizer;
