import snmp from 'net-snmp';

const IF_TABLE_OID = '1.3.6.1.2.1.2.2.1';
const SYS_DESCR_OID = '1.3.6.1.2.1.1.1.0';
const SYS_UPTIME_OID = '1.3.6.1.2.1.1.3.0';
const SYS_NAME_OID = '1.3.6.1.2.1.1.5.0';

const IF_DESCR_OID = '1.3.6.1.2.1.2.2.1.2';
const IF_SPEED_OID = '1.3.6.1.2.1.2.2.1.5';
const IF_OPER_STATUS_OID = '1.3.6.1.2.1.2.2.1.8';
const IF_ADMIN_STATUS_OID = '1.3.6.1.2.1.2.2.1.7';
const IF_TYPE_OID = '1.3.6.1.2.1.2.2.1.3';

function createSession(ip, community, version) {
  const ver = version === 'v2c' ? snmp.Version2c : snmp.Version1;
  return snmp.createSession(ip, community, { version: ver, timeout: 5000, retries: 1 });
}

function oidToIfIndex(oid, baseOid) {
  return oid.replace(baseOid + '.', '');
}

export async function pollDevice(ip, community, version = 'v2c') {
  return new Promise((resolve) => {
    const session = createSession(ip, community, version);
    const result = { reachable: false, sysDescr: '', sysName: '', uptime: 0, interfaces: [] };

    const scalarOids = [SYS_DESCR_OID, SYS_UPTIME_OID, SYS_NAME_OID];

    session.get(scalarOids, (err, varbinds) => {
      if (err) {
        session.close();
        resolve(result);
        return;
      }

      result.reachable = true;
      varbinds.forEach((vb) => {
        if (snmp.isVarbindError(vb)) return;
        if (vb.oid === SYS_DESCR_OID) result.sysDescr = vb.value.toString();
        if (vb.oid === SYS_UPTIME_OID) result.uptime = vb.value;
        if (vb.oid === SYS_NAME_OID) result.sysName = vb.value.toString();
      });

      const ifDescrMap = {};
      const ifSpeedMap = {};
      const ifOperMap = {};
      const ifAdminMap = {};
      const ifTypeMap = {};

      const subtables = [
        { oid: IF_DESCR_OID, map: ifDescrMap },
        { oid: IF_SPEED_OID, map: ifSpeedMap },
        { oid: IF_OPER_STATUS_OID, map: ifOperMap },
        { oid: IF_ADMIN_STATUS_OID, map: ifAdminMap },
        { oid: IF_TYPE_OID, map: ifTypeMap },
      ];

      let pending = subtables.length;

      if (pending === 0) {
        session.close();
        resolve(result);
        return;
      }

      subtables.forEach(({ oid, map }) => {
        session.subtree(oid, 20, (vbs) => {
          vbs.forEach((vb) => {
            if (!snmp.isVarbindError(vb)) {
              const idx = oidToIfIndex(vb.oid, oid);
              map[idx] = vb.value;
            }
          });
        }, (err2) => {
          pending--;
          if (pending === 0) {
            const ifIndexes = Object.keys(ifDescrMap);
            result.interfaces = ifIndexes.map((idx) => ({
              index: parseInt(idx),
              name: ifDescrMap[idx]?.toString() || `if${idx}`,
              speed: ifSpeedMap[idx] || 0,
              operStatus: ifOperMap[idx] === 1 ? 'up' : 'down',
              adminStatus: ifAdminMap[idx] === 1 ? 'up' : 'down',
              type: ifTypeMap[idx],
            }));
            session.close();
            resolve(result);
          }
        });
      });
    });
  });
}
