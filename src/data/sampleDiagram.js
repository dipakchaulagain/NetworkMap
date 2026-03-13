import { getLayoutedElements } from '../utils/layoutEngine';

const initialNodes = [
    // Group container
    {
        id: 'group-datalaya',
        type: 'group',
        position: { x: 0, y: 0 },
        data: { label: 'DATALAYA' },
        style: { width: 900, height: 800 },
    },
    // Layer 1: External
    {
        id: 'internet',
        type: 'device',
        data: { label: 'Internet', deviceType: 'cloud' },
        position: { x: 0, y: 0 },
        parentId: 'group-datalaya',
    },
    // Layer 1.5: ISP Network
    {
        id: 'dmn-isp-nw',
        type: 'device',
        data: { label: 'DMN-ISP-NW', deviceType: 'network' },
        position: { x: 0, y: 0 },
        parentId: 'group-datalaya',
    },
    // Layer 2: Access/Edge
    {
        id: 'bng',
        type: 'device',
        data: { label: 'BNG', deviceType: 'router' },
        position: { x: 0, y: 0 },
        parentId: 'group-datalaya',
    },
    // Layer 3: Security
    {
        id: 'dmn-pa-sec',
        type: 'device',
        data: { label: 'DMN-PA-SEC', deviceType: 'firewall' },
        position: { x: 0, y: 0 },
        parentId: 'group-datalaya',
    },
    {
        id: 'dmn-pa-pri',
        type: 'device',
        data: { label: 'DMN-PA-PRI', deviceType: 'firewall' },
        position: { x: 0, y: 0 },
        parentId: 'group-datalaya',
    },
    // Layer 4: Aggregation
    {
        id: 'bhi-agg-rtr',
        type: 'device',
        data: { label: 'BHI-AGG-RTR', deviceType: 'switch' },
        position: { x: 0, y: 0 },
        parentId: 'group-datalaya',
    },
    {
        id: 'dmn-agg-sw',
        type: 'device',
        data: { label: 'DMN-AGG-SW-01', deviceType: 'switch' },
        position: { x: 0, y: 0 },
        parentId: 'group-datalaya',
    },
    // Layer 5: Routing/Switching
    {
        id: 'dtly-rtr-01',
        type: 'device',
        data: { label: 'Dtly-RTR-01', deviceType: 'router' },
        position: { x: 0, y: 0 },
        parentId: 'group-datalaya',
    },
    {
        id: 'dc-2-sw',
        type: 'device',
        data: { label: 'DC-2-SW', deviceType: 'switch' },
        position: { x: 0, y: 0 },
        parentId: 'group-datalaya',
    },
    // Layer 6: Compute
    {
        id: 'nutanix-cluster',
        type: 'device',
        data: { label: 'Datalaya-Nutanix-Cluster', deviceType: 'server' },
        position: { x: 0, y: 0 },
        parentId: 'group-datalaya',
    },
];

const initialEdges = [
    // Internet → BNG (left of center) and Internet → DMN-ISP-NW (right of center)
    { id: 'e-internet-bng', source: 'internet', target: 'bng', type: 'draggable',
      data: { sourceAnchor: { side: 'bottom', offset: 0.65 }, targetAnchor: { side: 'top', offset: 0.5 } } },
    { id: 'e-internet-isp', source: 'internet', target: 'dmn-isp-nw', type: 'draggable',
      data: { sourceAnchor: { side: 'bottom', offset: 0.35 }, targetAnchor: { side: 'top', offset: 0.5 } } },

    // BNG → two firewalls (spread on bottom)
    { id: 'e-bng-sec', source: 'bng', target: 'dmn-pa-sec', type: 'draggable',
      data: { sourceAnchor: { side: 'bottom', offset: 0.35 }, targetAnchor: { side: 'top', offset: 0.5 } } },
    { id: 'e-bng-pri', source: 'bng', target: 'dmn-pa-pri', type: 'draggable',
      data: { sourceAnchor: { side: 'bottom', offset: 0.65 }, targetAnchor: { side: 'top', offset: 0.5 } } },

    // Firewalls → aggregation (1:1)
    { id: 'e-sec-agg', source: 'dmn-pa-sec', target: 'bhi-agg-rtr', type: 'draggable',
      data: { sourceAnchor: { side: 'bottom', offset: 0.5 }, targetAnchor: { side: 'top', offset: 0.5 } } },
    { id: 'e-pri-agg', source: 'dmn-pa-pri', target: 'dmn-agg-sw', type: 'draggable',
      data: { sourceAnchor: { side: 'bottom', offset: 0.5 }, targetAnchor: { side: 'top', offset: 0.5 } } },

    // Aggregation → routing (1:1)
    { id: 'e-agg-rtr', source: 'bhi-agg-rtr', target: 'dtly-rtr-01', type: 'draggable',
      data: { sourceAnchor: { side: 'bottom', offset: 0.5 }, targetAnchor: { side: 'top', offset: 0.5 } } },
    { id: 'e-agg-sw', source: 'dmn-agg-sw', target: 'dc-2-sw', type: 'draggable',
      data: { sourceAnchor: { side: 'bottom', offset: 0.5 }, targetAnchor: { side: 'top', offset: 0.5 } } },

    // Routing → Nutanix (two links, spread on target top)
    { id: 'e-rtr-nutanix', source: 'dtly-rtr-01', target: 'nutanix-cluster', type: 'draggable',
      data: { sourceAnchor: { side: 'bottom', offset: 0.5 }, targetAnchor: { side: 'top', offset: 0.35 } } },
    { id: 'e-sw-nutanix', source: 'dc-2-sw', target: 'nutanix-cluster', type: 'draggable',
      data: { sourceAnchor: { side: 'bottom', offset: 0.5 }, targetAnchor: { side: 'top', offset: 0.65 } } },
];

// Apply auto-layout
const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
    initialNodes,
    initialEdges
);

export { layoutedNodes as sampleNodes, layoutedEdges as sampleEdges };
