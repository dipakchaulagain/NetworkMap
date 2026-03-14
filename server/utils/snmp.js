import snmp from 'net-snmp';

const SYS_DESCR_OID    = '1.3.6.1.2.1.1.1.0';
const SYS_OBJECT_ID    = '1.3.6.1.2.1.1.2.0';
const SYS_UPTIME_OID   = '1.3.6.1.2.1.1.3.0';
const SYS_CONTACT_OID  = '1.3.6.1.2.1.1.4.0';
const SYS_NAME_OID     = '1.3.6.1.2.1.1.5.0';
const SYS_LOCATION_OID = '1.3.6.1.2.1.1.6.0';
const SYS_SERVICES_OID = '1.3.6.1.2.1.1.7.0';

const IF_DESCR_OID        = '1.3.6.1.2.1.2.2.1.2';
const IF_TYPE_OID         = '1.3.6.1.2.1.2.2.1.3';
const IF_MTU_OID          = '1.3.6.1.2.1.2.2.1.4';
const IF_SPEED_OID        = '1.3.6.1.2.1.2.2.1.5';
const IF_PHYS_ADDR_OID    = '1.3.6.1.2.1.2.2.1.6';
const IF_ADMIN_STATUS_OID = '1.3.6.1.2.1.2.2.1.7';
const IF_OPER_STATUS_OID  = '1.3.6.1.2.1.2.2.1.8';
const IF_IN_OCTETS_OID    = '1.3.6.1.2.1.2.2.1.10';
const IF_OUT_OCTETS_OID   = '1.3.6.1.2.1.2.2.1.16';
const IF_ALIAS_OID        = '1.3.6.1.2.1.31.1.1.1.18';
const IF_HIGH_SPEED_OID   = '1.3.6.1.2.1.31.1.1.1.15';
const IF_NAME_OID         = '1.3.6.1.2.1.31.1.1.1.1';

const ENTERPRISE_PREFIXES = {
  '1.3.6.1.4.1.9':    { vendor: 'Cisco',    model: '' },
  '1.3.6.1.4.1.2636': { vendor: 'Juniper',  model: '' },
  '1.3.6.1.4.1.11':   { vendor: 'HP',       model: '' },
  '1.3.6.1.4.1.2021': { vendor: 'Net-SNMP', model: '' },
  '1.3.6.1.4.1.14988':{ vendor: 'MikroTik', model: '' },
  '1.3.6.1.4.1.2011': { vendor: 'Huawei',   model: '' },
  '1.3.6.1.4.1.30065':{ vendor: 'Arista',   model: '' },
  '1.3.6.1.4.1.674':  { vendor: 'Dell',     model: '' },
  '1.3.6.1.4.1.3955': { vendor: 'TP-Link',  model: '' },
  '1.3.6.1.4.1.4526': { vendor: 'Netgear',  model: '' },
  '1.3.6.1.4.1.8072': { vendor: 'Net-SNMP (Linux)', model: '' },
  '1.3.6.1.4.1.1916': { vendor: 'Extreme Networks', model: '' },
  '1.3.6.1.4.1.6876': { vendor: 'VMware',   model: '' },
  '1.3.6.1.4.1.232':  { vendor: 'HPE (Proliant)', model: '' },
  '1.3.6.1.4.1.25506':{ vendor: 'H3C',      model: '' },
  '1.3.6.1.4.1.18928':{ vendor: 'Ubiquiti', model: '' },
  '1.3.6.1.4.1.4413': { vendor: 'Allied Telesis', model: '' },
  '1.3.6.1.4.1.1991': { vendor: 'Foundry/Brocade', model: '' },
  '1.3.6.1.4.1.6527': { vendor: 'Alcatel-Lucent', model: '' },
  '1.3.6.1.4.1.3076': { vendor: 'Alteon/Radware', model: '' },
  '1.3.6.1.4.1.2272': { vendor: 'Nortel',   model: '' },
  '1.3.6.1.4.1.89':   { vendor: 'RAD',      model: '' },
};

