import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Pause,
  Play,
  Search,
  Filter,
  X,
  Share2,
  Info,
  Server,
  Zap,
  User,
  History,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import type { AgentSubgraph, AgentSubgraphNode, AgentSubgraphEdge } from '../../types';
import './AgentGraphViewer.css';

interface AgentGraphViewerProps {
  subgraph: AgentSubgraph;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string | null) => void;
  title?: string;
}

// Enterprise Node Category Palette
const NODE_COLORS: Record<string, { fill: string; stroke: string; text: string; bg: string }> = {
  Service: { fill: '#3b82f6', stroke: '#60a5fa', text: '#93c5fd', bg: 'rgba(59, 130, 246, 0.15)' },
  Feature: { fill: '#10b981', stroke: '#34d399', text: '#6ee7b7', bg: 'rgba(16, 185, 129, 0.15)' },
  Person: { fill: '#f59e0b', stroke: '#fbbf24', text: '#fde68a', bg: 'rgba(245, 158, 11, 0.15)' },
  MemoryEpisode: { fill: '#a855f7', stroke: '#c084fc', text: '#e9d5ff', bg: 'rgba(168, 85, 247, 0.15)' },
  Policy: { fill: '#f43f5e', stroke: '#fb7185', text: '#fecdd3', bg: 'rgba(244, 63, 94, 0.15)' },
  Task: { fill: '#fb923c', stroke: '#fdba74', text: '#fed7aa', bg: 'rgba(251, 146, 60, 0.15)' },
  Document: { fill: '#6366f1', stroke: '#818cf8', text: '#c7d2fe', bg: 'rgba(99, 102, 241, 0.15)' },
  Default: { fill: '#64748b', stroke: '#94a3b8', text: '#cbd5e1', bg: 'rgba(100, 116, 139, 0.15)' },
};

