import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow, Controls, MiniMap, Background, useNodesState, useEdgesState,
  addEdge, Panel, Handle, Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import api from '../api/client';
import { CloudIcon, RouterIcon, SwitchIcon, FirewallIcon, ServerIcon, NetworkTreeIcon } from '../icons';

const iconMap = { router: RouterIcon, switch: SwitchIcon, firewall: FirewallIcon, server: ServerIcon, network: NetworkTreeIcon, cloud: CloudIcon };
const proOptions = { hideAttribution: true };

function ActiveDeviceNode({ data, selected }) {
  const Icon = iconMap[data.deviceType] || ServerIcon;
  const statusColor = data.status === 'up' ? '#22c55e' : data.status === 'down' ? '#ef4444' : '#94a3b8';
  return (
    <div className={`device-node ${selected ? 'selected' : ''}`} style={{ position: 'relative' }}>
      <Handle id="top" type="target" position={Position.Top} className="node-handle" />
      <Handle id="left" type="target" position={Position.Left} className="node-handle" />
      {data.category === 'snmp' && (
        <div className="device-status-dot" style={{ background: statusColor }} title={`Status: ${data.status}`} />
      )}
      <div className="device-node-icon"><Icon size={48} /></div>
      <div className="device-node-label">{data.label}</div>
      {data.linkLabel && <div className="device-link-label">{data.linkLabel}</div>}
      <Handle id="bottom" type="source" position={Position.Bottom} className="node-handle" />
      <Handle id="right" type="source" position={Position.Right} className="node-handle" />
    </div>
  );
}

const nodeTypes = { activeDevice: ActiveDeviceNode };

function InterfacePicker({ title, interfaces, onSelect, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body iface-picker">
          {interfaces.length === 0 ? (
            <div className="empty-state">No interfaces defined.</div>
          ) : (
            interfaces.map((iface, i) => (
              <button key={i} className="iface-pick-btn" onClick={() => onSelect(iface)}>
                <span className="iface-pick-name">{iface.name}</span>
                <span className="iface-pick-meta">
                  {iface.speed ? `${(iface.speed / 1e6 || iface.speed).toFixed ? Number(iface.speed) >= 1e6 ? `${(iface.speed/1e6).toFixed(0)}Mbps` : `${iface.speed}Mbps` : `${iface.speed}Mbps`} · ` : ''}
                  {iface.type || ''}
                  {iface.operStatus ? ` · ${iface.operStatus}` : ''}
                </span>
              </button>
            ))
          )}
          <button className="iface-pick-btn iface-pick-skip" onClick={() => onSelect(null)}>
            Skip (no interface label)
          </button>
        </div>
      </div>
    </div>
  );
}

let nodeCounter = 1;
const getNodeId = () => `an_${nodeCounter++}`;
let edgeCounter = 1;
const getEdgeId = () => `ae_${edgeCounter++}`;

