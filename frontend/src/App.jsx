import React, { useState, useEffect } from 'react';
import jalaali from 'jalaali-js';

const GITHUB_URL = 'https://github.com/amirmbn/WireGuard-Dashboard';
const APP_VERSION = 'v4.0.1';

// ============ آیکون‌های برداری سبک (SVG) ============
const Icons = {
  Shield: ({ size = 26 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  GitHub: ({ size = 17 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  ),
  User: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Lock: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Eye: ({ off }) => off ? (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  ) : (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Plus: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
};

// ============ توابع کمکی فرمت و کلیپ‌بورد (سازگار با HTTP موبایل) ============
const formatBytes = (bytes) => {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const toJalaliStr = (ts) => {
  if (!ts) return 'نامحدود';
  const d = new Date(Number(ts));
  const j = jalaali.toJalaali(d);
  return `${j.jy}/${String(j.jm).padStart(2, '0')}/${String(j.jd).padStart(2, '0')}`;
};

const jalaliStrToTimestamp = (str) => {
  if (!str || !str.trim()) return null;
  const clean = str.trim().replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/-/g, '/');
  const parts = clean.split('/').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [jy, jm, jd] = parts;
  if (!jalaali.isValidJalaaliDate(jy, jm, jd)) return null;
  const g = jalaali.toGregorian(jy, jm, jd);
  return new Date(g.gy, g.gm - 1, g.gd, 23, 59, 59).getTime();
};

const safeCopyText = async (text) => {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  } catch {
    document.body.removeChild(ta);
    return false;
  }
};

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('wg_token') || '');
  const [version, setVersion] = useState(APP_VERSION);
  const [tab, setTab] = useState('dashboard');

  // وضعیت لاگین
  const [auth, setAuth] = useState({ username: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState('');

  // داده‌های اصلی پنل و اینترفیس انتخابی
  const [selectedIface, setSelectedIface] = useState(localStorage.getItem('wg_iface') || '');
  const [panelData, setPanelData] = useState({
    version: APP_VERSION,
    username: 'admin',
    interface: 'int1',
    ifaceActive: true,
    ifaceAddress: '10.20.30.1/24',
    wgPort: 1080,
    serverIp: '',
    tunnelIp: '',
    dns: '1.1.1.1, 8.8.8.8',
    mtu: 1280,
    keepalive: 25,
    interfaces: [],
    system: { cpuPercent: 0, cpuCores: 1, memUsed: 0, memTotal: 0, memPercent: 0, diskUsed: 0, diskTotal: 0, diskPercent: 0 },
    peers: []
  });

  // جستجو، فیلتر و پیام Toast
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [toast, setToast] = useState('');

  // فرم افزودن کاربر جدید
  const [newPeer, setNewPeer] = useState({ name: '', quotaGB: '', jalaliDate: '' });

  // مودال‌ها
  const [qrModal, setQrModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [ifaceModal, setIfaceModal] = useState(null);

  // ابزارها و تنظیمات
  const [toolState, setToolState] = useState({ tool: 'ping', target: '8.8.8.8', output: '', loading: false });
  const [settingsForm, setSettingsForm] = useState({
    username: '',
    newPassword: '',
    serverIp: '',
    tunnelIp: '',
    dns: '',
    mtu: 1280,
    keepalive: 25
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    fetch('/api/meta')
      .then(r => r.json())
      .then(d => { if (d?.version) setVersion(d.version); })
      .catch(() => {});
  }, []);

  const apiFetch = async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
      }
    });
    if (res.status === 401) {
      logout();
      throw new Error('Unauthorized');
    }
    return res;
  };

  const fetchPeers = async (ifaceOverride) => {
    if (!token) return;
    try {
      const target = ifaceOverride !== undefined ? ifaceOverride : selectedIface;
      const query = target ? `?iface=${encodeURIComponent(target)}` : '';
      const res = await apiFetch(`/api/peers${query}`);
      const json = await res.json();
      setPanelData(json);
      if (json.version) setVersion(json.version);
      if (!target || !json.interfaces.some(x => x.name === target)) {
        setSelectedIface(json.interface);
        localStorage.setItem('wg_iface', json.interface);
      }
      if (!settingsLoaded) {
        setSettingsForm({
          username: json.username || 'admin',
          newPassword: '',
          serverIp: json.serverIp || '',
          tunnelIp: json.tunnelIp || '',
          dns: json.dns || '1.1.1.1, 8.8.8.8',
          mtu: json.mtu || 1280,
          keepalive: json.keepalive || 25
        });
        setSettingsLoaded(true);
      }
    } catch {}
  };

  useEffect(() => {
    fetchPeers();
    const timer = setInterval(() => fetchPeers(), 5000);
    return () => clearInterval(timer);
  }, [token, selectedIface]);

  const handleSelectInterface = (name) => {
    setSelectedIface(name);
    localStorage.setItem('wg_iface', name);
    fetchPeers(name);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setAuthLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auth)
      });
      const json = await res.json();
      if (res.ok) {
        localStorage.setItem('wg_token', json.token);
        setSettingsLoaded(false);
        setToken(json.token);
      } else {
        setError(json.error || 'نام کاربری یا رمز عبور اشتباه است.');
      }
    } catch {
      setError('خطا در برقراری ارتباط با سرور.');
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('wg_token');
    setToken('');
    setSettingsLoaded(false);
  };

  // باز کردن مودال ساخت اینترفیس جدید با پیشنهاد هوشمند نام، ساب‌نت و پورت آزاد
  const openNewInterfaceModal = () => {
    const existing = panelData.interfaces || [];
    let idx = existing.length + 1;
    while (existing.some(i => i.name === `int${idx}`)) idx++;

    const usedPorts = existing.map(i => Number(i.listenPort));
    let nextPort = 1080 + idx - 1;
    while (usedPorts.includes(nextPort)) nextPort++;

    const usedThirdOctets = existing.map(i => {
      const m = String(i.address || '').match(/^10\.20\.(\d+)\./);
      return m ? Number(m[1]) : 0;
    });
    let nextOctet = 30 + idx - 1;
    while (usedThirdOctets.includes(nextOctet)) nextOctet++;

    setIfaceModal({
      name: `int${idx}`,
      address: `10.20.${nextOctet}.1/24`,
      listenPort: String(nextPort),
      loading: false,
      error: ''
    });
  };

  const handleCreateInterface = async (e) => {
    e.preventDefault();
    setIfaceModal(prev => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await apiFetch('/api/interfaces', {
        method: 'POST',
        body: JSON.stringify({
          name: ifaceModal.name.trim(),
          address: ifaceModal.address.trim(),
          listenPort: Number(ifaceModal.listenPort)
        })
      });
      const json = await res.json();
      if (!res.ok) {
        setIfaceModal(prev => ({ ...prev, loading: false, error: json.error || 'خطا در ساخت اینترفیس' }));
        return;
      }
      const createdName = json.name;
      setIfaceModal(null);
      showToast(`اینترفیس ${createdName} با موفقیت ساخته و فعال شد.`);
      handleSelectInterface(createdName);
    } catch {
      setIfaceModal(prev => ({ ...prev, loading: false, error: 'خطا در ارتباط با سرور' }));
    }
  };

  const handleDeleteInterface = async (ifaceName) => {
    if (!confirm(`آیا از حذف کامل اینترفیس ${ifaceName} و تمام کاربران آن اطمینان دارید؟`)) return;
    const res = await apiFetch(`/api/interfaces/${encodeURIComponent(ifaceName)}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error || 'خطا در حذف اینترفیس');
      return;
    }
    showToast(`اینترفیس ${ifaceName} حذف شد.`);
    setSelectedIface('');
    fetchPeers('');
  };

  const applyQuickDays = (daysCount, isEdit = false) => {
    const targetDate = new Date(Date.now() + Number(daysCount) * 86400000);
    const j = jalaali.toJalaali(targetDate);
    const formatted = `${j.jy}/${String(j.jm).padStart(2, '0')}/${String(j.jd).padStart(2, '0')}`;
    if (isEdit) {
      setEditModal(prev => ({ ...prev, jalaliDate: formatted }));
    } else {
      setNewPeer(prev => ({ ...prev, jalaliDate: formatted }));
    }
  };

  const handleCreatePeer = async (e) => {
    e.preventDefault();
    if (!newPeer.name.trim()) return;
    let expireAt = null;
    if (newPeer.jalaliDate.trim()) {
      expireAt = jalaliStrToTimestamp(newPeer.jalaliDate);
      if (!expireAt) {
        alert('فرمت تاریخ شمسی معتبر نیست (مثال صحیح: 1405/09/15)');
        return;
      }
    }
    const res = await apiFetch('/api/peers', {
      method: 'POST',
      body: JSON.stringify({
        iface: panelData.interface,
        name: newPeer.name.trim(),
        quotaGB: newPeer.quotaGB ? Number(newPeer.quotaGB) : 0,
        expireAt
      })
    });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error || 'خطا در ساخت کاربر');
      return;
    }
    setNewPeer({ name: '', quotaGB: '', jalaliDate: '' });
    showToast('کاربر جدید با موفقیت ساخته شد.');
    fetchPeers();
  };

  const handleUpdatePeer = async (e) => {
    e.preventDefault();
    let expireAt = null;
    if (editModal.jalaliDate.trim()) {
      expireAt = jalaliStrToTimestamp(editModal.jalaliDate);
      if (!expireAt) {
        alert('فرمت تاریخ شمسی معتبر نیست (مثال: 1405/09/15)');
        return;
      }
    }
    const res = await apiFetch('/api/peers', {
      method: 'PUT',
      body: JSON.stringify({
        iface: panelData.interface,
        publicKey: editModal.publicKey,
        name: editModal.name,
        quotaGB: editModal.quotaGB ? Number(editModal.quotaGB) : 0,
        expireAt
      })
    });
    if (res.ok) {
      setEditModal(null);
      showToast('اطلاعات کاربر بروزرسانی شد.');
      fetchPeers();
    }
  };

  const togglePeer = async (peer) => {
    await apiFetch('/api/peers', {
      method: 'PUT',
      body: JSON.stringify({ iface: panelData.interface, publicKey: peer.publicKey, toggleEnable: !peer.enabled })
    });
    showToast(peer.enabled ? `دسترسی ${peer.name} موقتاً قطع شد.` : `دسترسی ${peer.name} فعال شد.`);
    fetchPeers();
  };

  const resetPeerTraffic = async (peer) => {
    if (!confirm(`آیا حجم مصرف‌شده ${peer.name} صفر شود؟`)) return;
    await apiFetch('/api/peers', {
      method: 'PUT',
      body: JSON.stringify({ iface: panelData.interface, publicKey: peer.publicKey, resetTraffic: true })
    });
    showToast(`حجم مصرفی ${peer.name} ریست شد.`);
    fetchPeers();
  };

  const deletePeer = async (peer) => {
    if (!confirm(`آیا از حذف کامل ${peer.name} اطمینان دارید؟`)) return;
    await apiFetch('/api/peers', {
      method: 'DELETE',
      body: JSON.stringify({ iface: panelData.interface, publicKey: peer.publicKey })
    });
    showToast(`کاربر ${peer.name} حذف شد.`);
    fetchPeers();
  };

  const openQrModal = async (peer) => {
    const res = await apiFetch('/api/qrcode', {
      method: 'POST',
      body: JSON.stringify({ text: peer.clientConfig })
    });
    const { qr } = await res.json();
    setQrModal({ name: peer.name, config: peer.clientConfig, qr });
  };

  const downloadConfFile = (name, configText) => {
    const blob = new Blob([configText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}_${panelData.interface}.conf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openEditModal = (peer) => {
    setEditModal({
      publicKey: peer.publicKey,
      name: peer.name,
      quotaGB: peer.totalQuotaBytes > 0 ? (peer.totalQuotaBytes / (1024 ** 3)).toFixed(2).replace(/\.00$/, '') : '',
      jalaliDate: peer.expireAt ? toJalaliStr(peer.expireAt) : ''
    });
  };

  const handleInterfaceAction = async (action) => {
    await apiFetch('/api/interface/action', {
      method: 'POST',
      body: JSON.stringify({ action, iface: panelData.interface })
    });
    showToast(`عملیات روی اینترفیس ${panelData.interface} انجام شد.`);
    fetchPeers();
  };

  const runTool = async (e) => {
    e.preventDefault();
    setToolState(prev => ({ ...prev, loading: true, output: 'در حال اجرای دستور روی سرور...' }));
    const res = await apiFetch('/api/tools', {
      method: 'POST',
      body: JSON.stringify({ tool: toolState.tool, target: toolState.target })
    });
    const json = await res.json();
    setToolState(prev => ({ ...prev, loading: false, output: json.output || json.error }));
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    const res = await apiFetch('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settingsForm)
    });
    const json = await res.json();
    if (res.ok) {
      setSettingsForm(prev => ({ ...prev, newPassword: '', tunnelIp: json.tunnelIp || '' }));
      showToast('تنظیمات پنل و آی‌پی تانل با موفقیت ذخیره شد.');
      fetchPeers();
    } else {
      alert(json.error || 'خطا در ذخیره تنظیمات');
    }
  };

  const handleExportBackup = async () => {
    const res = await apiFetch('/api/backup');
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `wg-panel-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    showToast('فایل بکاپ دانلود شد.');
  };

  const handleImportBackup = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('آیا از بازگردانی اطلاعات این فایل بکاپ اطمینان دارید؟')) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await apiFetch('/api/restore', {
        method: 'POST',
        body: JSON.stringify(parsed)
      });
      const json = await res.json();
      if (res.ok) {
        showToast('بکاپ با موفقیت بازگردانی شد.');
        setSettingsLoaded(false);
        fetchPeers();
      } else {
        alert(json.error || 'خطا در بازگردانی بکاپ');
      }
    } catch {
      alert('فایل انتخاب شده معتبر نیست.');
    }
    e.target.value = '';
  };

  // ================= صفحه ورود حرفه‌ای =================
  if (!token) {
    return (
      <div className="login-screen" dir="rtl">
        <div className="login-card">
          <div className="login-brand">
            <div className="login-logo-box">
              <Icons.Shield size={30} />
            </div>
            <div className="header-row">
              <h2 className="page-title">پنل مدیریت WireGuard</h2>
            </div>
            <span className="text-muted-sm">
              داشبورد سبک و سریع مدیریت کاربران و اینترفیس‌ها
            </span>
          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <label className="form-label-dark">
              نام کاربری
            </label>
            <div className="input-group-modern">
              <span className="input-icon"><Icons.User /></span>
              <input
                type="text"
                placeholder="نام کاربری مدیر..."
                autoComplete="username"
                value={auth.username}
                onChange={e => setAuth({ ...auth, username: e.target.value })}
                required
              />
            </div>

            <label className="form-label-dark">
              رمز عبور
            </label>
            <div className="input-group-modern mb-22">
              <span className="input-icon"><Icons.Lock /></span>
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="رمز عبور..."
                autoComplete="current-password"
                value={auth.password}
                onChange={e => setAuth({ ...auth, password: e.target.value })}
                required
              />
              <button
                type="button"
                className="pwd-toggle-btn"
                onClick={() => setShowPwd(!showPwd)}
                title={showPwd ? 'مخفی کردن رمز' : 'نمایش رمز'}
              >
                <Icons.Eye off={showPwd} />
              </button>
            </div>

            <button type="submit" className="btn-primary btn-login" disabled={authLoading}>
              {authLoading ? 'در حال بررسی...' : 'ورود به پنل مدیریت'}
            </button>
          </form>

          <div className="login-footer">
            <span className="release-label">Release {version}</span>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="github-link">
              <span>GitHub</span>
              <Icons.GitHub size={16} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // محاسبه آمار اینترفیس فعال
  const totalRx = panelData.peers.reduce((acc, p) => acc + p.rx, 0);
  const totalTx = panelData.peers.reduce((acc, p) => acc + p.tx, 0);
  const onlineCount = panelData.peers.filter(
    p => p.enabled && p.latestHandshake > 0 && (Date.now() / 1000 - p.latestHandshake) < 180
  ).length;

  const filteredPeers = panelData.peers.filter(p => {
    const matchText = p.name.toLowerCase().includes(search.toLowerCase()) || p.ip.includes(search);
    if (!matchText) return false;
    const isOnline = p.enabled && p.latestHandshake > 0 && (Date.now() / 1000 - p.latestHandshake) < 180;
    if (statusFilter === 'online') return isOnline;
    if (statusFilter === 'disabled') return !p.enabled;
    return true;
  });

  const activeEndpointHost = panelData.tunnelIp ? panelData.tunnelIp : panelData.serverIp;
  const previewEndpointHost = settingsForm.tunnelIp?.trim() ? settingsForm.tunnelIp.trim() : settingsForm.serverIp;

  return (
    <div dir="rtl">
      {/* هدر چسبان بالا */}
      <header className="top-header">
        <div className="top-header-inner">
          <div className="brand-area">
            <div className="brand-icon-sm">
              <Icons.Shield size={21} />
            </div>
            <div>
              <div className="flex-center-gap-8">
                <strong className="brand-title">پنل وایرگارد <span className="header-version">{version}</span></strong>
              </div>
              <div className="text-hint">
                {panelData.tunnelIp ? (
                  <span>تانل فعال: <b dir="ltr" className="text-primary">{panelData.tunnelIp}</b></span>
                ) : (
                  <span>سرور مستقیم: <b dir="ltr">{panelData.serverIp}</b></span>
                )}
              </div>
            </div>
          </div>

          <nav className="nav-tabs-bar">
            <button
              className={`nav-tab-btn ${tab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setTab('dashboard')}
            >
              مدیریت کاربران
            </button>
            <button
              className={`nav-tab-btn ${tab === 'tools' ? 'active' : ''}`}
              onClick={() => setTab('tools')}
            >
              ابزارهای شبکه
            </button>
            <button
              className={`nav-tab-btn ${tab === 'settings' ? 'active' : ''}`}
              onClick={() => setTab('settings')}
            >
              تنظیمات پنل
            </button>
          </nav>

          <div className="header-actions">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="github-link"
              title="مشاهده مخزن گیت‌هاب"
            >
              <Icons.GitHub size={24} />
            </a>
            <button onClick={logout} className="btn-outline-danger">
              خروج
            </button>
          </div>
        </div>
      </header>

      <main className="app-shell">
        {tab === 'dashboard' && (
          <>
            {/* نوار انتخاب و افزودن اینترفیس (int1, int2, ...) */}
            <div className="iface-bar-card">
              <div className="iface-pills-scroll">
                <span className="iface-label">
                  اینترفیس‌ها:
                </span>
                {panelData.interfaces.map(item => (
                  <button
                    key={item.name}
                    onClick={() => handleSelectInterface(item.name)}
                    className={`iface-pill ${item.name === panelData.interface ? 'selected' : ''}`}
                  >
                    <small className="iface-port" dir="ltr">{item.listenPort}</small>
                    <span dir="ltr">{item.name}</span>
                    <span className={`status-dot ${item.active ? 'on' : 'off'}`} />
                  </button>
                ))}
              </div>

              <div className="flex-wrap-gap-8">
                <button onClick={openNewInterfaceModal} className="btn-primary btn-compact">
                  <Icons.Plus />
                  <span>افزودن اینترفیس جدید</span>
                </button>
              </div>
            </div>

            {/* کارت‌های وضعیت سیستم و اینترفیس انتخابی */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-card-top">
                  <span>کاربران {panelData.interface}</span>
                  <span className="text-success-bold">{onlineCount} آنلاین</span>
                </div>
                <div className="stat-value">
                  {panelData.peers.length} <small className="text-muted-xs-medium">کاربر ثبت‌شده</small>
                </div>
                <div className="text-hint" dir="ltr">
                  Subnet: {panelData.ifaceAddress}
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-top">
                  <span>ترافیک کل اینترفیس</span>
                  <span className="text-primary">↓↑</span>
                </div>
                <div className="stat-value" dir="ltr">{formatBytes(totalTx + totalRx)}</div>
                <div className="text-hint" dir="ltr">
                  ↓ {formatBytes(totalTx)} | ↑ {formatBytes(totalRx)}
                </div>
              </div>

              <div className="stat-card gap-10">
                <div>
                  <div className="usage-row">
                    <span className="usage-label">مصرف پردازنده ({panelData.system?.cpuCores || 1} هسته):</span>
                    <strong className="usage-value" dir="ltr">
                      {panelData.system?.cpuPercent || 0}%
                    </strong>
                  </div>
                  <div className="mini-bar-bg">
                    <div
                      className="mini-bar-fill"
                      style={{
                        width: `${panelData.system?.cpuPercent || 0}%`,
                        background: (panelData.system?.cpuPercent || 0) > 85 ? '#ef394e' : '#16a34a'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="usage-row">
                    <span className="usage-label">مصرف رم:</span>
                    <strong className="usage-value" dir="ltr">
                      {panelData.system?.memPercent || 0}% <span className="stat-sub-note">{formatBytes(panelData.system?.memTotal)} از {formatBytes(panelData.system?.memUsed)}</span>
                    </strong>
                  </div>
                  <div className="mini-bar-bg">
                    <div
                      className="mini-bar-fill"
                      style={{
                        width: `${panelData.system?.memPercent || 0}%`,
                        background: (panelData.system?.memPercent || 0) > 85 ? '#ef394e' : '#0d6efd'
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-top">
                  <span>کنترل {panelData.interface}</span>
                  <span className="fw-700" style={{ color: panelData.ifaceActive ? '#16a34a' : '#ef394e' }}>
                    {panelData.ifaceActive ? 'فعال' : 'متوقف'}
                  </span>
                </div>
                <div className="text-slate-xs" dir="ltr">
                  Endpoint: {activeEndpointHost}:{panelData.wgPort}
                </div>
                <div className="flex-wrap-gap-6">
                  <button onClick={() => handleInterfaceAction('restart')} className="btn-soft-blue">ریستارت</button>
                  {panelData.ifaceActive ? (
                    <button onClick={() => handleInterfaceAction('stop')} className="btn-soft-red">توقف</button>
                  ) : (
                    <button onClick={() => handleInterfaceAction('start')} className="btn-soft-blue">روشن کردن</button>
                  )}
                  {panelData.interfaces.length > 1 && (
                    <button onClick={() => handleDeleteInterface(panelData.interface)} className="btn-soft-gray" title="حذف این اینترفیس">
                      حذف اینترفیس
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* باکس افزودن سریع کاربر */}
            <form onSubmit={handleCreatePeer} className="panel-card">
              <div className="section-title">
                <span>افزودن کاربر جدید در اینترفیس</span>
                <span className="version-pill">{panelData.interface}</span>
              </div>

              <div className="create-peer-grid">
                <input
                  className="std-input"
                  placeholder="نام کاربر (مثلاً: Ali-iPhone)"
                  value={newPeer.name}
                  onChange={e => setNewPeer({ ...newPeer, name: e.target.value })}
                  required
                />
                <input
                  className="std-input"
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="حجم مجاز به گیگابایت (خالی = نامحدود)"
                  value={newPeer.quotaGB}
                  onChange={e => setNewPeer({ ...newPeer, quotaGB: e.target.value })}
                />
                <input
                  className="std-input"
                  placeholder="انقضا شمسی (مثلاً 1405/11/20)"
                  value={newPeer.jalaliDate}
                  onChange={e => setNewPeer({ ...newPeer, jalaliDate: e.target.value })}
                />
                <button type="submit" className="btn-primary">
                  <Icons.Plus />
                  <span>ساخت کاربر</span>
                </button>
              </div>

              <div className="quick-chips-row">
                <small className="quick-label">انتخاب سریع:</small>
                <button type="button" onClick={() => applyQuickDays(30)} className="chip-btn">۳۰ روزه</button>
                <button type="button" onClick={() => applyQuickDays(60)} className="chip-btn">۶۰ روزه</button>
                <button type="button" onClick={() => applyQuickDays(90)} className="chip-btn">۹۰ روزه</button>
                <span className="text-slate-300">|</span>
                <button type="button" onClick={() => setNewPeer(p => ({ ...p, quotaGB: '10' }))} className="chip-btn">۱۰ گیگ</button>
                <button type="button" onClick={() => setNewPeer(p => ({ ...p, quotaGB: '30' }))} className="chip-btn">۳۰ گیگ</button>
                <button type="button" onClick={() => setNewPeer(p => ({ ...p, quotaGB: '50' }))} className="chip-btn">۵۰ گیگ</button>
                <button type="button" onClick={() => setNewPeer(p => ({ ...p, quotaGB: '', jalaliDate: '' }))} className="chip-btn">پاک‌سازی محدودیت</button>
              </div>
            </form>

            {/* نوار جستجو و فیلتر */}
            <div className="peers-toolbar">
              <input
                className="std-input max-w-340"
                placeholder="جستجوی نام کاربر یا آی‌پی..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <div className="filter-pills">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={statusFilter === 'all' ? 'btn-soft-blue' : 'btn-soft-gray'}
                >
                  همه ({panelData.peers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('online')}
                  className={statusFilter === 'online' ? 'btn-soft-blue' : 'btn-soft-gray'}
                >
                  آنلاین ({onlineCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('disabled')}
                  className={statusFilter === 'disabled' ? 'btn-soft-red' : 'btn-soft-gray'}
                >
                  مسدود / منقضی
                </button>
              </div>
            </div>

            {/* نمای دسکتاپ: جدول حرفه‌ای */}
            <div className="desktop-table-wrap">
              <table className="peers-table">
                <thead>
                  <tr>
                    <th>کاربر / آی‌پی اختصاصی</th>
                    <th>وضعیت اتصال</th>
                    <th>مصرف / حجم کل / باقی‌مانده</th>
                    <th>تاریخ انقضا (شمسی)</th>
                    <th>عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPeers.map(peer => {
                    const isOnline = peer.enabled && peer.latestHandshake > 0 && (Date.now() / 1000 - peer.latestHandshake) < 180;
                    const percent = peer.totalQuotaBytes > 0
                      ? Math.min(100, Math.round((peer.usedBytes / peer.totalQuotaBytes) * 100))
                      : 0;

                    return (
                      <tr key={peer.publicKey} style={{ opacity: peer.enabled ? 1 : 0.68 }}>
                        <td>
                          <div className="peer-name">{peer.name}</div>
                          <small className="text-muted" dir="ltr">{peer.ip}</small>
                        </td>
                        <td>
                          {!peer.enabled ? (
                            <span className="badge-status badge-disabled">
                              قطع ({peer.disabledReason || 'غیرفعال'})
                            </span>
                          ) : (
                            <span className={`badge-status ${isOnline ? 'badge-online' : 'badge-idle'}`}>
                              <span className={`status-dot ${isOnline ? 'on' : 'off'} no-shadow`} style={{ background: isOnline ? '#16a34a' : '#94a3b8' }} />
                              {isOnline ? 'آنلاین' : 'آماده اتصال'}
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="fs-12-5" dir="ltr">
                            <strong>{formatBytes(peer.usedBytes)}</strong>
                            {' / '}
                            {peer.totalQuotaBytes > 0 ? formatBytes(peer.totalQuotaBytes) : 'نامحدود'}
                          </div>
                          {peer.totalQuotaBytes > 0 ? (
                            <>
                              <div className="quota-bar-bg">
                                <div
                                  className="quota-bar-fill"
                                  style={{
                                    width: `${percent}%`,
                                    background: percent >= 90 ? '#ef394e' : '#0d6efd'
                                  }}
                                />
                              </div>
                              <small className="text-slate-2xs">
                                باقی‌مانده: <strong dir="ltr">{formatBytes(peer.remainingBytes)}</strong> ({100 - percent}%)
                              </small>
                            </>
                          ) : (
                            <small className="text-muted-xs" dir="ltr">
                              ↓ {formatBytes(peer.tx)} | ↑ {formatBytes(peer.rx)}
                            </small>
                          )}
                        </td>
                        <td>
                          <div className="fw-700">{toJalaliStr(peer.expireAt)}</div>
                          {peer.expireAt && (
                            <small className="fs-11" style={{ color: peer.expireAt < Date.now() ? '#ef394e' : '#64748b' }}>
                              {peer.expireAt < Date.now()
                                ? 'منقضی شده'
                                : `${Math.ceil((peer.expireAt - Date.now()) / 86400000)} روز مانده`}
                            </small>
                          )}
                        </td>
                        <td>
                          <div className="flex-wrap-gap-6">
                            <button onClick={() => openQrModal(peer)} className="btn-soft-blue">کانفیگ / QR</button>
                            <button onClick={() => downloadConfFile(peer.name, peer.clientConfig)} className="btn-soft-gray">دانلود</button>
                            <button onClick={() => openEditModal(peer)} className="btn-soft-gray">ویرایش</button>
                            <button onClick={() => resetPeerTraffic(peer)} className="btn-soft-gray">ریست حجم</button>
                            <button onClick={() => togglePeer(peer)} className="btn-soft-gray">
                              {peer.enabled ? 'توقف' : 'وصل'}
                            </button>
                            <button onClick={() => deletePeer(peer)} className="btn-soft-red">حذف</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredPeers.length === 0 && (
                    <tr>
                      <td colSpan="5" className="empty-cell">
                        هیچ کاربری در این بخش یافت نشد.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* نمای موبایل: کارت‌های ریسپانسیو بدون اسکرول افقی */}
            <div className="mobile-peer-list">
              {filteredPeers.map(peer => {
                const isOnline = peer.enabled && peer.latestHandshake > 0 && (Date.now() / 1000 - peer.latestHandshake) < 180;
                const percent = peer.totalQuotaBytes > 0
                  ? Math.min(100, Math.round((peer.usedBytes / peer.totalQuotaBytes) * 100))
                  : 0;

                return (
                  <div key={peer.publicKey} className="mobile-peer-card" style={{ opacity: peer.enabled ? 1 : 0.72 }}>
                    <div className="mobile-peer-head">
                      <div>
                        <div className="mobile-peer-name">{peer.name}</div>
                        <small className="text-muted" dir="ltr">{peer.ip}</small>
                      </div>
                      {!peer.enabled ? (
                        <span className="badge-status badge-disabled">
                          {peer.disabledReason || 'غیرفعال'}
                        </span>
                      ) : (
                        <span className={`badge-status ${isOnline ? 'badge-online' : 'badge-idle'}`}>
                          {isOnline ? 'آنلاین' : 'آماده اتصال'}
                        </span>
                      )}
                    </div>

                    <div className="mobile-peer-grid">
                      <div>
                        <div className="text-muted-xs">مصرف / کل حجم</div>
                        <strong dir="ltr" className="inline-mt-2">
                          {formatBytes(peer.usedBytes)} / {peer.totalQuotaBytes > 0 ? formatBytes(peer.totalQuotaBytes) : '∞'}
                        </strong>
                        {peer.totalQuotaBytes > 0 && (
                          <div className="quota-percent-note">
                            مانده: <span dir="ltr">{formatBytes(peer.remainingBytes)}</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-muted-xs">تاریخ انقضا</div>
                        <strong className="block-mt-2">{toJalaliStr(peer.expireAt)}</strong>
                        {peer.expireAt && (
                          <span className="fs-11" style={{ color: peer.expireAt < Date.now() ? '#ef394e' : '#64748b' }}>
                            {peer.expireAt < Date.now() ? 'منقضی شده' : `${Math.ceil((peer.expireAt - Date.now()) / 86400000)} روز مانده`}
                          </span>
                        )}
                      </div>
                    </div>

                    {peer.totalQuotaBytes > 0 && (
                      <div className="quota-bar-bg quota-bar-full">
                        <div
                          className="quota-bar-fill"
                          style={{ width: `${percent}%`, background: percent >= 90 ? '#ef394e' : '#0d6efd' }}
                        />
                      </div>
                    )}

                    <div className="mobile-peer-actions">
                      <button onClick={() => openQrModal(peer)} className="btn-soft-blue">کانفیگ / QR</button>
                      <button onClick={() => downloadConfFile(peer.name, peer.clientConfig)} className="btn-soft-gray">دانلود فایل</button>
                      <button onClick={() => openEditModal(peer)} className="btn-soft-gray">ویرایش</button>
                      <button onClick={() => resetPeerTraffic(peer)} className="btn-soft-gray">ریست حجم</button>
                      <button onClick={() => togglePeer(peer)} className="btn-soft-gray">
                        {peer.enabled ? 'غیرفعال' : 'فعال‌سازی'}
                      </button>
                      <button onClick={() => deletePeer(peer)} className="btn-soft-red">حذف</button>
                    </div>
                  </div>
                );
              })}
              {filteredPeers.length === 0 && (
                <div className="panel-card empty-card">
                  کاربری یافت نشد.
                </div>
              )}
            </div>
          </>
        )}

        {/* تب ابزارهای شبکه */}
        {tab === 'tools' && (
          <div className="panel-card mt-20">
            <h3 className="section-title">ابزارهای عیب‌یابی شبکه سرور (Ping & Traceroute)</h3>
            <form onSubmit={runTool} className="tool-form">
              <select
                className="std-input w-160"
                value={toolState.tool}
                onChange={e => setToolState({ ...toolState, tool: e.target.value })}
              >
                <option value="ping">Ping</option>
                <option value="traceroute">Traceroute</option>
              </select>
              <input
                className="std-input tool-target-input"
                placeholder="آی‌پی یا دامنه (مثلاً 8.8.8.8)"
                value={toolState.target}
                onChange={e => setToolState({ ...toolState, target: e.target.value })}
              />
              <button type="submit" disabled={toolState.loading} className="btn-primary">
                {toolState.loading ? 'در حال اجرا...' : 'اجرای دستور'}
              </button>
            </form>
            {toolState.output && (
              <pre className="code-preview">{toolState.output}</pre>
            )}
          </div>
        )}

        {/* تب تنظیمات و آی‌پی تانل */}
        {tab === 'settings' && (
          <div className="settings-grid">
            <form onSubmit={saveSettings} className="panel-card mb-0">
              <h3 className="section-title">تنظیمات شبکه، آی‌پی تانل و حساب مدیر</h3>

              <div className="tunnel-preview-box">
                <div className="endpoint-title">پیش‌نمایش Endpoint در کانفیگ کاربران:</div>
                <code dir="ltr" className="endpoint-code">
                  Endpoint = {previewEndpointHost || '0.0.0.0'}:{panelData.wgPort}
                </code>
                <div className="endpoint-note">
                  {settingsForm.tunnelIp?.trim()
                    ? '✅ آی‌پی تانل فعال است و به جای آی‌پی اصلی سرور همراه با پورت وایرگارد در تمام کانفیگ‌ها قرار می‌گیرد.'
                    : 'ℹ️ فیلد تانل خالی است؛ آی‌پی اصلی سرور در کانفیگ‌ها قرار می‌گیرد.'}
                </div>
              </div>

              <label className="form-label">
                آی‌پی یا دامنه سرور تانل (اختیاری - سرور ایران)
              </label>
              <input
                className="std-input mb-14"
                style={{ borderColor: settingsForm.tunnelIp ? '#0d6efd' : undefined }}
                placeholder="مثال: 185.143.233.10 یا tun.example.com (خالی = بدون تانل)"
                value={settingsForm.tunnelIp}
                onChange={e => setSettingsForm({ ...settingsForm, tunnelIp: e.target.value })}
              />

              <label className="form-label">
                آی‌پی اصلی سرور خارج
              </label>
              <input
                className="std-input mb-14"
                value={settingsForm.serverIp}
                onChange={e => setSettingsForm({ ...settingsForm, serverIp: e.target.value })}
                required
              />

              <div className="settings-two-col">
                <div>
                  <label className="form-label">DNS کاربران</label>
                  <input
                    className="std-input"
                    value={settingsForm.dns}
                    onChange={e => setSettingsForm({ ...settingsForm, dns: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">MTU پیش‌فرض</label>
                  <input
                    className="std-input"
                    type="number"
                    value={settingsForm.mtu}
                    onChange={e => setSettingsForm({ ...settingsForm, mtu: e.target.value })}
                  />
                </div>
              </div>

              <hr className="soft-divider" />

              <label className="form-label">نام کاربری ادمین</label>
              <input
                className="std-input mb-14"
                value={settingsForm.username}
                onChange={e => setSettingsForm({ ...settingsForm, username: e.target.value })}
                required
              />

              <label className="form-label">
                رمز عبور جدید (در صورت عدم تغییر خالی بگذارید)
              </label>
              <input
                className="std-input mb-18"
                type="password"
                placeholder="رمز عبور جدید..."
                value={settingsForm.newPassword}
                onChange={e => setSettingsForm({ ...settingsForm, newPassword: e.target.value })}
              />

              <button type="submit" className="btn-primary w-full">
                ذخیره تنظیمات پنل
              </button>
            </form>

            <div className="side-column">
              <div className="panel-card mb-0">
                <h3 className="section-title">پشتیبان‌گیری و بازیابی (Backup & Restore)</h3>
                <p className="backup-desc">
                  فایل پشتیبان شامل تمامی اینترفیس‌ها (`int1`, `int2`, ...)، کلیدها، حجم مصرفی کاربران، تاریخ‌های انقضا و تنظیمات آی‌پی تانل می‌باشد.
                </p>
                <div className="flex-wrap-gap-10">
                  <button type="button" onClick={handleExportBackup} className="btn-primary">
                    دانلود فایل بکاپ
                  </button>
                  <label className="btn-soft-gray file-label-btn">
                    <span>بازگردانی از فایل بکاپ</span>
                    <input type="file" accept=".json" onChange={handleImportBackup} className="d-none" />
                  </label>
                </div>
              </div>

              <div className="panel-card mb-0">
                <h3 className="section-title">درباره پنل</h3>
                <div className="about-body">
                  <div>نسخه فعلی پنل: <span className="version-pill">{version}</span></div>
                  <div>معماری: <b>Node.js (Fastify) + React SPA</b></div>
                  <div className="mt-12">
                    <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="github-link">
                      <span>GitHub</span>
                      <Icons.GitHub size={16} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* مودال افزودن اینترفیس جدید */}
      {ifaceModal && (
        <div className="modal-backdrop" onClick={() => setIfaceModal(null)}>
          <form className="modal-box" onClick={e => e.stopPropagation()} onSubmit={handleCreateInterface}>
            <h3 className="modal-heading-tight">افزودن اینترفیس جدید WireGuard</h3>
            <p className="modal-desc">
              اینترفیس جدید با قوانین NAT و فایروال به صورت خودکار ساخته و فعال می‌شود.
            </p>
            {ifaceModal.error && (
              <div className="modal-error">
                {ifaceModal.error}
              </div>
            )}
            <label className="form-label">نام اینترفیس (مثال: int2)</label>
            <input
              className="std-input mb-12"
              value={ifaceModal.name}
              onChange={e => setIfaceModal({ ...ifaceModal, name: e.target.value })}
              required
            />
            <label className="form-label">رنج آی‌پی داخلی (CIDR)</label>
            <input
              className="std-input mb-12"
              value={ifaceModal.address}
              onChange={e => setIfaceModal({ ...ifaceModal, address: e.target.value })}
              required
            />
            <label className="form-label">پورت UDP وایرگارد</label>
            <input
              className="std-input mb-18"
              type="number"
              value={ifaceModal.listenPort}
              onChange={e => setIfaceModal({ ...ifaceModal, listenPort: e.target.value })}
              required
            />
            <div className="flex-gap-8">
              <button type="submit" className="btn-primary flex-1" disabled={ifaceModal.loading}>
                {ifaceModal.loading ? 'در حال ساخت...' : 'ساخت و راه‌اندازی اینترفیس'}
              </button>
              <button type="button" onClick={() => setIfaceModal(null)} className="btn-outline-danger">انصراف</button>
            </div>
          </form>
        </div>
      )}

      {/* مودال نمایش QR Code و دانلود کانفیگ */}
      {qrModal && (
        <div className="modal-backdrop" onClick={() => setQrModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3 className="modal-title">کانفیگ کاربر: {qrModal.name}</h3>
              <span className="version-pill">{panelData.interface}</span>
            </div>
            <img src={qrModal.qr} alt="QR Code" className="qr-image" />
            <pre className="code-preview">{qrModal.config}</pre>
            <div className="modal-actions-wrap">
              <button
                type="button"
                onClick={() => downloadConfFile(qrModal.name, qrModal.config)}
                className="btn-primary flex-1"
              >
                دانلود فایل .conf
              </button>
              <button
                type="button"
                onClick={async () => {
                  const ok = await safeCopyText(qrModal.config);
                  if (ok) showToast('متن کانفیگ در کلیپ‌بورد کپی شد.');
                }}
                className="btn-soft-blue btn-pad-md"
              >
                کپی کانفیگ
              </button>
              <button type="button" onClick={() => setQrModal(null)} className="btn-outline-danger">بستن</button>
            </div>
          </div>
        </div>
      )}

      {/* مودال ویرایش کاربر */}
      {editModal && (
        <div className="modal-backdrop" onClick={() => setEditModal(null)}>
          <form className="modal-box" onClick={e => e.stopPropagation()} onSubmit={handleUpdatePeer}>
            <h3 className="mt-0">ویرایش کاربر: {editModal.name}</h3>
            <label className="form-label">نام کاربر</label>
            <input
              className="std-input mb-12"
              value={editModal.name}
              onChange={e => setEditModal({ ...editModal, name: e.target.value })}
              required
            />
            <label className="form-label">
              حجم کل مجاز به گیگابایت (۰ یا خالی = نامحدود)
            </label>
            <input
              className="std-input mb-12"
              type="number"
              step="0.5"
              min="0"
              value={editModal.quotaGB}
              onChange={e => setEditModal({ ...editModal, quotaGB: e.target.value })}
            />
            <label className="form-label">
              تاریخ انقضا شمسی (خالی = نامحدود)
            </label>
            <input
              className="std-input mb-10"
              placeholder="1405/11/15"
              value={editModal.jalaliDate}
              onChange={e => setEditModal({ ...editModal, jalaliDate: e.target.value })}
            />
            <div className="quick-chips">
              <button type="button" onClick={() => applyQuickDays(30, true)} className="chip-btn">+۳۰ روز از امروز</button>
              <button type="button" onClick={() => applyQuickDays(60, true)} className="chip-btn">+۶۰ روز</button>
              <button type="button" onClick={() => setEditModal({ ...editModal, jalaliDate: '' })} className="chip-btn">بدون انقضا</button>
            </div>
            <div className="flex-gap-8">
              <button type="submit" className="btn-primary flex-1">ذخیره تغییرات</button>
              <button type="button" onClick={() => setEditModal(null)} className="btn-outline-danger">انصراف</button>
            </div>
          </form>
        </div>
      )}

      {/* پیام بازخورد شناور */}
      {toast && (
        <div className="toast-notification">
          <span>✅</span>
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