export const AgentGraphViewer: React.FC<AgentGraphViewerProps> = ({
  subgraph,
  selectedNodeId,
  onSelectNode,
  title = 'Enterprise Topology & Incident Subgraph',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<AgentSubgraphNode[]>([]);
  const [edges, setEdges] = useState<AgentSubgraphEdge[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [inspectNode, setInspectNode] = useState<AgentSubgraphNode | null>(null);

  // Transform and scale
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  const isDraggingRef = useRef(false);
  const dragNodeRef = useRef<AgentSubgraphNode | null>(null);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  // Initialize nodes with positions when subgraph changes
  useEffect(() => {
    if (!subgraph || !subgraph.nodes || subgraph.nodes.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const canvas = canvasRef.current;
    const width = canvas?.clientWidth || 700;
    const height = canvas?.clientHeight || 400;

    // Arrange nodes in a radial circular cluster initially
    const count = subgraph.nodes.length;
    const initializedNodes: AgentSubgraphNode[] = subgraph.nodes.map((n, i) => {
      const angle = (i / count) * 2 * Math.PI;
      const radius = Math.min(width, height) * 0.32;
      return {
        ...n,
        x: width / 2 + Math.cos(angle) * radius + (Math.random() - 0.5) * 40,
        y: height / 2 + Math.sin(angle) * radius + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0,
      };
    });

    setNodes(initializedNodes);
    setEdges(subgraph.edges || []);
    transformRef.current = { x: 0, y: 0, k: 1 };
  }, [subgraph]);

  // Selected node sync
  useEffect(() => {
    if (selectedNodeId) {
      const match = nodes.find(n => n.id === selectedNodeId || n.label === selectedNodeId);
      if (match) setInspectNode(match);
    }
  }, [selectedNodeId, nodes]);

  // Force simulation loop
  useEffect(() => {
    let animId: number;

    const tick = () => {
      if (!isPaused && nodes.length > 0) {
        const canvas = canvasRef.current;
        const width = canvas?.clientWidth || 700;
        const height = canvas?.clientHeight || 400;

        // Simple repulsive & attractive physics
        const kRepulse = 1800;
        const kAttract = 0.04;
        const centerGravity = 0.015;

        // Repulsion between nodes
        for (let i = 0; i < nodes.length; i++) {
          const n1 = nodes[i];
          if (n1 === dragNodeRef.current) continue;

          for (let j = i + 1; j < nodes.length; j++) {
            const n2 = nodes[j];
            const dx = (n1.x || 0) - (n2.x || 0);
            const dy = (n1.y || 0) - (n2.y || 0);
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            if (dist < 260) {
              const force = kRepulse / (dist * dist);
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;
              n1.vx = (n1.vx || 0) + fx;
              n1.vy = (n1.vy || 0) + fy;
              n2.vx = (n2.vx || 0) - fx;
              n2.vy = (n2.vy || 0) - fy;
            }
          }

          // Center attraction
          n1.vx = (n1.vx || 0) + (width / 2 - (n1.x || 0)) * centerGravity;
          n1.vy = (n1.vy || 0) + (height / 2 - (n1.y || 0)) * centerGravity;
        }

        // Attraction along edges
        edges.forEach(e => {
          const src = nodes.find(n => n.id === e.source || n.label === e.source);
          const tgt = nodes.find(n => n.id === e.target || n.label === e.target);
          if (src && tgt) {
            const dx = (tgt.x || 0) - (src.x || 0);
            const dy = (tgt.y || 0) - (src.y || 0);
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (dist - 120) * kAttract;
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

        // Apply velocities with damping
        nodes.forEach(n => {
          if (n !== dragNodeRef.current) {
            n.x = (n.x || 0) + (n.vx || 0);
            n.y = (n.y || 0) + (n.vy || 0);
            n.vx = (n.vx || 0) * 0.85;
            n.vy = (n.vy || 0) * 0.85;
          }
        });
      }

      draw();
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [nodes, edges, isPaused, activeFilter, searchQuery, inspectNode]);

  // Main Canvas Rendering function
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
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
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 32;
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

    // Draw Edges
    edges.forEach(e => {
      const src = nodes.find(n => n.id === e.source || n.label === e.source);
      const tgt = nodes.find(n => n.id === e.target || n.label === e.target);
      if (!src || !tgt) return;

      const isConnectedToInspect =
        inspectNode && (src.id === inspectNode.id || tgt.id === inspectNode.id);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(src.x || 0, src.y || 0);
      ctx.lineTo(tgt.x || 0, tgt.y || 0);

      if (isConnectedToInspect) {
        ctx.strokeStyle = '#818cf8';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#818cf8';
        ctx.shadowBlur = 8;
      } else {
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
        ctx.lineWidth = 1.2;
      }
      ctx.stroke();

      // Directional arrow
      const midX = ((src.x || 0) + (tgt.x || 0)) / 2;
      const midY = ((src.y || 0) + (tgt.y || 0)) / 2;
      const angle = Math.atan2((tgt.y || 0) - (src.y || 0), (tgt.x || 0) - (src.x || 0));

      ctx.save();
      ctx.translate(midX, midY);
      ctx.rotate(angle);
      ctx.fillStyle = isConnectedToInspect ? '#818cf8' : 'rgba(148, 163, 184, 0.6)';
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(-4, -3.5);
      ctx.lineTo(-4, 3.5);
      ctx.closePath();
      ctx.fill();

      // Edge relation label
      if (zoom >= 0.75 && e.relation) {
        ctx.font = '9px Inter, sans-serif';
        ctx.fillStyle = isConnectedToInspect ? '#c7d2fe' : 'rgba(148, 163, 184, 0.7)';
        ctx.textAlign = 'center';
        ctx.fillText(e.relation, 0, -6);
      }
      ctx.restore();

      ctx.restore();
    });

    // Draw Nodes
    nodes.forEach(n => {
      const typePalette = NODE_COLORS[n.type] || NODE_COLORS.Default;
      const isSelected = inspectNode?.id === n.id;
      const isSearchMatch =
        searchQuery && n.label.toLowerCase().includes(searchQuery.toLowerCase());
      const isFilterDimmed = activeFilter !== 'ALL' && n.type !== activeFilter;

      const radius = isSelected ? 22 : 18;

      ctx.save();
      ctx.translate(n.x || 0, n.y || 0);

      // Dim non-matches
      if (isFilterDimmed && !isSelected) {
        ctx.globalAlpha = 0.2;
      }

      // Outer glow for selected or search match
      if (isSelected || isSearchMatch) {
        ctx.beginPath();
        ctx.arc(0, 0, radius + 7, 0, 2 * Math.PI);
        ctx.fillStyle = typePalette.fill;
        ctx.globalAlpha = 0.3;
        ctx.fill();
        ctx.globalAlpha = isFilterDimmed ? 0.2 : 1.0;
      }

      // Node Circle
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, 2 * Math.PI);
      ctx.fillStyle = isSelected ? '#ffffff' : typePalette.fill;
      ctx.fill();

      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeStyle = isSelected ? typePalette.stroke : 'rgba(255, 255, 255, 0.3)';
      ctx.stroke();

      // Node Label
      ctx.font = isSelected ? 'bold 11px Inter, sans-serif' : '10px Inter, sans-serif';
      ctx.fillStyle = isSelected ? '#ffffff' : '#f1f5f9';
      ctx.textAlign = 'center';
      ctx.fillText(n.label, 0, radius + 14);

      // Node Type Subtitle
      if (zoom >= 0.8) {
        ctx.font = '8px Inter, sans-serif';
        ctx.fillStyle = typePalette.text;
        ctx.fillText(n.type, 0, radius + 24);
      }

      ctx.restore();
    });

    ctx.restore();
    ctx.restore();
  }, [nodes, edges, inspectNode, searchQuery, activeFilter]);

  // Mouse interaction handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Transform mouse into graph coordinates
    const { x: panX, y: panY, k: zoom } = transformRef.current;
    const graphX = (mouseX - panX) / zoom;
    const graphY = (mouseY - panY) / zoom;

    // Check hit on any node
    const hitNode = nodes.find(n => {
      const dx = (n.x || 0) - graphX;
      const dy = (n.y || 0) - graphY;
      return Math.sqrt(dx * dx + dy * dy) <= 22;
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
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const newK = Math.max(0.4, Math.min(3.0, transformRef.current.k * factor));
    transformRef.current.k = newK;
  };

  // Zoom control buttons
  const handleZoom = (direction: 'in' | 'out' | 'reset') => {
    if (direction === 'in') {
      transformRef.current.k = Math.min(3.0, transformRef.current.k * 1.2);
    } else if (direction === 'out') {
      transformRef.current.k = Math.max(0.4, transformRef.current.k / 1.2);
    } else {
      transformRef.current = { x: 0, y: 0, k: 1 };
    }
  };

  // Find connected triples for the inspected node
  const connectedTriples = inspectNode
    ? edges.filter(
        e =>
          e.source === inspectNode.id ||
          e.source === inspectNode.label ||
          e.target === inspectNode.id ||
          e.target === inspectNode.label
      )
    : [];

  return (
    <div className="agent-graph-viewer-container">
      {/* Top Overlay Toolbar */}
      <div className="agent-graph-toolbar">
        <div className="graph-toolbar-left">
          <div className="graph-title-pill">
            <Share2 size={13} className="title-icon" />
            <span>{title}</span>
            <span className="node-count-tag">
              {nodes.length} nodes • {edges.length} edges
            </span>
          </div>

          {/* Search Input */}
          <div className="graph-search-box">
            <Search size={12} className="search-icon" />
            <input
              type="text"
              placeholder="Search node..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
              >
                <X size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Chips */}
        <div className="graph-filter-chips">
          {['ALL', 'Service', 'Feature', 'Person', 'MemoryEpisode', 'Policy'].map(cat => (
            <button
              key={cat}
              type="button"
              className={`filter-chip ${activeFilter === cat ? 'active' : ''}`}
              onClick={() => setActiveFilter(cat)}
            >
              {cat === 'ALL' ? 'All Types' : cat}
            </button>
          ))}
        </div>

        {/* Zoom & Action Controls */}
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
            title="Reset Fit View"
          >
            <Maximize2 size={13} />
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

            {/* Connected Triples */}
            <div className="inspector-triples-section">
              <div className="triples-header">
                Connected Triples ({connectedTriples.length})
              </div>
              <div className="triples-list">
                {connectedTriples.map((t, idx) => (
                  <div key={idx} className="triple-card">
                    <span className="triple-src">{t.source}</span>
                    <span className="triple-rel">──[{t.relation}]──➔</span>
                    <span className="triple-tgt">{t.target}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentGraphViewer;