export default function ActiveMapEditor() {
  const { mapId } = useParams();
  const navigate = useNavigate();
  const [mapMeta, setMapMeta] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [rfInstance, setRfInstance] = useState(null);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const isFirstRender = useRef(true);
  const [pendingConnection, setPendingConnection] = useState(null);
  const [pickerStep, setPickerStep] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [mapRes, devRes] = await Promise.all([api.get(`/maps/${mapId}`), api.get('/devices')]);
        setMapMeta(mapRes.data);
        setInventory(devRes.data);
        if (mapRes.data.nodes?.length > 0) setNodes(mapRes.data.nodes);
        if (mapRes.data.edges?.length > 0) setEdges(mapRes.data.edges);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [mapId]);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setHasUnsaved(true);
  }, [nodes, edges]);

  const handleSave = async () => {
    try {
      await api.put(`/maps/${mapId}`, { nodes, edges });
      setHasUnsaved(false);
    } catch (e) { console.error(e); }
  };

  const onDragOver = useCallback((e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/device-inventory');
    if (!raw || !rfInstance) return;
    const device = JSON.parse(raw);
    const position = rfInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const typeKey = device.type.toLowerCase();
    const newNode = {
      id: getNodeId(),
      type: 'activeDevice',
      position,
      data: {
        label: device.name,
        deviceType: typeKey,
        deviceId: device.id,
        category: device.category,
        status: device.status,
        interfaces: device.interfaces || [],
      },
    };
    setNodes((nds) => nds.concat(newNode));
  }, [rfInstance, setNodes]);

  const onConnectStart = useCallback((_, { nodeId }) => {
    setPendingConnection({ sourceNodeId: nodeId, sourceIface: null });
  }, []);

  const onConnect = useCallback((params) => {
    const sourceNode = nodes.find((n) => n.id === params.source);
    const targetNode = nodes.find((n) => n.id === params.target);
    if (!sourceNode || !targetNode) return;

    const sourceInterfaces = sourceNode.data.interfaces || [];
    const targetInterfaces = targetNode.data.interfaces || [];

    setPickerStep({
      step: 'source',
      params,
      sourceNode,
      targetNode,
      sourceInterfaces,
      targetInterfaces,
      sourceIface: null,
    });
  }, [nodes]);

  const handleSourceIfaceSelect = (iface) => {
    setPickerStep((prev) => ({ ...prev, step: 'target', sourceIface: iface }));
  };

  const handleTargetIfaceSelect = (iface) => {
    const { params, sourceIface, targetInterfaces } = pickerStep;
    const srcLabel = sourceIface ? sourceIface.name : '';
    const tgtLabel = iface ? iface.name : '';
    const label = [srcLabel, tgtLabel].filter(Boolean).join(' ↔ ');

    setEdges((eds) => addEdge({
      ...params,
      id: getEdgeId(),
      label,
      labelStyle: { fill: '#fff', fontSize: 10, fontFamily: 'monospace' },
      labelBgStyle: { fill: '#1e293b', fillOpacity: 0.85 },
      style: { stroke: '#f59e0b', strokeWidth: 2 },
      data: { sourceIface: sourceIface?.name, targetIface: iface?.name },
    }, eds));
    setPickerStep(null);
    setPendingConnection(null);
  };

  const cancelPicker = () => { setPickerStep(null); setPendingConnection(null); };

  const onDragStartInventory = (e, device) => {
    e.dataTransfer.setData('application/device-inventory', JSON.stringify(device));
    e.dataTransfer.effectAllowed = 'move';
  };

  const onPollAll = async () => {
    try {
      const res = await api.post('/devices/poll-all');
      const updated = res.data.devices;
      setNodes((nds) => nds.map((n) => {
        const dev = updated.find((d) => d.id === n.data.deviceId);
        if (!dev) return n;
        return { ...n, data: { ...n.data, status: dev.status, interfaces: dev.interfaces || n.data.interfaces } };
      }));
      setInventory((prev) => prev.map((d) => { const u = updated.find((x) => x.id === d.id); return u || d; }));
    } catch (e) { console.error(e); }
  };

  const addedDeviceIds = new Set(nodes.map((n) => n.data.deviceId).filter(Boolean));

  if (loading) return <div className="page-loading">Loading active map…</div>;

  return (
    <div className="editor-layout">
      <div className="editor-topbar">
        <button className="back-btn" onClick={() => navigate('/maps')}>← Maps</button>
        <span className="editor-title">{mapMeta?.name}</span>
        <span className="map-type-pill active">Active Map</span>
        <div className="topbar-actions">
          {hasUnsaved && <span className="unsaved-dot" title="Unsaved changes">●</span>}
          <button className="btn-sm" onClick={onPollAll}>Refresh SNMP</button>
          <button className="btn-primary btn-sm" onClick={handleSave}>Save Map</button>
        </div>
      </div>

      <div className="editor-body">
        <div className={`active-sidebar ${isSidebarOpen ? '' : 'collapsed'}`}>
          <div className="active-sidebar-header">
            <span>Device Inventory</span>
            <button className="sidebar-toggle-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>{isSidebarOpen ? '‹' : '›'}</button>
          </div>
          {isSidebarOpen && (
            <div className="active-sidebar-list">
              {inventory.length === 0 && <div className="empty-state small">No devices in inventory.<br/>Add devices first.</div>}
              {inventory.map((device) => {
                const Icon = iconMap[device.type?.toLowerCase()] || ServerIcon;
                const inUse = addedDeviceIds.has(device.id);
                return (
                  <div
                    key={device.id}
                    className={`inv-device ${inUse ? 'in-use' : ''}`}
                    draggable={!inUse}
                    onDragStart={!inUse ? (e) => onDragStartInventory(e, device) : undefined}
                    title={inUse ? 'Already on canvas' : `Drag to canvas: ${device.name}`}
                  >
                    <div className="inv-device-icon"><Icon size={28} /></div>
                    <div className="inv-device-info">
                      <span className="inv-device-name">{device.name}</span>
                      <span className="inv-device-meta">{device.type} · {device.category === 'snmp' ? device.ip : 'custom'}</span>
                    </div>
                    {device.category === 'snmp' && (
                      <div className={`inv-status-dot status-${device.status}`} title={device.status} />
                    )}
                    {inUse && <div className="inv-in-use-badge">On map</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="canvas-container" ref={wrapperRef}>
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={onConnect} onConnectStart={onConnectStart}
            onInit={setRfInstance} onDrop={onDrop} onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView fitViewOptions={{ padding: 0.2 }}
            snapToGrid snapGrid={[20, 20]}
            proOptions={proOptions}
            deleteKeyCode={['Delete', 'Backspace']}
            connectionLineType="smoothstep"
          >
            <Controls position="bottom-right" className="flow-controls" />
            <MiniMap position="bottom-right" style={{ marginBottom: 50 }}
              maskColor="rgba(0,0,0,0.08)" className="flow-minimap"
            />
            <Background variant="dots" gap={20} size={1} color="#d1d5db" />
            <Panel position="top-right" className="canvas-panel">
              <div className="canvas-badge"><span className="canvas-badge-dot active"></span>{mapMeta?.name}</div>
            </Panel>
            {nodes.length === 0 && (
              <Panel position="center">
                <div className="drop-hint">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.3 }}>
                    <path d="M12 5v14M5 12l7-7 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <p>Drag devices from the inventory panel to start mapping</p>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>
      </div>

      {pickerStep?.step === 'source' && (
        <InterfacePicker
          title={`${pickerStep.sourceNode.data.label} — Select Source Interface`}
          interfaces={pickerStep.sourceInterfaces}
          onSelect={handleSourceIfaceSelect}
          onClose={cancelPicker}
        />
      )}
      {pickerStep?.step === 'target' && (
        <InterfacePicker
          title={`${pickerStep.targetNode.data.label} — Select Target Interface`}
          interfaces={pickerStep.targetInterfaces}
          onSelect={handleTargetIfaceSelect}
          onClose={cancelPicker}
        />
      )}
    </div>
  );
}
