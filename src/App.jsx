import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import DeviceNode from './nodes/DeviceNode';
import GroupNode from './nodes/GroupNode';
import DraggableEdge from './edges/DraggableEdge';
import Toolbar from './components/Toolbar';
import { sampleNodes, sampleEdges } from './data/sampleDiagram';
import { getLayoutedElements } from './utils/layoutEngine';
import './App.css';

const nodeTypes = {
  device: DeviceNode,
  group: GroupNode,
};

const edgeTypes = {
  draggable: DraggableEdge,
};

const defaultEdgeOptions = {
  type: 'draggable',
  animated: false,
  data: {
    sourceAnchor: { side: 'bottom', offset: 0.5 },
    targetAnchor: { side: 'top', offset: 0.5 },
  },
};

const STORAGE_KEY = 'networkmap-diagram';

function loadSavedDiagram() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      if (data.nodes?.length > 0) return data;
    }
  } catch (e) {
    console.warn('Failed to load saved diagram:', e);
  }
  return null;
}

let nodeIdCounter = 100;
const getId = () => `node_${nodeIdCounter++}`;
let groupIdCounter = 10;
const getGroupId = () => `group_${groupIdCounter++}`;

function App() {
  const reactFlowWrapper = useRef(null);
  const savedDiagram = useMemo(() => loadSavedDiagram(), []);
  const [nodes, setNodes, onNodesChange] = useNodesState(savedDiagram?.nodes ?? sampleNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(savedDiagram?.edges ?? sampleEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  // Auto-save to localStorage on every change
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges }));
      } catch (e) {
        console.warn('Failed to save diagram:', e);
      }
    }, 300); // debounce 300ms
    return () => clearTimeout(timer);
  }, [nodes, edges]);

  const onConnect = useCallback(
    (params) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'draggable',
            data: {
              sourceAnchor: { side: 'bottom', offset: 0.5 },
              targetAnchor: { side: 'top', offset: 0.5 },
            },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const deviceType = event.dataTransfer.getData('application/reactflow');
      if (!deviceType || !reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: getId(),
        type: 'device',
        position,
        data: {
          label: deviceType.toUpperCase(),
          deviceType,
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const onAutoLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges,
      'TB'
    );
    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
    setTimeout(() => {
      reactFlowInstance?.fitView({ padding: 0.2 });
    }, 50);
  }, [nodes, edges, setNodes, setEdges, reactFlowInstance]);

  const onAddGroup = useCallback(() => {
    const groupId = getGroupId();
    const newGroup = {
      id: groupId,
      type: 'group',
      position: reactFlowInstance
        ? reactFlowInstance.screenToFlowPosition({
          x: window.innerWidth / 2 - 200,
          y: window.innerHeight / 2 - 150,
        })
        : { x: 100, y: 100 },
      data: { label: 'NEW-ENV' },
      style: { width: 500, height: 400 },
    };
    setNodes((nds) => [newGroup, ...nds]);
  }, [reactFlowInstance, setNodes]);

  const onExport = useCallback(() => {
    const data = { nodes, edges };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'networkmap-diagram.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

  const onImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = JSON.parse(evt.target.result);
          if (data.nodes && data.edges) {
            setNodes(data.nodes);
            setEdges(data.edges);
            setTimeout(() => reactFlowInstance?.fitView({ padding: 0.2 }), 50);
          }
        } catch (err) {
          console.error('Import failed:', err);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [setNodes, setEdges, reactFlowInstance]);

  const onClear = useCallback(() => {
    setNodes([]);
    setEdges([]);
    localStorage.removeItem(STORAGE_KEY);
  }, [setNodes, setEdges]);

  const onNodeDoubleClick = useCallback(
    (event, node) => {
      const newLabel = prompt('Enter label:', node.data.label);
      if (newLabel !== null && newLabel.trim()) {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === node.id
              ? { ...n, data: { ...n.data, label: newLabel.trim() } }
              : n
          )
        );
      }
    },
    [setNodes]
  );

  const proOptions = useMemo(() => ({ hideAttribution: true }), []);

  return (
    <div className="app-layout">
      <Toolbar
        onAutoLayout={onAutoLayout}
        onAddGroup={onAddGroup}
        onExport={onExport}
        onImport={onImport}
        onClear={onClear}
      />
      <div className="canvas-container" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeDoubleClick={onNodeDoubleClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          snapToGrid
          snapGrid={[20, 20]}
          proOptions={proOptions}
          deleteKeyCode={['Delete', 'Backspace']}
          connectionLineType="smoothstep"
        >
          <Controls position="bottom-right" className="flow-controls" />
          <MiniMap
            position="bottom-right"
            style={{ marginBottom: 50 }}
            nodeColor={(n) => {
              if (n.type === 'group') return '#f59e0b33';
              if (n.data?.deviceType === 'firewall') return '#e53e3e';
              if (n.data?.deviceType === 'server') return '#3182ce';
              return '#64748b';
            }}
            maskColor="rgba(0, 0, 0, 0.08)"
            className="flow-minimap"
          />
          <Background variant="dots" gap={20} size={1} color="#d1d5db" />
          <Panel position="top-right" className="canvas-panel">
            <div className="canvas-badge">
              <span className="canvas-badge-dot"></span>
              NetworkMap
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}

export default App;
