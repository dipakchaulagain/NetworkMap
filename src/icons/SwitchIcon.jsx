const SwitchIcon = ({ size = 48, color = '#4a5568' }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Top row - left arrow */}
        <line x1="4" y1="14" x2="20" y2="14" stroke={color} strokeWidth="2.5" />
        <polyline points="15,10 20,14 15,18" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* Top row - right arrow */}
        <line x1="28" y1="14" x2="44" y2="14" stroke={color} strokeWidth="2.5" />
        <polyline points="33,10 28,14 33,18" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* Bottom row - left arrow */}
        <line x1="4" y1="34" x2="20" y2="34" stroke={color} strokeWidth="2.5" />
        <polyline points="15,30 20,34 15,38" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* Bottom row - right arrow */}
        <line x1="28" y1="34" x2="44" y2="34" stroke={color} strokeWidth="2.5" />
        <polyline points="33,30 28,34 33,38" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* Center vertical connections */}
        <line x1="24" y1="14" x2="24" y2="34" stroke={color} strokeWidth="2.5" />
    </svg>
);

export default SwitchIcon;
