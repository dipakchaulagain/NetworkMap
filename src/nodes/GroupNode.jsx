import { memo } from 'react';

const GroupNode = ({ data, selected }) => {
    return (
        <div className={`group-node ${selected ? 'selected' : ''}`}>
            <div className="group-node-badge">{data.label}</div>
        </div>
    );
};

export default memo(GroupNode);
