import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readData, writeData } from '../utils/storage.js';
import { authenticate } from '../middleware/auth.js';
import { pollDevice } from '../utils/snmp.js';

const router = Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const devices = readData('devices.json');
  res.json(devices);
});

router.post('/', async (req, res) => {
  const { name, type, category, ip, community, snmpVersion, interfaces, location, description } = req.body;
  if (!name || !type) return res.status(400).json({ message: 'Name and type required' });

  const devices = readData('devices.json');
  const device = {
    id: uuidv4(),
    name,
    type,
    category: category || (ip ? 'snmp' : 'custom'),
    ip: ip || '',
    community: community || 'public',
    snmpVersion: snmpVersion || 'v2c',
    interfaces: interfaces || [],
    location: location || '',
    description: description || '',
    status: 'unknown',
    lastPolled: null,
    sysDescr: '',
    sysName: '',
    uptime: 0,
    createdAt: new Date().toISOString(),
  };

  devices.push(device);
  writeData('devices.json', devices);
  res.status(201).json(device);
});

router.put('/:id', async (req, res) => {
  const devices = readData('devices.json');
  const idx = devices.findIndex((d) => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Device not found' });

  devices[idx] = { ...devices[idx], ...req.body, id: devices[idx].id, createdAt: devices[idx].createdAt };
  writeData('devices.json', devices);
  res.json(devices[idx]);
});

router.delete('/:id', (req, res) => {
  const devices = readData('devices.json');
  const filtered = devices.filter((d) => d.id !== req.params.id);
  if (filtered.length === devices.length) return res.status(404).json({ message: 'Device not found' });
  writeData('devices.json', filtered);
  res.json({ message: 'Device deleted' });
});

router.post('/:id/poll', async (req, res) => {
  const devices = readData('devices.json');
  const idx = devices.findIndex((d) => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Device not found' });

  const device = devices[idx];
  if (device.category !== 'snmp' || !device.ip) {
    return res.status(400).json({ message: 'Device is not an SNMP device' });
  }

  try {
    const result = await pollDevice(device.ip, device.community, device.snmpVersion);
    devices[idx].status = result.reachable ? 'up' : 'down';
    devices[idx].lastPolled = new Date().toISOString();
    devices[idx].sysDescr = result.sysDescr;
    devices[idx].sysName = result.sysName;
    devices[idx].uptime = result.uptime;
    if (result.reachable && result.interfaces.length > 0) {
      devices[idx].interfaces = result.interfaces.map((iface) => ({
        index: iface.index,
        name: iface.name,
        speed: iface.speed,
        operStatus: iface.operStatus,
        adminStatus: iface.adminStatus,
        type: iface.type <= 6 ? 'copper' : 'fiber',
      }));
    }
    writeData('devices.json', devices);
    res.json(devices[idx]);
  } catch (err) {
    devices[idx].status = 'down';
    devices[idx].lastPolled = new Date().toISOString();
    writeData('devices.json', devices);
    res.json(devices[idx]);
  }
});

router.post('/poll-all', async (req, res) => {
  const devices = readData('devices.json');
  const snmpDevices = devices.filter((d) => d.category === 'snmp' && d.ip);

  const results = await Promise.allSettled(
    snmpDevices.map(async (device) => {
      const idx = devices.findIndex((d) => d.id === device.id);
      const result = await pollDevice(device.ip, device.community, device.snmpVersion);
      devices[idx].status = result.reachable ? 'up' : 'down';
      devices[idx].lastPolled = new Date().toISOString();
      devices[idx].sysDescr = result.sysDescr;
      devices[idx].sysName = result.sysName;
      devices[idx].uptime = result.uptime;
      if (result.reachable && result.interfaces.length > 0) {
        devices[idx].interfaces = result.interfaces.map((iface) => ({
          index: iface.index,
          name: iface.name,
          speed: iface.speed,
          operStatus: iface.operStatus,
          adminStatus: iface.adminStatus,
          type: iface.type <= 6 ? 'copper' : 'fiber',
        }));
      }
    })
  );

  writeData('devices.json', devices);
  res.json({ polled: snmpDevices.length, devices: devices.filter((d) => d.category === 'snmp') });
});

export default router;
