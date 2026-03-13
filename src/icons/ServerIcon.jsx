const ServerIcon = ({ size = 48, color = '#3182ce' }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Top server unit */}
        <rect x="8" y="6" width="32" height="14" rx="3" stroke={color} strokeWidth="2.5" fill="none" />
        <circle cx="14" cy="13" r="2" fill={color} />
        <line x1="20" y1="13" x2="36" y2="13" stroke={color} strokeWidth="2" strokeLinecap="round" />
        {/* Bottom server unit */}
        <rect x="8" y="28" width="32" height="14" rx="3" stroke={color} strokeWidth="2.5" fill="none" />
        <circle cx="14" cy="35" r="2" fill={color} />
        <line x1="20" y1="35" x2="36" y2="35" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
);

export default ServerIcon;
