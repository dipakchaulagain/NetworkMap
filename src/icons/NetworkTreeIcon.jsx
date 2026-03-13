const NetworkTreeIcon = ({ size = 48, color = '#4a5568' }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Top node */}
        <rect x="18" y="4" width="12" height="10" rx="2" stroke={color} strokeWidth="2.5" fill="none" />
        {/* Vertical line from top to branch */}
        <line x1="24" y1="14" x2="24" y2="22" stroke={color} strokeWidth="2.5" />
        {/* Horizontal branch */}
        <line x1="10" y1="22" x2="38" y2="22" stroke={color} strokeWidth="2.5" />
        {/* Left branch down */}
        <line x1="10" y1="22" x2="10" y2="30" stroke={color} strokeWidth="2.5" />
        {/* Right branch down */}
        <line x1="38" y1="22" x2="38" y2="30" stroke={color} strokeWidth="2.5" />
        {/* Bottom left node */}
        <rect x="4" y="30" width="12" height="10" rx="2" stroke={color} strokeWidth="2.5" fill="none" />
        {/* Bottom right node */}
        <rect x="32" y="30" width="12" height="10" rx="2" stroke={color} strokeWidth="2.5" fill="none" />
    </svg>
);

export default NetworkTreeIcon;