function detectVendorFromSysDescr(sysDescr) {
  const d = sysDescr.toLowerCase();
  if (d.includes('cisco'))          return 'Cisco';
  if (d.includes('juniper'))        return 'Juniper';
  if (d.includes('huawei'))         return 'Huawei';
  if (d.includes('mikrotik'))       return 'MikroTik';
  if (d.includes('routeros'))       return 'MikroTik';
  if (d.includes('arista'))         return 'Arista';
  if (d.includes('eos'))            return 'Arista';
  if (d.includes('hp ') || d.includes('hewlett'))  return 'HP';
  if (d.includes('procurve'))       return 'HP';
  if (d.includes('dell'))           return 'Dell';
  if (d.includes('tp-link') || d.includes('tplink')) return 'TP-Link';
  if (d.includes('netgear'))        return 'Netgear';
  if (d.includes('ubiquiti') || d.includes('unifi')) return 'Ubiquiti';
  if (d.includes('extreme'))        return 'Extreme Networks';
  if (d.includes('foundry') || d.includes('brocade')) return 'Brocade/Foundry';
  if (d.includes('alcatel'))        return 'Alcatel-Lucent';
  if (d.includes('vmware'))         return 'VMware';
  if (d.includes('linux'))          return 'Linux';
  if (d.includes('windows'))        return 'Windows';
  if (d.includes('freebsd'))        return 'FreeBSD';
  return '';
}

function detectVendorFromOID(sysObjectID) {
  if (!sysObjectID) return '';
  for (const [prefix, info] of Object.entries(ENTERPRISE_PREFIXES)) {
    if (sysObjectID.startsWith(prefix)) return info.vendor;
  }
  return '';
}

function macBytesToString(bytes) {
  if (!bytes || !bytes.length) return '';
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join(':');
}

function ifTypeToString(type) {
  const types = {
    1: 'other', 6: 'ethernetCsmacd', 24: 'softwareLoopback',
    131: 'tunnel', 161: 'ieee8023adLag', 53: 'propVirtual',
    166: 'mpls', 150: 'mplsTunnel', 135: 'l2vlan',
  };
  return types[type] || `type-${type}`;
}

function ifTypeCategory(type) {
  if (type === 6)   return 'ethernet';
  if (type === 161) return 'lag';
  if (type === 24)  return 'loopback';
  if (type === 131) return 'tunnel';
  if (type === 53)  return 'virtual';
  if (type >= 200)  return 'fiber';
  if (type === 1)   return 'other';
  return 'other';
}

function createSession(ip, community, version) {
  const ver = version === 'v2c' ? snmp.Version2c : snmp.Version1;
  return snmp.createSession(ip, community, { version: ver, timeout: 5000, retries: 1 });
}

function oidToIndex(oid, baseOid) {
  return oid.replace(baseOid + '.', '');
}

