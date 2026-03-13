export { default as CloudIcon } from './CloudIcon';
export { default as RouterIcon } from './RouterIcon';
export { default as SwitchIcon } from './SwitchIcon';
export { default as FirewallIcon } from './FirewallIcon';
export { default as ServerIcon } from './ServerIcon';
export { default as NetworkTreeIcon } from './NetworkTreeIcon';

export const iconMap = {
    cloud: 'CloudIcon',
    router: 'RouterIcon',
    switch: 'SwitchIcon',
    firewall: 'FirewallIcon',
    server: 'ServerIcon',
    network: 'NetworkTreeIcon',
};

export const deviceTypes = [
    { type: 'cloud', label: 'Internet / Cloud', description: 'External network' },
    { type: 'router', label: 'Router', description: 'L3 routing device' },
    { type: 'switch', label: 'Switch', description: 'L2 switching fabric' },
    { type: 'firewall', label: 'Firewall', description: 'Security boundary' },
    { type: 'server', label: 'Server / Cluster', description: 'Compute infrastructure' },
    { type: 'network', label: 'Network', description: 'Network topology' },
];
