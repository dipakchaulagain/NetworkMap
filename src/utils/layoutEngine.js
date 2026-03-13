import dagre from 'dagre';

const NODE_WIDTH = 140;
const NODE_HEIGHT = 100;
const GROUP_PADDING = 60;

export function getLayoutedElements(nodes, edges, direction = 'TB') {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({
        rankdir: direction,
        nodesep: 80,
        ranksep: 100,
        edgesep: 40,
        marginx: 40,
        marginy: 40,
    });

    // Separate group nodes and device nodes
    const groupNodes = nodes.filter(n => n.type === 'group');
    const deviceNodes = nodes.filter(n => n.type !== 'group');

    // Add device nodes to dagre
    deviceNodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    });

    // Add edges to dagre
    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    // Position the device nodes
    const layoutedDeviceNodes = deviceNodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
            ...node,
            position: {
                x: nodeWithPosition.x - NODE_WIDTH / 2,
                y: nodeWithPosition.y - NODE_HEIGHT / 2,
            },
        };
    });

    // For each group node, find the bounding box of its children
    const layoutedGroupNodes = groupNodes.map((group) => {
        const children = layoutedDeviceNodes.filter(n => n.parentId === group.id);
        if (children.length === 0) {
            return { ...group, position: group.position || { x: 0, y: 0 } };
        }

        const minX = Math.min(...children.map(c => c.position.x));
        const minY = Math.min(...children.map(c => c.position.y));
        const maxX = Math.max(...children.map(c => c.position.x + NODE_WIDTH));
        const maxY = Math.max(...children.map(c => c.position.y + NODE_HEIGHT));

        return {
            ...group,
            position: { x: minX - GROUP_PADDING, y: minY - GROUP_PADDING },
            style: {
                ...group.style,
                width: maxX - minX + GROUP_PADDING * 2,
                height: maxY - minY + GROUP_PADDING * 2,
            },
        };
    });

    // Adjust children positions relative to their group
    const finalDeviceNodes = layoutedDeviceNodes.map((node) => {
        if (node.parentId) {
            const parent = layoutedGroupNodes.find(g => g.id === node.parentId);
            if (parent) {
                return {
                    ...node,
                    position: {
                        x: node.position.x - parent.position.x,
                        y: node.position.y - parent.position.y,
                    },
                };
            }
        }
        return node;
    });

    return {
        nodes: [...layoutedGroupNodes, ...finalDeviceNodes],
        edges,
    };
}