export async function pollDevice(ip, community, version = 'v2c') {
  return new Promise((resolve) => {
    const session = createSession(ip, community, version);
    const result = {
      reachable: false,
      sysDescr: '', sysObjectID: '', sysName: '',
      sysContact: '', sysLocation: '', sysServices: 0,
      uptime: 0, vendor: '', interfaces: [],
    };

    const scalarOids = [
      SYS_DESCR_OID, SYS_OBJECT_ID, SYS_UPTIME_OID,
      SYS_CONTACT_OID, SYS_NAME_OID, SYS_LOCATION_OID, SYS_SERVICES_OID,
    ];

    session.get(scalarOids, (err, varbinds) => {
      if (err) {
        session.close();
        resolve(result);
        return;
      }

      result.reachable = true;
      varbinds.forEach((vb) => {
        if (snmp.isVarbindError(vb)) return;
        if (vb.oid === SYS_DESCR_OID)    result.sysDescr    = vb.value.toString();
        if (vb.oid === SYS_OBJECT_ID)    result.sysObjectID = vb.value.toString ? vb.value.toString() : String(vb.value);
        if (vb.oid === SYS_UPTIME_OID)   result.uptime      = vb.value;
        if (vb.oid === SYS_CONTACT_OID)  result.sysContact  = vb.value.toString();
        if (vb.oid === SYS_NAME_OID)     result.sysName     = vb.value.toString();
        if (vb.oid === SYS_LOCATION_OID) result.sysLocation = vb.value.toString();
        if (vb.oid === SYS_SERVICES_OID) result.sysServices = vb.value;
      });

      const vendorFromOID    = detectVendorFromOID(result.sysObjectID);
      const vendorFromDescr  = detectVendorFromSysDescr(result.sysDescr);
      result.vendor = vendorFromOID || vendorFromDescr;

      const maps = {
        descr:       {}, type: {}, mtu:        {}, speed:  {},
        physAddr:    {}, admin: {}, oper:       {}, inOct:  {},
        outOct:      {}, alias: {}, highSpeed:  {}, ifName: {},
      };

      const subtables = [
        { oid: IF_DESCR_OID,        map: maps.descr },
        { oid: IF_TYPE_OID,         map: maps.type },
        { oid: IF_MTU_OID,          map: maps.mtu },
        { oid: IF_SPEED_OID,        map: maps.speed },
        { oid: IF_PHYS_ADDR_OID,    map: maps.physAddr },
        { oid: IF_ADMIN_STATUS_OID, map: maps.admin },
        { oid: IF_OPER_STATUS_OID,  map: maps.oper },
        { oid: IF_IN_OCTETS_OID,    map: maps.inOct },
        { oid: IF_OUT_OCTETS_OID,   map: maps.outOct },
        { oid: IF_ALIAS_OID,        map: maps.alias },
        { oid: IF_HIGH_SPEED_OID,   map: maps.highSpeed },
        { oid: IF_NAME_OID,         map: maps.ifName },
      ];

      let pending = subtables.length;

      subtables.forEach(({ oid, map }) => {
        session.subtree(oid, 20, (vbs) => {
          vbs.forEach((vb) => {
            if (!snmp.isVarbindError(vb)) {
              const idx = oidToIndex(vb.oid, oid);
              map[idx] = vb.value;
            }
          });
        }, () => {
          pending--;
          if (pending === 0) {
            const indexes = Object.keys(maps.descr);
            result.interfaces = indexes.map((idx) => {
              const typeNum    = maps.type[idx] || 0;
              const speedBps   = maps.speed[idx] || 0;
              const highSpeedMbps = maps.highSpeed[idx] || 0;
              const effectiveSpeedMbps = highSpeedMbps > 0 ? highSpeedMbps : Math.round(speedBps / 1e6);
              const mac = maps.physAddr[idx];
              return {
                index:       parseInt(idx),
                name:        maps.ifName[idx]?.toString() || maps.descr[idx]?.toString() || `if${idx}`,
                description: maps.descr[idx]?.toString() || '',
                alias:       maps.alias[idx]?.toString() || '',
                speed:       speedBps,
                speedMbps:   effectiveSpeedMbps,
                mtu:         maps.mtu[idx] || 0,
                physAddr:    mac ? macBytesToString(mac) : '',
                operStatus:  maps.oper[idx]  === 1 ? 'up' : 'down',
                adminStatus: maps.admin[idx] === 1 ? 'up' : 'down',
                typeNum,
                type:        ifTypeCategory(typeNum),
                typeLabel:   ifTypeString(typeNum),
                inOctets:    maps.inOct[idx]  || 0,
                outOctets:   maps.outOct[idx] || 0,
              };
            }).sort((a, b) => a.index - b.index);
            session.close();
            resolve(result);
          }
        });
      });
    });
  });
}

function ifTypeString(type) {
  const types = {
    1: 'other', 6: 'ethernetCsmacd', 24: 'softwareLoopback',
    131: 'tunnel', 161: 'ieee8023adLag', 53: 'propVirtual',
    166: 'mpls', 150: 'mplsTunnel', 135: 'l2vlan',
    54: 'propMultiplexor', 161: 'ieee8023adLag',
  };
  return types[type] || `ifType(${type})`;
}
