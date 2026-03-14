import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ReactFlow, Controls, MiniMap, Background, useNodesState, useEdgesState,
  Panel, Handle, Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toPng } from 'html-to-image';
import api from '../api/client';
import DraggableEdge from '../edges/DraggableEdge';
import { getLayoutedElements } from '../utils/layoutEngine';
import { CloudIcon, RouterIcon, SwitchIcon, FirewallIcon, ServerIcon, NetworkTreeIcon } from '../icons';
import { MapModeContext } from '../context/MapModeContext';

const iconMap = {
  router: RouterIcon, switch: SwitchIcon, firewall: FirewallIcon,
  server: ServerIcon, network: NetworkTreeIcon, cloud: CloudIcon,
  accesspoint: NetworkTreeIcon, other: ServerIcon,
};

const proOptions = { hideAttribution: true };

const edgeTypes = { draggable: DraggableEdge };

const defaultEdgeOptions = {
  type: 'draggable',
  animated: false,
  data: {
    sourceAnchor: { side: 'bottom', offset: 0.5 },
    targetAnchor: { side: 'top', offset: 0.5 },
  },
};

// ── Active Device Node ─────────────────────────────────────────────────
function ActiveDeviceNode({ data, selected }) {
  const Icon = iconMap[data.deviceType?.toLowerCase()] || ServerIcon;
  const statusColor = data.status === 'up' ? '#22c55e' : data.status === 'down' ? '#ef4444' : null;

  return (
    <div className={`device-node ${selected ? 'selected' : ''}`} style={{ position: 'relative', minWidth: 110 }}>
      <Handle id="top"    type="source" position={Position.Top}    className="node-handle" />
      <Handle id="left"   type="source" position={Position.Left}   className="node-handle" />
      {statusColor && (
        <div className="device-status-dot" style={{ background: statusColor }} title={`Status: ${data.status}`} />
      )}
      <div className="device-node-icon"><Icon size={48} /></div>
      <div className="device-node-label">{data.label}</div>
      <Handle id="bottom" type="source" position={Position.Bottom} className="node-handle" />
      <Handle id="right"  type="source" position={Position.Right}  className="node-handle" />
    </div>
  );
}

const nodeTypes = { activeDevice: ActiveDeviceNode };

// ── Interface Picker Modal ─────────────────────────────────────────────
function InterfacePicker({ title, interfaces, allCount = 0, onSelect, onClose }) {
  const fmtSpeed = (s) => {
    if (!s) return '';
    const n = Number(s);
    return n >= 1e9 ? `${(n / 1e9).toFixed(0)}G` : n >= 1e6 ? `${(n / 1e6).toFixed(0)}M` : `${n}M`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ fontSize: '0.95rem' }}>{title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body iface-picker">
          {interfaces.length === 0 ? (
            <div className="empty-state">
              {allCount > 0
                ? 'All interfaces on this device are already connected.'
                : 'No interfaces defined for this device.'}
            </div>
          ) : (
            interfaces.map((iface, i) => (
              <button key={i} className="iface-pick-btn" onClick={() => onSelect(iface)}>
                <span className="iface-pick-name">{iface.name}</span>
                <span className="iface-pick-meta">
                  {fmtSpeed(iface.speed)}{iface.speed ? ' · ' : ''}
                  {iface.type || ''}
                  {iface.operStatus ? ` · ${iface.operStatus}` : ''}
                </span>
              </button>
            ))
          )}
          <button className="iface-pick-btn iface-pick-skip" onClick={() => onSelect(null)}>
            Skip — no interface label
          </button>
        </div>
      </div>
    </div>
  );
}

let nodeCounter = 100;
const getNodeId = () => `an_${nodeCounter++}`;

