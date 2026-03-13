const RouterIcon = ({ size = 48, color = '#4a5568' }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Center circle */}
        <circle cx="24" cy="24" r="6" stroke={color} strokeWidth="2.5" fill="none" />
        {/* Top arrow */}
        <line x1="24" y1="18" x2="24" y2="4" stroke={color} strokeWidth="2.5" />
        <polyline points="19,9 24,4 29,9" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* Bottom arrow */}
        <line x1="24" y1="30" x2="24" y2="44" stroke={color} strokeWidth="2.5" />
        <polyline points="19,39 24,44 29,39" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* Left arrow */}
        <line x1="18" y1="24" x2="4" y2="24" stroke={color} strokeWidth="2.5" />
        <polyline points="9,19 4,24 9,29" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* Right arrow */}
        <line x1="30" y1="24" x2="44" y2="24" stroke={color} strokeWidth="2.5" />
        <polyline points="39,19 44,24 39,29" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export default RouterIcon;
