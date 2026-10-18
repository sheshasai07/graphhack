import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Search,
  RotateCcw,
  X,
  Share2,
  Compass,
  Crosshair,
  Sparkles,
  Layers,
  Info,
} from 'lucide-react';
import type {
  AgentSubgraph,
  AgentSubgraphNode,
  AgentSubgraphEdge,
  GraphVisualizationData,
} from '../../types';
import './AgentGraphViewer.css';

interface AgentGraphViewerProps {
  subgraph: AgentSubgraph;
  fullGraphData?: GraphVisualizationData | null;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string | null) => void;
  title?: string;
}

// Enterprise Node Category Palette matching modern RAG standards
const NODE_COLORS: Record<string, { fill: string; stroke: string; glow: string; text: string; bg: string }> = {
  Service: { fill: '#3b82f6', stroke: '#60a5fa', glow: 'rgba(59, 130, 246, 0.4)', text: '#93c5fd', bg: 'rgba(59, 130, 246, 0.15)' },
  Feature: { fill: '#10b981', stroke: '#34d399', glow: 'rgba(16, 185, 129, 0.4)', text: '#6ee7b7', bg: 'rgba(16, 185, 129, 0.15)' },
  Person: { fill: '#f59e0b', stroke: '#fbbf24', glow: 'rgba(245, 158, 11, 0.4)', text: '#fde68a', bg: 'rgba(245, 158, 11, 0.15)' },
  MemoryEpisode: { fill: '#a855f7', stroke: '#c084fc', glow: 'rgba(168, 85, 247, 0.4)', text: '#e9d5ff', bg: 'rgba(168, 85, 247, 0.15)' },
  Policy: { fill: '#f43f5e', stroke: '#fb7185', glow: 'rgba(244, 63, 94, 0.4)', text: '#fecdd3', bg: 'rgba(244, 63, 94, 0.15)' },
  Task: { fill: '#fb923c', stroke: '#fdba74', glow: 'rgba(251, 146, 60, 0.4)', text: '#fed7aa', bg: 'rgba(251, 146, 60, 0.15)' },
  Document: { fill: '#6366f1', stroke: '#818cf8', glow: 'rgba(99, 102, 241, 0.4)', text: '#c7d2fe', bg: 'rgba(99, 102, 241, 0.15)' },
  Technology: { fill: '#06b6d4', stroke: '#22d3ee', glow: 'rgba(6, 182, 212, 0.4)', text: '#a5f3fc', bg: 'rgba(6, 182, 212, 0.15)' },
  Concept: { fill: '#8b5cf6', stroke: '#a78bfa', glow: 'rgba(139, 92, 246, 0.4)', text: '#ddd6fe', bg: 'rgba(139, 92, 246, 0.15)' },
  Default: { fill: '#64748b', stroke: '#94a3b8', glow: 'rgba(100, 116, 139, 0.4)', text: '#cbd5e1', bg: 'rgba(100, 116, 139, 0.15)' },
};

type ViewMode = 'incident' | 'full';

