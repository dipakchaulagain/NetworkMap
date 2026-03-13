const FirewallIcon = ({ size = 48, color = '#e53e3e' }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M24 4L6 14v10c0 11.1 7.7 21.5 18 24 10.3-2.5 18-12.9 18-24V14L24 4z"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
        />
    </svg>
);

export default FirewallIcon;
