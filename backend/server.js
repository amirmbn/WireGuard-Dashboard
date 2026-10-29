import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyJwt from '@fastify/jwt';
import fastifyCors from '@fastify/cors';
import QRCode from 'qrcode';
import { execSync, execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PANEL_VERSION = 'v4.0.0';
const WG_DIR = '/etc/wireguard';
const configPath = path.join(__dirname, 'panel-config.json');
const peersDbPath = path.join(__dirname, 'peers-db.json');

const fastify = Fastify({ logger: false, bodyLimit: 10 * 1024 * 1024 });

function loadConfig() {

  const defaults = {
    version: PANEL_VERSION,
    appPort: 1000,
    interface: 'int1',
    wgPort: 1080,
    serverIp: '127.0.0.1',
    tunnelIp: '',
    dns: '1.1.1.1, 8.8.8.8',
    mtu: 1280,
    keepalive: 25
  };

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (e) {
    throw new Error(`panel-config.json is missing or invalid (${e.code || e.message}). Run install.sh first.`);
  }

  if (
    !raw || typeof raw !== 'object' ||
    typeof raw.username !== 'string' || !raw.username ||
    typeof raw.passwordHash !== 'string' || !raw.passwordHash ||
    typeof raw.jwtSecret !== 'string' || !raw.jwtSecret
  ) {
    throw new Error('panel-config.json is missing username/passwordHash/jwtSecret.');
  }

  return { ...defaults, ...raw, version: PANEL_VERSION };
}

function saveConfig(cfg) {
  cfg.version = PANEL_VERSION;
  const tmp = `${configPath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2));
  fs.renameSync(tmp, configPath);
}

function loadDb(defaultIface = 'int1') {
  if (!fs.existsSync(peersDbPath)) {
    const init = { interfaces: { [defaultIface]: {} } };
    fs.writeFileSync(peersDbPath, JSON.stringify(init, null, 2));
    return init;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(peersDbPath, 'utf-8'));
    if (parsed && parsed.interfaces && typeof parsed.interfaces === 'object') {
      return parsed;
    }

    const migrated = { interfaces: { [defaultIface]: {} } };
    for (const [k, v] of Object.entries(parsed || {})) {
      if (v && typeof v === 'object' && v.ip) {
        if (!v.privateKey && v.clientConfig) {
          const m = v.clientConfig.match(/PrivateKey\s*=\s*([^\s\r\n]+)/);
          if (m) v.privateKey = m[1].trim();
        }
        migrated.interfaces[defaultIface][k] = v;
      }
    }
    saveDb(migrated);
    return migrated;
  } catch {
    return { interfaces: { [defaultIface]: {} } };
  }
}

function saveDb(db) {
  const tmp = `${peersDbPath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, peersDbPath);
}

let config = loadConfig();

await fastify.register(fastifyCors, { origin: true });
await fastify.register(fastifyJwt, { secret: config.jwtSecret });

const distPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(distPath)) {
  await fastify.register(fastifyStatic, {
    root: distPath,
    prefix: '/',
  });
}

fastify.decorate('authenticate', async function (request, reply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: 'نشست کاربری منقضی شده است. لطفاً مجدداً وارد شوید.' });
  }
});

function isValidIfaceName(name) {
  return typeof name === 'string' && /^[a-zA-Z0-9_-]{1,15}$/.test(name);
}

function isValidIpv4Cidr(cidr) {
  if (!cidr || typeof cidr !== 'string') return false;
  const parts = cidr.trim().split('/');
  if (parts.length !== 2) return false;
  const prefix = Number(parts[1]);
  if (!Number.isInteger(prefix) || prefix < 16 || prefix > 30) return false;
  const octets = parts[0].split('.');
  if (octets.length !== 4) return false;
  return octets.every(o => /^\d+$/.test(o) && Number(o) >= 0 && Number(o) <= 255);
}