export const AgentGraphViewer: React.FC<AgentGraphViewerProps> = ({
  subgraph,
  fullGraphData,
  selectedNodeId,
  onSelectNode,
  title = 'Knowledge Graph & Incident Topology',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // View Mode: 'incident' (Focused query subgraph) vs 'full' (Complete database graph)
  const [viewMode, setViewMode] = useState<ViewMode>('incident');

  // Full Screen State
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Active nodes & edges in simulation
  const [nodes, setNodes] = useState<AgentSubgraphNode[]>([]);
  const [edges, setEdges] = useState<AgentSubgraphEdge[]>([]);

  // Filtering & Search
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [inspectNode, setInspectNode] = useState<AgentSubgraphNode | null>(null);

  // Transform and scale
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  const isDraggingRef = useRef(false);
  const dragNodeRef = useRef<AgentSubgraphNode | null>(null);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  // Auto-switch to 'incident' mode when a new incident subgraph arrives with nodes
  useEffect(() => {
    if (subgraph && subgraph.nodes && subgraph.nodes.length > 0) {
      setViewMode('incident');
    }
  }, [subgraph]);

  // Handle Fullscreen Keydown (Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

  // Determine active raw data based on viewMode
  const activeRawData = useMemo(() => {
    if (viewMode === 'incident') {
      return subgraph || { nodes: [], edges: [] };
    }
    // Full view mode: map fullGraphData to AgentSubgraph structure
    if (fullGraphData && fullGraphData.nodes.length > 0) {
      return {
        nodes: fullGraphData.nodes.map(n => ({
          id: n.id,
          label: n.label,
          type: n.type || 'Entity',
          properties: n.description ? { description: n.description } : undefined,
        })),
        edges: fullGraphData.edges.map(e => ({
          source: e.source,
          target: e.target,
          relation: e.relation || 'RELATES_TO',
          weight: e.weight || 1.0,
        })),
        node_count: fullGraphData.node_count,
        edge_count: fullGraphData.edge_count,
      };
    }
    return subgraph || { nodes: [], edges: [] };
  }, [viewMode, subgraph, fullGraphData]);

  // Initialize nodes with organic radial & collision-resistant placement
  useEffect(() => {
    if (!activeRawData || !activeRawData.nodes || activeRawData.nodes.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const canvas = canvasRef.current;
    const width = canvas?.clientWidth || 700;
    const height = canvas?.clientHeight || 400;
    const count = activeRawData.nodes.length;

    // Distribute with golden ratio spiral for pleasant non-clumpy initial layout
    const initializedNodes: AgentSubgraphNode[] = activeRawData.nodes.map((n, i) => {
      const radiusBase = count <= 8 ? 120 : Math.min(width, height) * 0.35;
      const angle = i * 2.39996; // Golden ratio spiral angle
      const dist = Math.sqrt((i + 1) / count) * radiusBase + 30;

      return {
        ...n,
        x: width / 2 + Math.cos(angle) * dist + (Math.random() - 0.5) * 20,
        y: height / 2 + Math.sin(angle) * dist + (Math.random() - 0.5) * 20,
        vx: 0,
        vy: 0,
      };
    });

    setNodes(initializedNodes);
    setEdges(activeRawData.edges || []);
    transformRef.current = { x: 0, y: 0, k: 1 };
  }, [activeRawData]);

  // Selected node sync
  useEffect(() => {
    if (selectedNodeId) {
      const match = nodes.find(n => n.id === selectedNodeId || n.label.toLowerCase() === selectedNodeId.toLowerCase());
      if (match) setInspectNode(match);
    }
  }, [selectedNodeId, nodes]);

  // Search matches computed
  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return nodes.filter(n => n.label.toLowerCase().includes(q) || n.type.toLowerCase().includes(q));
  }, [nodes, searchQuery]);

  // Center on a specific node
  const centerOnNode = useCallback((target: AgentSubgraphNode) => {
    const canvas = canvasRef.current;
    if (!canvas || target.x == null || target.y == null) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const targetZoom = 1.35;
    transformRef.current = {
      x: width / 2 - target.x * targetZoom,
      y: height / 2 - target.y * targetZoom,
      k: targetZoom,
    };
  }, []);

  // Handle Search Submission (Enter or click)
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchMatches.length > 0) {
      const target = searchMatches[0];
      centerOnNode(target);
      setInspectNode(target);
      onSelectNode?.(target.id);
    }
  };

  // Toggle Full Screen
  const handleToggleFullScreen = () => {
    setIsFullScreen(prev => !prev);
  };

  // Physics Simulation Loop (Non-clumsy spring-damper with strict collision avoidance)
  useEffect(() => {
    let animId: number;

    const tick = () => {
      if (!isPaused && nodes.length > 0) {
        const canvas = canvasRef.current;
        const width = canvas?.clientWidth || 700;
        const height = canvas?.clientHeight || 400;

        const kRepulse = nodes.length > 20 ? 3200 : 2200;
        const kAttract = 0.035;
        const centerGravity = 0.008;

        // 1. Repulsion & Collision Avoidance
        for (let i = 0; i < nodes.length; i++) {
          const n1 = nodes[i];
          if (n1 === dragNodeRef.current) continue;

          for (let j = i + 1; j < nodes.length; j++) {
            const n2 = nodes[j];
            const dx = (n1.x || 0) - (n2.x || 0);
            const dy = (n1.y || 0) - (n2.y || 0);
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;

            // Strict collision buffer to prevent overlapping clumps
            const minBuffer = 75;
            if (dist < minBuffer) {
              const push = (minBuffer - dist) * 0.12;
              const px = (dx / dist) * push;
              const py = (dy / dist) * push;
              n1.vx = (n1.vx || 0) + px;
              n1.vy = (n1.vy || 0) + py;
              n2.vx = (n2.vx || 0) - px;
              n2.vy = (n2.vy || 0) - py;
            } else if (dist < 320) {
              const force = kRepulse / (dist * dist);
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;
              n1.vx = (n1.vx || 0) + fx;
              n1.vy = (n1.vy || 0) + fy;
              n2.vx = (n2.vx || 0) - fx;
              n2.vy = (n2.vy || 0) - fy;
            }
          }

          // Gentle center gravity
          n1.vx = (n1.vx || 0) + (width / 2 - (n1.x || 0)) * centerGravity;
          n1.vy = (n1.vy || 0) + (height / 2 - (n1.y || 0)) * centerGravity;
        }

        // 2. Spring Attraction along Edges
        edges.forEach(e => {
          const src = nodes.find(n => n.id === e.source || n.label === e.source);
          const tgt = nodes.find(n => n.id === e.target || n.label === e.target);
          if (src && tgt) {
            const dx = (tgt.x || 0) - (src.x || 0);
            const dy = (tgt.y || 0) - (src.y || 0);
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const desiredDist = 140;
            const force = (dist - desiredDist) * kAttract;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            if (src !== dragNodeRef.current) {
              src.vx = (src.vx || 0) + fx;
              src.vy = (src.vy || 0) + fy;
            }
            if (tgt !== dragNodeRef.current) {
              tgt.vx = (tgt.vx || 0) - fx;
              tgt.vy = (tgt.vy || 0) - fy;
            }
          }
        });

        // 3. Velocity damping
        nodes.forEach(n => {
          if (n !== dragNodeRef.current) {
            n.x = (n.x || 0) + (n.vx || 0);
            n.y = (n.y || 0) + (n.vy || 0);
            n.vx = (n.vx || 0) * 0.86;
            n.vy = (n.vy || 0) * 0.86;
          }
        });
      }

      draw();
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [nodes, edges, isPaused, activeFilter, searchQuery, inspectNode]);

  // Main Canvas Rendering function with High-Contrast Typography & Glow
  const draw = useCallback(() => {
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

    // Grid pattern background
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;
    const gridSize = 36;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();

    // Pan & Zoom Transform
    const { x: panX, y: panY, k: zoom } = transformRef.current;
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    const hasSearch = searchQuery.trim().length > 0;
    const searchMatchSet = new Set(searchMatches.map(m => m.id));

    // Draw Edges
    edges.forEach(e => {
      const src = nodes.find(n => n.id === e.source || n.label === e.source);
      const tgt = nodes.find(n => n.id === e.target || n.label === e.target);
      if (!src || !tgt) return;

      const isConnectedToInspect =
        inspectNode && (src.id === inspectNode.id || tgt.id === inspectNode.id);
      const isConnectedToSearch =
        hasSearch && (searchMatchSet.has(src.id) || searchMatchSet.has(tgt.id));

      ctx.save();

      // Dim non-matching edges when search is active
      if (hasSearch && !isConnectedToSearch) {
        ctx.globalAlpha = 0.08;
      }

      ctx.beginPath();
      ctx.moveTo(src.x || 0, src.y || 0);
      ctx.lineTo(tgt.x || 0, tgt.y || 0);

      if (isConnectedToInspect || isConnectedToSearch) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.2;
        ctx.shadowColor = 'rgba(56, 189, 248, 0.6)';
        ctx.shadowBlur = 8;
      } else {
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
        ctx.lineWidth = 1.3;
      }
      ctx.stroke();

      // Directional arrow
      const midX = ((src.x || 0) + (tgt.x || 0)) / 2;
      const midY = ((src.y || 0) + (tgt.y || 0)) / 2;
      const angle = Math.atan2((tgt.y || 0) - (src.y || 0), (tgt.x || 0) - (src.x || 0));

      ctx.save();
      ctx.translate(midX, midY);
      ctx.rotate(angle);
      ctx.fillStyle = isConnectedToInspect || isConnectedToSearch ? '#38bdf8' : 'rgba(148, 163, 184, 0.65)';
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(-4, -3.5);
      ctx.lineTo(-4, 3.5);
      ctx.closePath();
      ctx.fill();

      // Relation Label Badge with background pill (no clashing text)
      if ((zoom >= 0.75 || isConnectedToInspect || isConnectedToSearch) && e.relation) {
        ctx.font = '500 9.5px Inter, sans-serif';
        const relText = e.relation;
        const textMetrics = ctx.measureText(relText);
        const pillWidth = textMetrics.width + 10;
        const pillHeight = 15;

        // Background pill
        ctx.fillStyle = isConnectedToInspect ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = isConnectedToInspect ? '#38bdf8' : 'rgba(148, 163, 184, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(-pillWidth / 2, -pillHeight / 2 - 8, pillWidth, pillHeight, 4);
        ctx.fill();
        ctx.stroke();

        // Text
        ctx.fillStyle = isConnectedToInspect ? '#38bdf8' : '#94a3b8';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(relText, 0, -8);
      }
      ctx.restore();

      ctx.restore();
    });

    // Draw Nodes
    nodes.forEach(n => {
      const typePalette = NODE_COLORS[n.type] || NODE_COLORS.Default;
      const isSelected = inspectNode?.id === n.id;
      const isSearchMatch = hasSearch && searchMatchSet.has(n.id);
      const isFilterDimmed = activeFilter !== 'ALL' && n.type !== activeFilter;

      const radius = isSelected ? 22 : 18;

      ctx.save();
      ctx.translate(n.x || 0, n.y || 0);

      // Search dimming
      if (hasSearch && !isSearchMatch) {
        ctx.globalAlpha = 0.15;
      } else if (isFilterDimmed && !isSelected) {
        ctx.globalAlpha = 0.2;
      }

      // Outer glow for selected or search match
      if (isSelected || isSearchMatch) {
        ctx.beginPath();
        ctx.arc(0, 0, radius + 9, 0, 2 * Math.PI);
        ctx.fillStyle = isSearchMatch ? 'rgba(56, 189, 248, 0.4)' : typePalette.glow;
        ctx.fill();
      }

      // Main Node Circle
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, 2 * Math.PI);
      ctx.fillStyle = isSelected ? '#ffffff' : typePalette.fill;
      ctx.fill();

      ctx.lineWidth = isSelected || isSearchMatch ? 3 : 2;
      ctx.strokeStyle = isSelected ? typePalette.stroke : (isSearchMatch ? '#38bdf8' : 'rgba(255, 255, 255, 0.35)');
      ctx.stroke();

      // Node Label Badge (High-contrast background pill)
      ctx.font = isSelected ? '600 11px Inter, sans-serif' : '500 10.5px Inter, sans-serif';
      const labelMetrics = ctx.measureText(n.label);
      const badgeW = labelMetrics.width + 12;
      const badgeH = 17;

      ctx.fillStyle = 'rgba(10, 15, 29, 0.85)';
      ctx.strokeStyle = isSelected ? typePalette.stroke : (isSearchMatch ? '#38bdf8' : 'rgba(148, 163, 184, 0.25)');
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-badgeW / 2, radius + 5, badgeW, badgeH, 4);
      ctx.fill();
      ctx.stroke();

      // Label Text
      ctx.fillStyle = isSelected ? '#ffffff' : '#f8fafc';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(n.label, 0, radius + 13.5);

      // Subtitle Type Tag
      if (zoom >= 0.8) {
        ctx.font = '600 8.5px Inter, sans-serif';
        ctx.fillStyle = typePalette.text;
        ctx.fillText(n.type, 0, radius + 29);
      }

      ctx.restore();
    });

    ctx.restore();
    ctx.restore();
  }, [nodes, edges, inspectNode, searchQuery, activeFilter, searchMatches]);

  // Mouse interaction handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const { x: panX, y: panY, k: zoom } = transformRef.current;
    const graphX = (mouseX - panX) / zoom;
    const graphY = (mouseY - panY) / zoom;

    const hitNode = nodes.find(n => {
      const dx = (n.x || 0) - graphX;
      const dy = (n.y || 0) - graphY;
      return Math.sqrt(dx * dx + dy * dy) <= 24;
    });

    if (hitNode) {
      dragNodeRef.current = hitNode;
      setInspectNode(hitNode);
      onSelectNode?.(hitNode.id);
    } else {
      isDraggingRef.current = true;
    }

    lastMouseRef.current = { x: mouseX, y: mouseY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const dx = mouseX - lastMouseRef.current.x;
    const dy = mouseY - lastMouseRef.current.y;

    if (dragNodeRef.current) {
      const { k: zoom } = transformRef.current;
      dragNodeRef.current.x = (dragNodeRef.current.x || 0) + dx / zoom;
      dragNodeRef.current.y = (dragNodeRef.current.y || 0) + dy / zoom;
      dragNodeRef.current.vx = 0;
      dragNodeRef.current.vy = 0;
    } else if (isDraggingRef.current) {
      transformRef.current.x += dx;
      transformRef.current.y += dy;
    }

    lastMouseRef.current = { x: mouseX, y: mouseY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    dragNodeRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.88;
    const newK = Math.max(0.3, Math.min(3.5, transformRef.current.k * zoomFactor));

    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      transformRef.current.x = mouseX - (mouseX - transformRef.current.x) * (newK / transformRef.current.k);
      transformRef.current.y = mouseY - (mouseY - transformRef.current.y) * (newK / transformRef.current.k);
      transformRef.current.k = newK;
    }
  };

  // Zoom controls
  const handleZoom = (direction: 'in' | 'out' | 'reset') => {
    if (direction === 'in') {
      transformRef.current.k = Math.min(3.5, transformRef.current.k * 1.25);
    } else if (direction === 'out') {
      transformRef.current.k = Math.max(0.3, transformRef.current.k / 1.25);
    } else {
      transformRef.current = { x: 0, y: 0, k: 1 };
    }
  };

  return (
    <div
      ref={containerRef}
      className={`agent-graph-viewer-container ${isFullScreen ? 'is-fullscreen' : ''}`}
    >
      {/* Top Overlay Toolbar */}
      <div className="agent-graph-toolbar">
        <div className="graph-toolbar-left">
          <div className="graph-title-pill">
            <Share2 size={13} className="title-icon" />
            <span className="title-text">{title}</span>
            <span className="node-count-tag">
              {nodes.length} nodes • {edges.length} edges
            </span>
          </div>

          {/* Mode Switcher: Incident Subgraph vs Full Graph */}
          <div className="graph-mode-toggle">
            <button
              type="button"
              className={`mode-toggle-btn ${viewMode === 'incident' ? 'active' : ''}`}
              onClick={() => setViewMode('incident')}
              title="Focus on Incident / Query Subgraph only"
            >
              <Compass size={12} />
              <span>Incident Focus</span>
            </button>
            <button
              type="button"
              className={`mode-toggle-btn ${viewMode === 'full' ? 'active' : ''}`}
              onClick={() => setViewMode('full')}
              title="View Complete Knowledge Graph from FalkorDB"
            >
              <Layers size={12} />
              <span>Full Graph</span>
            </button>
          </div>

          {/* Interactive Search Input */}
          <form className="graph-search-box" onSubmit={handleSearchSubmit}>
            <Search size={12} className="search-icon" />
            <input
              type="text"
              placeholder="Search entity & press Enter..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <>
                <span className="search-badge-count">{searchMatches.length}</span>
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={() => setSearchQuery('')}
                  title="Clear Search"
                >
                  <X size={11} />
                </button>
              </>
            )}
          </form>
        </div>

        {/* Filter Chips */}
        <div className="graph-filter-chips">
          {['ALL', 'Service', 'Feature', 'Person', 'MemoryEpisode', 'Policy', 'Task'].map(cat => (
            <button
              key={cat}
              type="button"
              className={`filter-chip ${activeFilter === cat ? 'active' : ''}`}
              onClick={() => setActiveFilter(cat)}
            >
              {cat === 'ALL' ? 'All' : cat}
            </button>
          ))}
        </div>

        {/* Zoom, Fullscreen & Action Controls */}
        <div className="graph-controls-group">
          <button
            type="button"
            className="ctrl-btn"
            onClick={() => setIsPaused(p => !p)}
            title={isPaused ? 'Resume Physics' : 'Pause Physics'}
          >
            {isPaused ? <Play size={13} /> : <Pause size={13} />}
          </button>
          <button
            type="button"
            className="ctrl-btn"
            onClick={() => handleZoom('in')}
            title="Zoom In"
          >
            <ZoomIn size={13} />
          </button>
          <button
            type="button"
            className="ctrl-btn"
            onClick={() => handleZoom('out')}
            title="Zoom Out"
          >
            <ZoomOut size={13} />
          </button>
          <button
            type="button"
            className="ctrl-btn"
            onClick={() => handleZoom('reset')}
            title="Reset / Center View"
          >
            <RotateCcw size={13} />
          </button>
          <button
            type="button"
            className={`ctrl-btn ${isFullScreen ? 'active-fullscreen' : ''}`}
            onClick={handleToggleFullScreen}
            title={isFullScreen ? 'Exit Full Screen (Esc)' : 'Expand Full Screen'}
          >
            {isFullScreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* HTML5 Canvas */}
      <canvas
        ref={canvasRef}
        className="agent-graph-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Empty State Overlay */}
      {nodes.length === 0 && (
        <div className="agent-graph-empty-state">
          <Sparkles size={36} className="empty-graph-icon" />
          <h4 className="empty-graph-title">
            {viewMode === 'incident' ? 'No Incident Query Active' : 'Knowledge Graph Empty'}
          </h4>
          <p className="empty-graph-desc">
            {viewMode === 'incident'
              ? 'Ask the Investigator Agent a question in chat to dynamically map the incident topology, or click "Full Graph" above.'
              : 'Upload documents in the Knowledge Base to extract and populate graph entities.'}
          </p>
        </div>
      )}

      {/* Directed Highlight Pathway Legend */}
      <div className="pathway-legend-strip">
        <div className="pathway-label">Reasoning Traversal:</div>
        <div className="pathway-step doc">Document</div>
        <div className="pathway-arrow">➔</div>
        <div className="pathway-step feat">Feature</div>
        <div className="pathway-arrow">➔</div>
        <div className="pathway-step srv">Service</div>
        <div className="pathway-arrow">➔</div>
        <div className="pathway-step person">Person</div>
        <div className="pathway-arrow">➔</div>
        <div className="pathway-step ep">MemoryEpisode</div>
      </div>

      {/* Node Inspector Drawer */}
      {inspectNode && (
        <div className="agent-node-inspector">
          <div className="inspector-header">
            <div className="inspector-title-group">
              <span
                className="inspector-type-badge"
                style={{
                  background: NODE_COLORS[inspectNode.type]?.bg || '#334155',
                  color: NODE_COLORS[inspectNode.type]?.stroke || '#94a3b8',
                }}
              >
                {inspectNode.type}
              </span>
              <h3 className="inspector-node-name">{inspectNode.label}</h3>
            </div>
            <button
              type="button"
              className="inspector-close-btn"
              onClick={() => {
                setInspectNode(null);
                onSelectNode?.(null);
              }}
            >
              <X size={14} />
            </button>
          </div>

          <div className="inspector-body">
            {inspectNode.properties && Object.keys(inspectNode.properties).length > 0 && (
              <div className="inspector-props-grid">
                {Object.entries(inspectNode.properties).map(([k, v]) => (
                  <div key={k} className="prop-row">
                    <span className="prop-key">{k}:</span>
                    <span className="prop-val">{String(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentGraphViewer;