// ── Main Component ─────────────────────────────────────────────────────
export default function ActiveMapEditor() {
  const { mapId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const wrapperRef = useRef(null);

  const [mapMeta, setMapMeta]         = useState(null);
  const [inventory, setInventory]     = useState([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [rfInstance, setRfInstance]   = useState(null);
  const [hasUnsaved, setHasUnsaved]   = useState(false);
  const [loading, setLoading]         = useState(true);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [mode, setMode]               = useState(searchParams.get('mode') === 'view' ? 'view' : 'edit');

  // Interface picker state
  const [pickerStep, setPickerStep]   = useState(null);

  const isFirstRender = useRef(true);
  const [pollInterval, setPollInterval] = useState(60);

  // ── Compute edge color from node interface status ──────────────────
  // SNMP nodes  → use operStatus  (live hardware state)
  // Custom nodes → use adminStatus (manually set by user)
  //
  // Color rules:
  //   Any endpoint down           → red   (#ef4444)
  //   Both up, at least 1 SNMP   → green (#22c55e)
  //   Both up, custom-only link  → orange (#f59e0b)
  //   No interface assigned      → keep stored color / amber default
  const computeEdgeColors = useCallback((edgeList, nodeList) => {
    return edgeList.map((edge) => {
      const srcNode = nodeList.find((n) => n.id === edge.source);
      const tgtNode = nodeList.find((n) => n.id === edge.target);

      const getIfaceStatus = (node, ifaceName) => {
        if (!node || !ifaceName) return null;
        const iface = (node.data?.interfaces || []).find((i) => i.name === ifaceName);
        if (!iface) return null;
        if (node.data?.category === 'snmp')   return iface.operStatus  || null;
        if (node.data?.category === 'custom') return iface.adminStatus || null;
        return null;
      };

      const srcStatus = getIfaceStatus(srcNode, edge.data?.sourceIface);
      const tgtStatus = getIfaceStatus(tgtNode, edge.data?.targetIface);
      const statuses  = [srcStatus, tgtStatus].filter(Boolean);

      const hasSNMP = srcNode?.data?.category === 'snmp' || tgtNode?.data?.category === 'snmp';

      let color;
      if (statuses.length > 0) {
        if (statuses.some((s) => s === 'down'))    color = '#ef4444';
        else if (statuses.every((s) => s === 'up')) color = hasSNMP ? '#22c55e' : '#f59e0b';
        else                                         color = '#f59e0b';
      } else {
        color = edge.data?.color || '#f59e0b';
      }

      return color === edge.data?.color ? edge : { ...edge, data: { ...edge.data, color } };
    });
  }, []);

  // ── Load map + inventory + settings ───────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [mapRes, devRes, settRes] = await Promise.all([
          api.get(`/maps/${mapId}`),
          api.get('/devices'),
          api.get('/settings'),
        ]);
        setMapMeta(mapRes.data);
        setInventory(devRes.data);
        setPollInterval(settRes.data.snmpPollInterval ?? 60);
        const loadedNodes = mapRes.data.nodes?.length > 0 ? mapRes.data.nodes : [];
        const loadedEdges = mapRes.data.edges?.length > 0 ? mapRes.data.edges : [];
        if (loadedNodes.length > 0) setNodes(loadedNodes);
        if (loadedEdges.length > 0) setEdges(computeEdgeColors(loadedEdges, loadedNodes));
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [mapId, computeEdgeColors]);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setHasUnsaved(true);
  }, [nodes, edges]);

  // ── Save ──────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    try {
      await api.put(`/maps/${mapId}`, { nodes, edges });
      setHasUnsaved(false);
    } catch (e) { console.error(e); }
  }, [mapId, nodes, edges]);

  // ── Export PNG ────────────────────────────────────────────────────
  const onExportPng = useCallback(() => {
    const el = document.querySelector('.react-flow__renderer');
    if (!el) return;
    toPng(el, { backgroundColor: '#f1f5f9', pixelRatio: 2 }).then((dataUrl) => {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${mapMeta?.name || 'active-map'}.png`;
      a.click();
    });
  }, [mapMeta]);

  // ── Auto Layout ───────────────────────────────────────────────────
  const onAutoLayout = useCallback(() => {
    const { nodes: ln, edges: le } = getLayoutedElements(nodes, edges, 'TB');
    setNodes([...ln]);
    setEdges([...le]);
    setTimeout(() => rfInstance?.fitView({ padding: 0.2 }), 50);
  }, [nodes, edges, setNodes, setEdges, rfInstance]);

  // ── Node double-click rename ───────────────────────────────────────
  const onNodeDoubleClick = useCallback((_, node) => {
    const newLabel = prompt('Rename device:', node.data.label);
    if (newLabel?.trim()) {
      setNodes((nds) => nds.map((n) =>
        n.id === node.id ? { ...n, data: { ...n.data, label: newLabel.trim() } } : n
      ));
    }
  }, [setNodes]);

  // ── Drag from inventory sidebar ───────────────────────────────────
  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/device-inventory');
    if (!raw || !rfInstance) return;
    const device = JSON.parse(raw);
    const position = rfInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setNodes((nds) => nds.concat({
      id: getNodeId(),
      type: 'activeDevice',
      position,
      data: {
        label: device.name,
        deviceType: device.type?.toLowerCase() || 'server',
        deviceId: device.id,
        category: device.category,
        status: device.status,
        interfaces: device.interfaces || [],
      },
    }));
  }, [rfInstance, setNodes]);

  const onDragStartInventory = useCallback((e, device) => {
    e.dataTransfer.setData('application/device-inventory', JSON.stringify(device));
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  // ── Track which interfaces are already wired up ───────────────────
  // Returns a Map: nodeId -> Set<interfaceName>
  const usedIfacesByNode = useMemo(() => {
    const map = new Map();
    edges.forEach((edge) => {
      if (edge.data?.sourceIface) {
        if (!map.has(edge.source)) map.set(edge.source, new Set());
        map.get(edge.source).add(edge.data.sourceIface);
      }
      if (edge.data?.targetIface) {
        if (!map.has(edge.target)) map.set(edge.target, new Set());
        map.get(edge.target).add(edge.data.targetIface);
      }
    });
    return map;
  }, [edges]);

  const getFreeInterfaces = useCallback((node) => {
    const used = usedIfacesByNode.get(node.id) || new Set();
    return (node.data.interfaces || []).filter((iface) => !used.has(iface.name));
  }, [usedIfacesByNode]);

  // ── Connection / Interface picker ─────────────────────────────────
  const onConnect = useCallback((params) => {
    const sourceNode = nodes.find((n) => n.id === params.source);
    const targetNode = nodes.find((n) => n.id === params.target);
    if (!sourceNode || !targetNode) return;

    setPickerStep({
      step: 'source',
      params,
      sourceNode,
      targetNode,
      sourceIface: null,
      sourceFreeIfaces: getFreeInterfaces(sourceNode),
      targetFreeIfaces: getFreeInterfaces(targetNode),
    });
  }, [nodes, getFreeInterfaces]);

  const handleSourceIfaceSelect = useCallback((iface) => {
    setPickerStep((prev) => ({ ...prev, step: 'target', sourceIface: iface }));
  }, []);

  const handleTargetIfaceSelect = useCallback((iface) => {
    const { params, sourceIface } = pickerStep;
    const srcLabel = sourceIface?.name || '';
    const tgtLabel = iface?.name || '';
    const linkLabel = [srcLabel, tgtLabel].filter(Boolean).join(' ↔ ') || null;

    const newEdge = {
      ...params,
      id: `ae_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: 'draggable',
      data: {
        sourceAnchor: { side: 'bottom', offset: 0.5 },
        targetAnchor: { side: 'top', offset: 0.5 },
        sourceIface: sourceIface?.name || null,
        targetIface: iface?.name || null,
        linkLabel,
        color: '#f59e0b',
      },
    };

    // Directly append — skip addEdge() so it never deduplicates multi-links
    setEdges((eds) => [...eds, newEdge]);
    setPickerStep(null);
  }, [pickerStep, setEdges]);

  const cancelPicker = useCallback(() => setPickerStep(null), []);

  // ── Poll all SNMP + refresh all device data (incl. custom nodes) ──
  const onPollAll = useCallback(async () => {
    try {
      // Fire SNMP poll and a full device refresh in parallel
      const [pollRes, allRes] = await Promise.all([
        api.post('/devices/poll-all'),
        api.get('/devices'),
      ]);

      // Merge: SNMP results are authoritative for SNMP devices;
      // all other fields (e.g. custom node adminStatus) come from allRes
      const snmpUpdated = pollRes.data.devices;
      const allDevices  = allRes.data.map((d) => {
        const snmpVersion = snmpUpdated.find((u) => u.id === d.id);
        return snmpVersion || d;
      });

      setInventory(allDevices);

      setNodes((nds) => {
        const newNodes = nds.map((n) => {
          const dev = allDevices.find((d) => d.id === n.data?.deviceId);
          if (!dev) return n;
          return {
            ...n,
            data: {
              ...n.data,
              status:     dev.status,
              interfaces: dev.interfaces || n.data.interfaces,
            },
          };
        });
        setEdges((eds) => computeEdgeColors(eds, newNodes));
        return newNodes;
      });
    } catch (e) { console.error(e); }
  }, [setNodes, setEdges, computeEdgeColors]);

  // ── Auto-poll on interval ─────────────────────────────────────────
  useEffect(() => {
    if (!pollInterval || pollInterval <= 0) return;
    const id = setInterval(onPollAll, pollInterval * 1000);
    return () => clearInterval(id);
  }, [pollInterval, onPollAll]);

  const addedDeviceIds = useMemo(
    () => new Set(nodes.map((n) => n.data?.deviceId).filter(Boolean)),
    [nodes]
  );

  if (loading) return <div className="page-loading">Loading active map…</div>;

  return (
    <MapModeContext.Provider value={{ mode, nodes }}>
    <div className="editor-layout">
      {/* ── Top Bar ── */}
      <div className="editor-topbar">
        <button className="back-btn" onClick={() => navigate('/maps')}>← Maps</button>
        <span className="editor-title">{mapMeta?.name}</span>
        <span className="map-type-pill active">Active Map</span>
        {mode === 'view' && <span className="view-mode-badge">View Only</span>}
        <div className="topbar-actions">
          {mode === 'edit' && (
            <button className="btn-sm" onClick={onAutoLayout} title="Auto arrange nodes">Auto Layout</button>
          )}
          <button className="btn-sm" onClick={onPollAll} title="Re-poll all SNMP devices">Refresh SNMP</button>
          <button className="btn-sm" onClick={onExportPng} title="Export canvas as PNG">Export PNG</button>
          {mode === 'edit' && hasUnsaved && <span className="unsaved-dot" title="Unsaved changes">●</span>}
          {mode === 'edit' && (
            <button className="btn-primary btn-sm" onClick={handleSave}>Save Map</button>
          )}
        </div>
      </div>

      <div className="editor-body">
        {/* ── Inventory Sidebar (edit mode only) ── */}
        <div className={`active-sidebar ${isSidebarOpen && mode === 'edit' ? '' : 'collapsed'}`}>
          <div className="active-sidebar-header">
            {isSidebarOpen && <span>Device Inventory</span>}
            <button
              className="sidebar-toggle-btn"
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              title={isSidebarOpen ? 'Collapse' : 'Expand'}
            >
              {isSidebarOpen ? '‹' : '›'}
            </button>
          </div>

          {isSidebarOpen && (
            <div className="active-sidebar-list">
              {inventory.length === 0 ? (
                <div className="empty-state small">
                  No devices in inventory.<br />
                  Add devices on the Devices page first.
                </div>
              ) : (
                inventory.map((device) => {
                  const Icon = iconMap[device.type?.toLowerCase()] || ServerIcon;
                  const inUse = addedDeviceIds.has(device.id);
                  return (
                    <div
                      key={device.id}
                      className={`inv-device ${inUse ? 'in-use' : ''}`}
                      draggable={!inUse}
                      onDragStart={!inUse ? (e) => onDragStartInventory(e, device) : undefined}
                      title={inUse ? `${device.name} is already on the canvas` : `Drag ${device.name} onto the canvas`}
                    >
                      <div className="inv-device-icon"><Icon size={26} /></div>
                      <div className="inv-device-info">
                        <span className="inv-device-name">{device.name}</span>
                        <span className="inv-device-meta">
                          {device.type}
                          {device.category === 'snmp' ? ` · ${device.ip}` : ' · custom'}
                        </span>
                      </div>
                      {device.category === 'snmp' && (
                        <div className={`inv-status-dot status-${device.status || 'unknown'}`} title={device.status} />
                      )}
                      {inUse && <span className="inv-in-use-badge">On map</span>}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* ── Canvas ── */}
        <div className="canvas-container" ref={wrapperRef}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={mode === 'edit' ? onConnect : undefined}
            onInit={setRfInstance}
            onDrop={mode === 'edit' ? onDrop : undefined}
            onDragOver={mode === 'edit' ? onDragOver : undefined}
            onNodeDoubleClick={mode === 'edit' ? onNodeDoubleClick : undefined}
            nodesDraggable={mode === 'edit'}
            nodesConnectable={mode === 'edit'}
            elementsSelectable={mode === 'edit'}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            connectionMode="loose"
            fitView
            fitViewOptions={{ padding: 0.2 }}
            snapToGrid={mode === 'edit'}
            snapGrid={[20, 20]}
            proOptions={proOptions}
            deleteKeyCode={mode === 'edit' ? ['Delete', 'Backspace'] : null}
            connectionLineType="smoothstep"
          >
            <Controls position="bottom-right" className="flow-controls" />
            <MiniMap
              position="bottom-right"
              style={{ marginBottom: 50 }}
              nodeColor={(n) => {
                if (n.data?.status === 'up') return '#22c55e44';
                if (n.data?.status === 'down') return '#ef444444';
                return '#64748b44';
              }}
              maskColor="rgba(0,0,0,0.08)"
              className="flow-minimap"
            />
            <Background variant="dots" gap={20} size={1} color="#d1d5db" />
            <Panel position="top-right" className="canvas-panel">
              <div className="canvas-badge">
                <span className="canvas-badge-dot active"></span>
                {mapMeta?.name}
              </div>
            </Panel>

            {nodes.length === 0 && (
              <Panel position="center">
                <div className="drop-hint">
                  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.25, margin: '0 auto', display: 'block' }}>
                    <rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                    <rect x="15" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                    <rect x="9" y="15" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                    <line x1="6" y1="9" x2="12" y2="15" stroke="currentColor" strokeWidth="1.3"/>
                    <line x1="18" y1="9" x2="12" y2="15" stroke="currentColor" strokeWidth="1.3"/>
                  </svg>
                  <p>Drag devices from the inventory panel onto the canvas</p>
                  <p style={{ fontSize: '0.78rem', marginTop: 4, opacity: 0.6 }}>
                    Connect nodes to pick interfaces for each link
                  </p>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>
      </div>

      {/* ── Interface Pickers ── */}
      {pickerStep?.step === 'source' && (
        <InterfacePicker
          title={`${pickerStep.sourceNode.data.label} — Source Interface`}
          interfaces={pickerStep.sourceFreeIfaces}
          allCount={(pickerStep.sourceNode.data.interfaces || []).length}
          onSelect={handleSourceIfaceSelect}
          onClose={cancelPicker}
        />
      )}
      {pickerStep?.step === 'target' && (
        <InterfacePicker
          title={`${pickerStep.targetNode.data.label} — Target Interface`}
          interfaces={pickerStep.targetFreeIfaces}
          allCount={(pickerStep.targetNode.data.interfaces || []).length}
          onSelect={handleTargetIfaceSelect}
          onClose={cancelPicker}
        />
      )}
    </div>
    </MapModeContext.Provider>
  );
}
