import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CloudIcon, RouterIcon, SwitchIcon, FirewallIcon, ServerIcon, NetworkTreeIcon } from '../icons';

const iconComponents = {
    cloud: CloudIcon,
    router: RouterIcon,
    switch: SwitchIcon,
    firewall: FirewallIcon,
    server: ServerIcon,
    network: NetworkTreeIcon,
};

const DeviceNode = ({ data, selected }) => {
    const IconComponent = iconComponents[data.deviceType] || CloudIcon;

    return (
        <div className={`device-node ${selected ? 'selected' : ''}`}>
            <Handle id="top" type="target" position={Position.Top} className="node-handle" />
            <Handle id="left" type="target" position={Position.Left} className="node-handle" />
            <div className="device-node-icon">
                <IconComponent size={48} />
            </div>
            <div className="device-node-label">{data.label}</div>
            <Handle id="bottom" type="source" position={Position.Bottom} className="node-handle" />
            <Handle id="right" type="source" position={Position.Right} className="node-handle" />
        </div>
    );
};

export default memo(DeviceNode);