function ipToInt(ip) {
  const p = ip.trim().split('.').map(Number);
  if (p.length !== 4 || p.some(n => Number.isNaN(n) || n < 0 || n > 255)) return null;
  return (((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3]) >>> 0;
}

function intToIp(num) {
  return [
    (num >>> 24) & 255,
    (num >>> 16) & 255,
    (num >>> 8) & 255,
    num & 255
  ].join('.');
}

function getNextAvailableIp(ifaceCidr, existingIps) {
  const firstCidr = String(ifaceCidr || '10.20.30.1/24').split(',')[0].trim();
  const [ipStr, maskStr] = firstCidr.split('/');
  const prefix = Number(maskStr) || 24;
  const baseInt = ipToInt(ipStr || '10.20.30.1');
  if (baseInt === null) return '10.20.30.2/32';

  const mask = ((0xffffffff << (32 - prefix)) >>> 0);
  const network = (baseInt & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;

  const used = new Set();
  used.add(ipStr.trim());
  for (const item of existingIps) {
    const clean = String(item || '').split('/')[0].trim();
    if (clean) used.add(clean);
  }

  for (let cur = network + 1; cur < broadcast; cur++) {
    const candidate = intToIp(cur >>> 0);
    if (!used.has(candidate)) {
      return `${candidate}/32`;
    }
  }
  throw new Error('ظرفیت آی‌پی‌های آزاد این اینترفیس تکمیل شده است.');
}

function parseConfFile(iface) {
  const file = path.join(WG_DIR, `${iface}.conf`);
  const info = { address: '', listenPort: '', privateKey: '', publicKey: '' };
  if (!fs.existsSync(file)) return info;
  try {
    const content = fs.readFileSync(file, 'utf-8');
    const addrMatch = content.match(/^\s*Address\s*=\s*(.+)$/m);
    const portMatch = content.match(/^\s*ListenPort\s*=\s*(\d+)/m);
    const privMatch = content.match(/^\s*PrivateKey\s*=\s*(\S+)/m);
    if (addrMatch) info.address = addrMatch[1].trim();
    if (portMatch) info.listenPort = Number(portMatch[1].trim());
    if (privMatch) {
      info.privateKey = privMatch[1].trim();
      try {
        info.publicKey = execSync(`echo "${info.privateKey}" | wg pubkey`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
      } catch {}
    }
  } catch {}
  return info;
}

function isInterfaceUp(iface) {
  if (!isValidIfaceName(iface)) return false;
  if (fs.existsSync(`/sys/class/net/${iface}`)) return true;
  try {
    execSync(`wg show ${iface}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function discoverInterfaces() {
  const set = new Set();
  if (fs.existsSync(WG_DIR)) {
    for (const f of fs.readdirSync(WG_DIR)) {
      if (f.endsWith('.conf')) {
        const name = f.slice(0, -5);
        if (isValidIfaceName(name)) set.add(name);
      }
    }
  }
  if (set.size === 0 && config.interface) {
    set.add(config.interface);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function getWgKernelPeers(iface) {
  const kernelMap = {};
  try {
    const dump = execSync(`wg show ${iface} dump`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const lines = dump.split('\n');
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split('\t');
      if (parts.length < 8) continue;
      const [publicKey, , endpoint, allowedIps, latestHandshake, rxBytes, txBytes] = parts;
      kernelMap[publicKey] = {
        endpoint: endpoint === '(none)' ? '' : endpoint,
        allowedIps,
        latestHandshake: Number(latestHandshake) || 0,
        rx: Number(rxBytes) || 0,
        tx: Number(txBytes) || 0
      };
    }
  } catch {}
  return kernelMap;
}

function buildDynamicClientConfig(iface, peer, cfg, ifaceInfo) {
  let privKey = peer.privateKey || '';
  if (!privKey && peer.clientConfig) {
    const m = peer.clientConfig.match(/PrivateKey\s*=\s*([^\s\r\n]+)/);
    if (m) privKey = m[1].trim();
  }
  if (!privKey) return peer.clientConfig || '';

  let serverPubKey = ifaceInfo.publicKey || '';
  if (!serverPubKey) {
    try {
      serverPubKey = execSync(`wg show ${iface} public-key`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    } catch {}
  }

  const port = ifaceInfo.listenPort || cfg.wgPort || 1080;
  const rawHost = (cfg.tunnelIp && cfg.tunnelIp.trim()) ? cfg.tunnelIp.trim() : cfg.serverIp;

  let endpoint = `${rawHost}:${port}`;
  if (/^[^:]+:\d+$/.test(rawHost)) {
    endpoint = rawHost;
  } else if (rawHost.includes(':') && !rawHost.startsWith('[')) {

    endpoint = `[${rawHost}]:${port}`;
  }

  const dns = cfg.dns || '1.1.1.1, 8.8.8.8';
  const mtuLine = cfg.mtu ? `\nMTU = ${cfg.mtu}` : '';
  const keepalive = cfg.keepalive || 25;

  return `[Interface]
PrivateKey = ${privKey}
Address = ${peer.ip}
DNS = ${dns}${mtuLine}

[Peer]
PublicKey = ${serverPubKey}
Endpoint = ${endpoint}
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = ${keepalive}`;
}

let lastCpuIdle = 0;
let lastCpuTotal = 0;
function getSystemStats() {
  let cpuPercent = 0;
  try {
    const stat = fs.readFileSync('/proc/stat', 'utf-8').split('\n')[0].trim().split(/\s+/).slice(1).map(Number);
    const idle = (stat[3] || 0) + (stat[4] || 0);
    const total = stat.reduce((a, b) => a + b, 0);
    if (lastCpuTotal > 0 && total > lastCpuTotal) {
      cpuPercent = Math.round(((total - lastCpuTotal - (idle - lastCpuIdle)) / (total - lastCpuTotal)) * 100);
    }
    lastCpuIdle = idle;
    lastCpuTotal = total;
  } catch {}

  let totalMem = os.totalmem();
  let usedMem = totalMem - os.freemem();
  try {
    if (fs.existsSync('/proc/meminfo')) {
      const info = fs.readFileSync('/proc/meminfo', 'utf-8');
      const mTotal = info.match(/^MemTotal:\s+(\d+)/m);
      const mAvail = info.match(/^MemAvailable:\s+(\d+)/m);
      if (mTotal && mAvail) {
        totalMem = Number(mTotal[1]) * 1024;
        usedMem = Math.max(0, totalMem - Number(mAvail[1]) * 1024);
      }
    }
  } catch {}
  const memPercent = totalMem > 0 ? Math.round((usedMem / totalMem) * 100) : 0;

  let diskPercent = 0;
  let diskUsed = 0;
  let diskTotal = 0;
  try {
    if (typeof fs.statfsSync === 'function') {
      const s = fs.statfsSync('/');
      diskTotal = s.blocks * s.bsize;
      diskUsed = Math.max(0, diskTotal - s.bavail * s.bsize);
      diskPercent = diskTotal > 0 ? Math.round((diskUsed / diskTotal) * 100) : 0;
    }
  } catch {}

  return {
    cpuPercent: Math.max(0, Math.min(100, cpuPercent)),
    cpuCores: os.cpus().length,
    memUsed: usedMem,
    memTotal: totalMem,
    memPercent,
    diskUsed,
    diskTotal,
    diskPercent
  };
}
getSystemStats();

function syncAllInterfaces() {
  config = loadConfig();
  const db = loadDb(config.interface);
  const ifaceList = discoverInterfaces();
  const now = Date.now();
  let dbChanged = false;

  for (const iface of ifaceList) {
    if (!db.interfaces[iface]) {
      db.interfaces[iface] = {};
      dbChanged = true;
    }
    const ifacePeers = db.interfaces[iface];
    const kernelPeers = isInterfaceUp(iface) ? getWgKernelPeers(iface) : {};
    let wgChanged = false;

    for (const [kPub, kInfo] of Object.entries(kernelPeers)) {
      if (!ifacePeers[kPub]) {
        ifacePeers[kPub] = {
          name: `Peer-${kPub.slice(0, 6)}`,
          ip: kInfo.allowedIps || '10.20.30.2/32',
          privateKey: '',
          enabled: true,
          disabledReason: '',
          totalQuotaBytes: 0,
          accumulatedRx: kInfo.rx,
          accumulatedTx: kInfo.tx,
          lastKernelRx: kInfo.rx,
          lastKernelTx: kInfo.tx,
          latestHandshake: kInfo.latestHandshake,
          endpoint: kInfo.endpoint,
          expireAt: null,
          createdAt: now,
          clientConfig: ''
        };
        dbChanged = true;
      }
    }

    for (const [pubKey, peer] of Object.entries(ifacePeers)) {
      const kPeer = kernelPeers[pubKey];
      if (kPeer) {
        if (kPeer.rx < (peer.lastKernelRx || 0) || kPeer.tx < (peer.lastKernelTx || 0)) {
          peer.accumulatedRx = (peer.accumulatedRx || 0) + kPeer.rx;
          peer.accumulatedTx = (peer.accumulatedTx || 0) + kPeer.tx;
        } else {
          peer.accumulatedRx = (peer.accumulatedRx || 0) + (kPeer.rx - (peer.lastKernelRx || 0));
          peer.accumulatedTx = (peer.accumulatedTx || 0) + (kPeer.tx - (peer.lastKernelTx || 0));
        }
        peer.lastKernelRx = kPeer.rx;
        peer.lastKernelTx = kPeer.tx;
        peer.latestHandshake = kPeer.latestHandshake;
        peer.endpoint = kPeer.endpoint;
        dbChanged = true;
      }

      const totalUsed = (peer.accumulatedRx || 0) + (peer.accumulatedTx || 0);
      const isQuotaExceeded = peer.totalQuotaBytes > 0 && totalUsed >= peer.totalQuotaBytes;
      const isExpired = Boolean(peer.expireAt && now >= peer.expireAt);

      if (peer.enabled && (isQuotaExceeded || isExpired)) {
        peer.enabled = false;
        peer.disabledReason = isQuotaExceeded ? 'اتمام حجم' : 'اتمام تاریخ انقضا';
        peer.lastKernelRx = 0;
        peer.lastKernelTx = 0;
        try {
          execSync(`wg set ${iface} peer ${pubKey} remove`, { stdio: 'ignore' });
          wgChanged = true;
        } catch {}
        dbChanged = true;
      }
    }

    if (wgChanged) {
      try { execSync(`wg-quick save ${iface}`, { stdio: 'ignore' }); } catch {}
    }
  }

  if (dbChanged) saveDb(db);
  return { db, ifaceList };
}

setInterval(() => {
  try { syncAllInterfaces(); } catch {}
}, 20000);

fastify.get('/api/meta', async () => {
  return { version: PANEL_VERSION };
});

fastify.post('/api/login', async (request, reply) => {
  try {
    config = loadConfig();
  } catch (e) {
    console.error(e.message);
    return reply.code(500).send({ error: 'پیکربندی پنل نامعتبر است. لطفاً لاگ سرور را بررسی کنید.' });
  }
  const { username, password } = request.body || {};
  const hashedInput = crypto.createHash('sha256').update(String(password || '')).digest('hex');

  if (username === config.username && hashedInput === config.passwordHash) {
    const token = fastify.jwt.sign({ username }, { expiresIn: '7d' });
    return { token, version: PANEL_VERSION, username: config.username };
  }
  return reply.code(401).send({ error: 'نام کاربری یا رمز عبور اشتباه است.' });
});

fastify.get('/api/peers', { onRequest: [fastify.authenticate] }, async (request) => {
  const { db, ifaceList } = syncAllInterfaces();
  const requestedIface = request.query?.iface;
  const activeIface = (requestedIface && ifaceList.includes(requestedIface))
    ? requestedIface
    : (ifaceList[0] || config.interface || 'int1');

  const interfacesSummary = ifaceList.map(name => {
    const info = parseConfFile(name);
    const pMap = db.interfaces[name] || {};
    const pArr = Object.values(pMap);
    const online = pArr.filter(p => p.enabled && p.latestHandshake > 0 && (Date.now() / 1000 - p.latestHandshake) < 180).length;
    return {
      name,
      active: isInterfaceUp(name),
      address: info.address || '10.20.30.1/24',
      listenPort: info.listenPort || config.wgPort || 1080,
      publicKey: info.publicKey || '',
      peerCount: pArr.length,
      onlineCount: online
    };
  });

  const currentInfo = parseConfFile(activeIface);
  const currentPeersMap = db.interfaces[activeIface] || {};

  const peers = Object.entries(currentPeersMap).map(([publicKey, p]) => {
    const usedBytes = (p.accumulatedRx || 0) + (p.accumulatedTx || 0);
    const remainingBytes = p.totalQuotaBytes > 0 ? Math.max(0, p.totalQuotaBytes - usedBytes) : null;
    const dynamicConf = buildDynamicClientConfig(activeIface, p, config, currentInfo);
    return {
      publicKey,
      name: p.name,
      ip: p.ip,
      enabled: p.enabled,
      disabledReason: p.disabledReason || '',
      rx: p.accumulatedRx || 0,
      tx: p.accumulatedTx || 0,
      usedBytes,
      totalQuotaBytes: p.totalQuotaBytes || 0,
      remainingBytes,
      expireAt: p.expireAt || null,
      createdAt: p.createdAt || 0,
      latestHandshake: p.latestHandshake || 0,
      endpoint: p.endpoint || '',
      clientConfig: dynamicConf
    };
  });

  return {
    version: PANEL_VERSION,
    username: config.username,
    interface: activeIface,
    ifaceActive: isInterfaceUp(activeIface),
    ifaceAddress: currentInfo.address || '10.20.30.1/24',
    wgPort: currentInfo.listenPort || config.wgPort || 1080,
    serverIp: config.serverIp,
    tunnelIp: config.tunnelIp || '',
    dns: config.dns || '1.1.1.1, 8.8.8.8',
    mtu: config.mtu || 1280,
    keepalive: config.keepalive || 25,
    interfaces: interfacesSummary,
    system: getSystemStats(),
    peers: peers.sort((a, b) => b.createdAt - a.createdAt)
  };
});

fastify.post('/api/interfaces', { onRequest: [fastify.authenticate] }, async (request, reply) => {
  const { name, address, listenPort } = request.body || {};
  const ifaceName = String(name || '').trim();
  const cidr = String(address || '').trim();
  const port = Number(listenPort);

  if (!isValidIfaceName(ifaceName)) {
    return reply.code(400).send({ error: 'نام اینترفیس معتبر نیست (فقط حروف انگلیسی و عدد مثل int2، حداکثر ۱۵ کاراکتر).' });
  }
  if (!isValidIpv4Cidr(cidr)) {
    return reply.code(400).send({ error: 'فرمت آدرس شبکه صحیح نیست (مثال: 10.20.31.1/24).' });
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return reply.code(400).send({ error: 'پورت وایرگارد باید عددی بین ۱ تا ۶۵۵۳۵ باشد.' });
  }

  const existing = discoverInterfaces();
  if (existing.includes(ifaceName)) {
    return reply.code(400).send({ error: `اینترفیس ${ifaceName} از قبل وجود دارد.` });
  }

  for (const ex of existing) {
    const info = parseConfFile(ex);
    if (info.listenPort === port) {
      return reply.code(400).send({ error: `پورت ${port} قبلاً روی اینترفیس ${ex} استفاده شده است.` });
    }
    if (info.address && info.address.split('/')[0].split('.').slice(0, 3).join('.') === cidr.split('/')[0].split('.').slice(0, 3).join('.')) {
      return reply.code(400).send({ error: `رنج آی‌پی وارد شده با اینترفیس ${ex} (${info.address}) تداخل دارد.` });
    }
  }

  try {
    if (!fs.existsSync(WG_DIR)) fs.mkdirSync(WG_DIR, { recursive: true });
    const privateKey = execSync('wg genkey').toString().trim();
    let defaultNic = 'eth0';
    try {
      const detected = execSync("ip route list default | awk '{print $5}' | head -n 1").toString().trim();
      if (detected) defaultNic = detected;
    } catch {}

    const confContent = `[Interface]
Address = ${cidr}
PostUp = iptables -I INPUT -p udp --dport ${port} -j ACCEPT
PostUp = iptables -I FORWARD -i ${defaultNic} -o ${ifaceName} -j ACCEPT
PostUp = iptables -I FORWARD -i ${ifaceName} -j ACCEPT
PostUp = iptables -t nat -A POSTROUTING -o ${defaultNic} -j MASQUERADE
PostUp = ip6tables -I FORWARD -i ${ifaceName} -j ACCEPT
PostUp = ip6tables -t nat -A POSTROUTING -o ${defaultNic} -j MASQUERADE
PostDown = iptables -D INPUT -p udp --dport ${port} -j ACCEPT
PostDown = iptables -D FORWARD -i ${defaultNic} -o ${ifaceName} -j ACCEPT
PostDown = iptables -D FORWARD -i ${ifaceName} -j ACCEPT
PostDown = iptables -t nat -D POSTROUTING -o ${defaultNic} -j MASQUERADE
PostDown = ip6tables -D FORWARD -i ${ifaceName} -j ACCEPT
PostDown = ip6tables -t nat -D POSTROUTING -o ${defaultNic} -j MASQUERADE
ListenPort = ${port}
PrivateKey = ${privateKey}
SaveConfig = true
`;

    const confFile = path.join(WG_DIR, `${ifaceName}.conf`);
    fs.writeFileSync(confFile, confContent, { mode: 0o600 });

    const db = loadDb(config.interface);
    if (!db.interfaces[ifaceName]) db.interfaces[ifaceName] = {};
    saveDb(db);

    try {
      execSync(`systemctl enable --now wg-quick@${ifaceName}`, { stdio: 'ignore' });
    } catch {
      execSync(`wg-quick up ${ifaceName}`);
    }

    try {
      const ufwStatus = execSync('ufw status', { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
      if (ufwStatus.includes('Status: active')) {
        execSync(`ufw allow ${port}/udp`, { stdio: 'ignore' });
      }
    } catch {}

    return { success: true, name: ifaceName };
  } catch (err) {
    return reply.code(500).send({ error: `خطا در ایجاد اینترفیس: ${err.message}` });
  }
});

fastify.delete('/api/interfaces/:name', { onRequest: [fastify.authenticate] }, async (request, reply) => {
  const ifaceName = request.params.name;
  if (!isValidIfaceName(ifaceName)) {
    return reply.code(400).send({ error: 'نام اینترفیس نامعتبر است.' });
  }
  const existing = discoverInterfaces();
  if (existing.length <= 1) {
    return reply.code(400).send({ error: 'امکان حذف تنها اینترفیس باقی‌مانده سرور وجود ندارد.' });
  }
  try {
    try { execSync(`systemctl disable --now wg-quick@${ifaceName}`, { stdio: 'ignore' }); } catch {}
    try { execSync(`wg-quick down ${ifaceName}`, { stdio: 'ignore' }); } catch {}

    const confFile = path.join(WG_DIR, `${ifaceName}.conf`);
    if (fs.existsSync(confFile)) fs.unlinkSync(confFile);

    const db = loadDb(config.interface);
    delete db.interfaces[ifaceName];
    saveDb(db);

    return { success: true };
  } catch (err) {
    return reply.code(500).send({ error: err.message });
  }
});

fastify.post('/api/interface/action', { onRequest: [fastify.authenticate] }, async (request, reply) => {
  const { action, iface } = request.body || {};
  const targetIface = iface && isValidIfaceName(iface) ? iface : config.interface;
  if (!['start', 'stop', 'restart'].includes(action)) {
    return reply.code(400).send({ error: 'عملیات نامعتبر است.' });
  }
  try {
    try {
      execSync(`systemctl ${action} wg-quick@${targetIface}`);
    } catch {
      if (action === 'stop') execSync(`wg-quick down ${targetIface}`);
      else if (action === 'start') execSync(`wg-quick up ${targetIface}`);
      else {
        try { execSync(`wg-quick down ${targetIface}`); } catch {}
        execSync(`wg-quick up ${targetIface}`);
      }
    }
    return { success: true };
  } catch (err) {
    return reply.code(500).send({ error: err.message });
  }
});

fastify.post('/api/peers', { onRequest: [fastify.authenticate] }, async (request, reply) => {
  config = loadConfig();
  const { iface, name, quotaGB, expireAt } = request.body || {};
  const targetIface = iface && isValidIfaceName(iface) ? iface : config.interface;

  if (!isInterfaceUp(targetIface)) {
    return reply.code(400).send({ error: `اینترفیس ${targetIface} خاموش است. ابتدا آن را روشن کنید.` });
  }

  try {
    const db = loadDb(config.interface);
    if (!db.interfaces[targetIface]) db.interfaces[targetIface] = {};
    const ifacePeers = db.interfaces[targetIface];
    const ifaceInfo = parseConfFile(targetIface);

    const clientPrivateKey = execSync('wg genkey').toString().trim();
    const clientPublicKey = execSync(`echo "${clientPrivateKey}" | wg pubkey`).toString().trim();

    const existingIps = Object.values(ifacePeers).map(p => p.ip);
    const clientIp = getNextAvailableIp(ifaceInfo.address || '10.20.30.1/24', existingIps);

    execSync(`wg set ${targetIface} peer ${clientPublicKey} allowed-ips ${clientIp}`);
    execSync(`wg-quick save ${targetIface}`);

    const totalQuotaBytes = quotaGB && Number(quotaGB) > 0
      ? Math.round(Number(quotaGB) * 1024 * 1024 * 1024)
      : 0;

    const peerObj = {
      name: (name && name.trim()) ? name.trim() : `User-${clientIp.split('/')[0].split('.').pop()}`,
      ip: clientIp,
      privateKey: clientPrivateKey,
      enabled: true,
      disabledReason: '',
      totalQuotaBytes,
      accumulatedRx: 0,
      accumulatedTx: 0,
      lastKernelRx: 0,
      lastKernelTx: 0,
      expireAt: expireAt ? Number(expireAt) : null,
      createdAt: Date.now()
    };

    peerObj.clientConfig = buildDynamicClientConfig(targetIface, peerObj, config, ifaceInfo);
    ifacePeers[clientPublicKey] = peerObj;
    saveDb(db);

    return { success: true };
  } catch (err) {
    return reply.code(400).send({ error: err.message });
  }
});

fastify.put('/api/peers', { onRequest: [fastify.authenticate] }, async (request, reply) => {
  config = loadConfig();
  const { iface, publicKey, name, quotaGB, expireAt, toggleEnable, resetTraffic } = request.body || {};
  const targetIface = iface && isValidIfaceName(iface) ? iface : config.interface;
  const db = loadDb(config.interface);
  const ifacePeers = db.interfaces[targetIface] || {};
  const peer = ifacePeers[publicKey];

  if (!peer) return reply.code(404).send({ error: 'کاربر مورد نظر یافت نشد.' });

  if (typeof name === 'string' && name.trim()) peer.name = name.trim();

  if (quotaGB !== undefined) {
    peer.totalQuotaBytes = Number(quotaGB) > 0
      ? Math.round(Number(quotaGB) * 1024 * 1024 * 1024)
      : 0;
  }

  if (expireAt !== undefined) {
    peer.expireAt = expireAt ? Number(expireAt) : null;
  }

  if (resetTraffic) {
    peer.accumulatedRx = 0;
    peer.accumulatedTx = 0;
    const kPeers = getWgKernelPeers(targetIface);
    if (kPeers[publicKey]) {
      peer.lastKernelRx = kPeers[publicKey].rx;
      peer.lastKernelTx = kPeers[publicKey].tx;
    } else {
      peer.lastKernelRx = 0;
      peer.lastKernelTx = 0;
    }
  }

  const totalUsed = (peer.accumulatedRx || 0) + (peer.accumulatedTx || 0);
  const quotaOk = peer.totalQuotaBytes === 0 || totalUsed < peer.totalQuotaBytes;
  const timeOk = !peer.expireAt || Date.now() < peer.expireAt;

  if (typeof toggleEnable === 'boolean') {
    peer.enabled = toggleEnable;
    if (toggleEnable) {
      peer.disabledReason = '';
      peer.lastKernelRx = 0;
      peer.lastKernelTx = 0;
      execSync(`wg set ${targetIface} peer ${publicKey} allowed-ips ${peer.ip}`);
    } else {
      peer.disabledReason = 'غیرفعال توسط ادمین';
      peer.lastKernelRx = 0;
      peer.lastKernelTx = 0;
      try { execSync(`wg set ${targetIface} peer ${publicKey} remove`); } catch {}
    }
    try { execSync(`wg-quick save ${targetIface}`); } catch {}
  } else if (!peer.enabled && peer.disabledReason !== 'غیرفعال توسط ادمین' && quotaOk && timeOk) {
    peer.enabled = true;
    peer.disabledReason = '';
    peer.lastKernelRx = 0;
    peer.lastKernelTx = 0;
    try {
      execSync(`wg set ${targetIface} peer ${publicKey} allowed-ips ${peer.ip}`);
      execSync(`wg-quick save ${targetIface}`);
    } catch {}
  }

  saveDb(db);
  syncAllInterfaces();
  return { success: true };
});

fastify.delete('/api/peers', { onRequest: [fastify.authenticate] }, async (request) => {
  const { iface, publicKey } = request.body || {};
  const targetIface = iface && isValidIfaceName(iface) ? iface : config.interface;
  try {
    execSync(`wg set ${targetIface} peer ${publicKey} remove`);
    execSync(`wg-quick save ${targetIface}`);
  } catch {}

  const db = loadDb(config.interface);
  if (db.interfaces[targetIface]) {
    delete db.interfaces[targetIface][publicKey];
    saveDb(db);
  }
  return { success: true };
});

fastify.post('/api/qrcode', { onRequest: [fastify.authenticate] }, async (request) => {
  const { text } = request.body || {};
  const qr = await QRCode.toDataURL(String(text || ''), { margin: 2, width: 260 });
  return { qr };
});

fastify.post('/api/tools', { onRequest: [fastify.authenticate] }, async (request, reply) => {
  const { tool, target } = request.body || {};
  if (!target || !/^[a-zA-Z0-9.:-]+$/.test(String(target).trim()) || String(target).trim().startsWith('-')) {
    return reply.code(400).send({ error: 'آدرس آی‌پی یا دامنه نامعتبر است.' });
  }
  const cleanTarget = String(target).trim();
  const cmd = tool === 'traceroute' ? 'traceroute' : 'ping';
  const args = tool === 'traceroute' ? ['-n', '-m', '15', cleanTarget] : ['-c', '4', '-W', '2', cleanTarget];

  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: 18000 }, (err, stdout, stderr) => {
      resolve({ output: stdout || stderr || (err ? err.message : 'بدون خروجی') });
    });
  });
});

fastify.put('/api/settings', { onRequest: [fastify.authenticate] }, async (request, reply) => {
  config = loadConfig();
  const { username, newPassword, dns, serverIp, tunnelIp, mtu, keepalive } = request.body || {};

  if (username && username.trim()) config.username = username.trim();
  if (dns && dns.trim()) config.dns = dns.trim();
  if (serverIp && serverIp.trim()) config.serverIp = serverIp.trim();
  if (tunnelIp !== undefined) {

    config.tunnelIp = String(tunnelIp).trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  }
  if (mtu !== undefined && Number(mtu) >= 576 && Number(mtu) <= 9000) {
    config.mtu = Number(mtu);
  }
  if (keepalive !== undefined && Number(keepalive) >= 0 && Number(keepalive) <= 3600) {
    config.keepalive = Number(keepalive);
  }
  if (newPassword && newPassword.trim()) {
    if (newPassword.trim().length < 4) {
      return reply.code(400).send({ error: 'رمز عبور جدید باید حداقل ۴ کاراکتر باشد.' });
    }
    config.passwordHash = crypto.createHash('sha256').update(newPassword.trim()).digest('hex');
  }

  saveConfig(config);
  return { success: true, tunnelIp: config.tunnelIp, serverIp: config.serverIp };
});

fastify.get('/api/backup', { onRequest: [fastify.authenticate] }, async () => {
  const cfg = loadConfig();
  const db = loadDb(cfg.interface);
  const wgConfs = {};
  for (const iface of discoverInterfaces()) {
    const p = path.join(WG_DIR, `${iface}.conf`);
    if (fs.existsSync(p)) wgConfs[iface] = fs.readFileSync(p, 'utf-8');
  }
  return {
    exportedAt: Date.now(),
    version: PANEL_VERSION,
    panelConfig: {
      dns: cfg.dns,
      serverIp: cfg.serverIp,
      tunnelIp: cfg.tunnelIp || '',
      mtu: cfg.mtu || 1280,
      keepalive: cfg.keepalive || 25
    },
    db,
    wgConfs
  };
});

fastify.post('/api/restore', { onRequest: [fastify.authenticate] }, async (request, reply) => {
  try {
    const payload = request.body || {};
    if (!payload.db || !payload.db.interfaces) {
      return reply.code(400).send({ error: 'ساختار فایل بکاپ معتبر نیست.' });
    }
    if (payload.wgConfs && typeof payload.wgConfs === 'object') {
      if (!fs.existsSync(WG_DIR)) fs.mkdirSync(WG_DIR, { recursive: true });
      for (const [iface, content] of Object.entries(payload.wgConfs)) {
        if (isValidIfaceName(iface) && typeof content === 'string') {
          fs.writeFileSync(path.join(WG_DIR, `${iface}.conf`), content, { mode: 0o600 });
          try { execSync(`systemctl restart wg-quick@${iface}`, { stdio: 'ignore' }); } catch {}
        }
      }
    }
    saveDb(payload.db);
    if (payload.panelConfig) {
      config = loadConfig();
      if (payload.panelConfig.dns) config.dns = payload.panelConfig.dns;
      if (payload.panelConfig.tunnelIp !== undefined) config.tunnelIp = payload.panelConfig.tunnelIp;
      saveConfig(config);
    }
    return { success: true };
  } catch (err) {
    return reply.code(400).send({ error: `خطا در بازگردانی بکاپ: ${err.message}` });
  }
});

fastify.setNotFoundHandler((req, reply) => {
  if (req.url.startsWith('/api/')) {
    return reply.code(404).send({ error: 'API Not Found' });
  }
  return reply.sendFile('index.html');
});

fastify.listen({ port: Number(config.appPort) || 1000, host: '0.0.0.0' }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`WireGuard Panel ${PANEL_VERSION} running on port ${config.appPort}`);
});
