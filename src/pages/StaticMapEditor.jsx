import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ReactFlow, Controls, MiniMap, Background, useNodesState, useEdgesState,
  addEdge, Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toPng } from 'html-to-image';
import DeviceNode from '../nodes/DeviceNode';
import GroupNode from '../nodes/GroupNode';
import DraggableEdge from '../edges/DraggableEdge';
import Toolbar from '../components/Toolbar';
import { getLayoutedElements } from '../utils/layoutEngine';
import api from '../api/client';

const nodeTypes = { device: DeviceNode, group: GroupNode };
const edgeTypes = { draggable: DraggableEdge };
const defaultEdgeOptions = {
  type: 'draggable', animated: false,
  data: { sourceAnchor: { side: 'bottom', offset: 0.5 }, targetAnchor: { side: 'top', offset: 0.5 } },
};
const proOptions = { hideAttribution: true };

let nodeIdCounter = 100;
const getId = () => `node_${nodeIdCounter++}`;

export default function StaticMapEditor() {
  const { mapId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reactFlowWrapper = useRef(null);
  const [mapMeta, setMapMeta] = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const isFirstRender = useRef(true);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState(searchParams.get('mode') === 'view' ? 'view' : 'edit');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/maps/${mapId}`);
        setMapMeta(res.data);
        if (res.data.nodes?.length > 0) setNodes(res.data.nodes);
        if (res.data.edges?.length > 0) setEdges(res.data.edges);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [mapId]);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setHasUnsaved(true);
  }, [nodes, edges]);

  const onSave = useCallback(async () => {
    try {
      await api.put(`/maps/${mapId}`, { nodes, edges });
      setHasUnsaved(false);
    } catch (e) { console.error(e); }
  }, [mapId, nodes, edges]);

  const onExportPng = useCallback(() => {
    const el = document.querySelector('.react-flow__renderer');
    if (!el) return;
    toPng(el, { backgroundColor: '#f1f5f9', pixelRatio: 2 }).then((dataUrl) => {
      const a = document.createElement('a'); a.href = dataUrl; a.download = `${mapMeta?.name || 'map'}.png`; a.click();
    });
  }, [mapMeta]);

  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge({ ...params, type: 'draggable', data: { sourceAnchor: { side: 'bottom', offset: 0.5 }, targetAnchor: { side: 'top', offset: 0.5 } } }, eds));
  }, [setEdges]);

  const onDragOver = useCallback((e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    const deviceType = e.dataTransfer.getData('application/reactflow');
    if (!deviceType || !reactFlowInstance) return;
    const position = reactFlowInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setNodes((nds) => nds.concat({ id: getId(), type: 'device', position, data: { label: deviceType.toUpperCase(), deviceType } }));
  }, [reactFlowInstance, setNodes]);

  const onNodeDoubleClick = useCallback((_, node) => {
    if (node.type === 'group') return;
    const newLabel = prompt('Rename device:', node.data.label);
    if (newLabel?.trim()) setNodes((nds) => nds.map((n) => n.id === node.id ? { ...n, data: { ...n.data, label: newLabel.trim() } } : n));
  }, [setNodes]);

  const onAutoLayout = useCallback(() => {
    const { nodes: ln, edges: le } = getLayoutedElements(nodes, edges);
    setNodes(ln); setEdges(le);
  }, [nodes, edges, setNodes, setEdges]);

  const onAddGroup = useCallback(() => {
    const selected = nodes.filter((n) => n.selected && n.type !== 'group');
    if (selected.length === 0) { alert('Select devices first'); return; }
    const xs = selected.map((n) => n.position.x), ys = selected.map((n) => n.position.y);
    const pad = 40;
    const groupNode = {
      id: `group_${Date.now()}`, type: 'group',
      position: { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad },
      style: { width: Math.max(...xs) - Math.min(...xs) + 120 + pad * 2, height: Math.max(...ys) - Math.min(...ys) + 100 + pad * 2 },
      data: { label: 'Group' },
    };
    setNodes((nds) => [groupNode, ...nds.map((n) => n.selected && n.type !== 'group' ? { ...n, parentId: groupNode.id, extent: 'parent' } : n)]);
  }, [nodes, setNodes]);

  const onExport = useCallback(() => {
    const json = JSON.stringify({ nodes, edges }, null, 2);
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.download = `${mapMeta?.name || 'map'}.json`; a.click();
  }, [nodes, edges, mapMeta]);

  const onImport = useCallback(() => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => { try { const data = JSON.parse(ev.target.result); if (data.nodes) setNodes(data.nodes); if (data.edges) setEdges(data.edges); } catch { alert('Invalid JSON'); } };
      reader.readAsText(file);
    };
    input.click();
  }, [setNodes, setEdges]);

  const onClear = useCallback(() => { if (confirm('Clear canvas?')) { setNodes([]); setEdges([]); } }, [setNodes, setEdges]);

  if (loading) return <div className="page-loading">Loading map…</div>;

  return (
    <div className="editor-layout">
      <div className="editor-topbar">
        <button className="back-btn" onClick={() => navigate('/maps')}>← Maps</button>
        <span className="editor-title">{mapMeta?.name}</span>
        <span className="map-type-pill static">Static Map</span>
        <div className="topbar-actions">
          <div className="mode-toggle" style={{marginLeft:0}}>
            <button
              className={mode === 'view' ? 'active' : ''}
              onClick={() => setMode('view')}
            >View</button>
            <button
              className={mode === 'edit' ? 'active' : ''}
              onClick={() => setMode('edit')}
            >Edit</button>
          </div>
          {mode === 'edit' && hasUnsaved && <span className="unsaved-dot" title="Unsaved changes">●</span>}
        </div>
      </div>
      <div className="editor-body">
        {mode === 'edit' && (
          <Toolbar
            onAutoLayout={onAutoLayout} onAddGroup={onAddGroup} onSave={onSave}
            hasUnsaved={hasUnsaved} onExportPng={onExportPng} onExport={onExport}
            onImport={onImport} onClear={onClear}
          />
        )}
        <div className="canvas-container" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={mode === 'edit' ? onConnect : undefined}
            onInit={setReactFlowInstance}
            onDrop={mode === 'edit' ? onDrop : undefined}
            onDragOver={mode === 'edit' ? onDragOver : undefined}
            onNodeDoubleClick={mode === 'edit' ? onNodeDoubleClick : undefined}
            nodesDraggable={mode === 'edit'}
            nodesConnectable={mode === 'edit'}
            elementsSelectable={mode === 'edit'}
            nodeTypes={nodeTypes} edgeTypes={edgeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView fitViewOptions={{ padding: 0.2 }}
            snapToGrid={mode === 'edit'} snapGrid={[20, 20]}
            proOptions={proOptions}
            deleteKeyCode={mode === 'edit' ? ['Delete', 'Backspace'] : null}
            connectionLineType="smoothstep"
          >
            <Controls position="bottom-right" className="flow-controls" />
            <MiniMap position="bottom-right" style={{ marginBottom: 50 }}
              nodeColor={(n) => { if (n.type === 'group') return '#f59e0b33'; if (n.data?.deviceType === 'firewall') return '#e53e3e'; if (n.data?.deviceType === 'server') return '#3182ce'; return '#64748b'; }}
              maskColor="rgba(0,0,0,0.08)" className="flow-minimap"
            />
            <Background variant="dots" gap={20} size={1} color="#d1d5db" />
            <Panel position="top-right" className="canvas-panel">
              <div className="canvas-badge"><span className="canvas-badge-dot"></span>{mapMeta?.name}</div>
            </Panel>
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
