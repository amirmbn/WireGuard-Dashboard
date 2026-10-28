#!/bin/bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

VERSION="v4.0.0"
GITHUB_REPO="amirmbn/WireGuard-Dashboard"
ARCHIVE_NAME="wd-source.tar.gz"
DOWNLOAD_URL="https://github.com/${GITHUB_REPO}/releases/download/${VERSION}/${ARCHIVE_NAME}"
PANEL_DIR="/opt/wg-panel"

if [ "$(id -u)" -ne 0 ]; then
    echo "Please run as root."
    exit 1
fi

echo "================================================"
echo "   WireGuard Lightweight Panel Installer ${VERSION} "
echo "================================================"

IS_UPGRADE=0
if [ -f "$PANEL_DIR/backend/panel-config.json" ]; then
    read -r -p "Existing installation detected! Upgrade to ${VERSION} and keep your users/settings? (Y/n): " UPGRADE_CHOICE < /dev/tty
    UPGRADE_CHOICE=${UPGRADE_CHOICE:-Y}
    [[ "$UPGRADE_CHOICE" =~ ^[Yy]$ ]] && IS_UPGRADE=1
fi

generate_random_cred() {
    local upper lower digit rest
    upper=$(shuf --random-source=/dev/urandom -rn 1 -e {A..Z})
    lower=$(shuf --random-source=/dev/urandom -rn 1 -e {a..z})
    digit=$(shuf --random-source=/dev/urandom -rn 1 -e {0..9})
    rest=$(shuf --random-source=/dev/urandom -rn 9 -e {A..Z} {a..z} {0..9} | tr -d '\n')
    printf '%s' "${upper}${lower}${digit}${rest}" | fold -w1 | shuf --random-source=/dev/urandom | tr -d '\n'
    echo
}

port_in_use() {
    ss -tuln 2>/dev/null | awk '{print $5}' | grep -Eq "[:.]$1$"
}

generate_random_port() {
    local port zeros
    while true; do
        port=$(shuf --random-source=/dev/urandom -i 10000-65000 -n 1)
        zeros="${port//[^0]/}"
        if [ "${#zeros}" -le 1 ] && ! port_in_use "$port"; then
            echo "$port"
            return 0
        fi
    done
}

valid_port() {
    [[ "$1" =~ ^[0-9]+$ ]] && [ "$1" -ge 1 ] && [ "$1" -le 65535 ]
}

if [ "$IS_UPGRADE" -eq 0 ]; then
    read -r -p "Enter desired username (leave empty for random): " USERNAME_INPUT < /dev/tty
    USERNAME=${USERNAME_INPUT:-$(generate_random_cred)}

    read -r -s -p "Enter desired password (leave empty for random): " PASSWORD_INPUT < /dev/tty
    echo
    PASSWORD=${PASSWORD_INPUT:-$(generate_random_cred)}

    read -r -p "Enter desired panel port (leave empty for random): " PORT_INPUT < /dev/tty
    APP_PORT=${PORT_INPUT:-$(generate_random_port)}
    if ! valid_port "$APP_PORT"; then echo "Invalid panel port."; exit 1; fi

    read -r -p "Enter desired WireGuard interface name (default: int1): " IFACE_INPUT < /dev/tty
    INTERFACE_NAME=${IFACE_INPUT:-int1}
    if ! [[ "$INTERFACE_NAME" =~ ^[a-zA-Z0-9_=+.-]{1,15}$ ]]; then echo "Invalid interface name."; exit 1; fi

    read -r -p "Enter desired WireGuard UDP port (default: 1080): " WG_PORT_INPUT < /dev/tty
    WG_PORT=${WG_PORT_INPUT:-1080}
    if ! valid_port "$WG_PORT"; then echo "Invalid WireGuard port."; exit 1; fi

    read -r -p "Enter Tunnel IP/Domain if using tunnel (optional, press Enter to skip): " TUNNEL_INPUT < /dev/tty
    TUNNEL_IP=${TUNNEL_INPUT:-}
fi

apt-get update -y
apt-get install -y wireguard curl tar iptables traceroute iputils-ping openssl ca-certificates

# نصب Node.js 22 LTS در صورت نبودن یا قدیمی بودن (کمتر از 18)
NODE_OK=0
if command -v node >/dev/null 2>&1; then
    NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
    [ "$NODE_MAJOR" -ge 18 ] && NODE_OK=1
fi
if [ "$NODE_OK" -eq 0 ]; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
fi

# فعال‌سازی دائمی IPv4 و IPv6 Forwarding
cat > /etc/sysctl.d/99-wg-panel.conf <<EOL
net.ipv4.ip_forward=1
net.ipv6.conf.all.forwarding=1
EOL
sysctl --system >/dev/null

if [ "$IS_UPGRADE" -eq 0 ]; then
    DEFAULT_INTERFACE=$(ip route list default | awk '{print $5}' | head -n 1)
    if [ -z "$DEFAULT_INTERFACE" ]; then echo "Could not detect default network interface."; exit 1; fi
    CONFIG_FILE="/etc/wireguard/${INTERFACE_NAME}.conf"

    if [ ! -f "$CONFIG_FILE" ]; then
        mkdir -p /etc/wireguard
        umask 077
        PRIVATE_KEY=$(wg genkey)
        echo "$PRIVATE_KEY" > /etc/wireguard/server_private.key
        chmod 600 /etc/wireguard/server_private.key

        cat > "$CONFIG_FILE" <<EOL
[Interface]
Address = 10.20.30.1/24
PostUp = iptables -I INPUT -p udp --dport $WG_PORT -j ACCEPT
PostUp = iptables -I FORWARD -i $DEFAULT_INTERFACE -o $INTERFACE_NAME -j ACCEPT
PostUp = iptables -I FORWARD -i $INTERFACE_NAME -j ACCEPT
PostUp = iptables -t nat -A POSTROUTING -o $DEFAULT_INTERFACE -j MASQUERADE
PostUp = ip6tables -I FORWARD -i $INTERFACE_NAME -j ACCEPT
PostUp = ip6tables -t nat -A POSTROUTING -o $DEFAULT_INTERFACE -j MASQUERADE
PostDown = iptables -D INPUT -p udp --dport $WG_PORT -j ACCEPT
PostDown = iptables -D FORWARD -i $DEFAULT_INTERFACE -o $INTERFACE_NAME -j ACCEPT
PostDown = iptables -D FORWARD -i $INTERFACE_NAME -j ACCEPT
PostDown = iptables -t nat -D POSTROUTING -o $DEFAULT_INTERFACE -j MASQUERADE
PostDown = ip6tables -D FORWARD -i $INTERFACE_NAME -j ACCEPT
PostDown = ip6tables -t nat -D POSTROUTING -o $DEFAULT_INTERFACE -j MASQUERADE
ListenPort = $WG_PORT
PrivateKey = $PRIVATE_KEY
SaveConfig = true
EOL
        chmod 600 "$CONFIG_FILE"
        umask 022
    fi
    systemctl enable --now "wg-quick@${INTERFACE_NAME}" || wg-quick up "$INTERFACE_NAME" || true
fi

# سورس: اگر کنار اسکریپت بود از همان، وگرنه دانلود wd-source.tar.gz از GitHub Releases
SCRIPT_DIR=$(cd "$(dirname "$0")" 2>/dev/null && pwd || pwd)
TMP_DIR=$(mktemp -d /tmp/wd-panel.XXXXXX)
trap 'rm -rf "$TMP_DIR"' EXIT

if [ -d "$SCRIPT_DIR/backend" ] && [ -d "$SCRIPT_DIR/frontend" ]; then
    SOURCE_DIR="$SCRIPT_DIR"
else
    echo "Downloading ${VERSION} source from GitHub..."
    curl -fL --retry 3 "$DOWNLOAD_URL" -o "$TMP_DIR/$ARCHIVE_NAME"
    mkdir -p "$TMP_DIR/extracted"
    tar -xzf "$TMP_DIR/$ARCHIVE_NAME" -C "$TMP_DIR/extracted"

    if [ -d "$TMP_DIR/extracted/backend" ] && [ -d "$TMP_DIR/extracted/frontend" ]; then
        SOURCE_DIR="$TMP_DIR/extracted"
    else
        SOURCE_DIR=$(find "$TMP_DIR/extracted" -mindepth 1 -maxdepth 1 -type d | head -n 1)
    fi
fi

if [ ! -f "$SOURCE_DIR/backend/server.js" ] || [ ! -f "$SOURCE_DIR/frontend/package.json" ]; then
    echo "Invalid source package (backend/frontend not found)."
    exit 1
fi

mkdir -p "$PANEL_DIR/backend" "$PANEL_DIR/frontend"

# بکاپ دیتابیس و تنظیمات در حالت آپگرید
if [ "$IS_UPGRADE" -eq 1 ]; then
    systemctl stop wg-panel 2>/dev/null || true
    cp "$PANEL_DIR/backend/panel-config.json" "$TMP_DIR/panel-config.json"
    [ -f "$PANEL_DIR/backend/peers-db.json" ] && cp "$PANEL_DIR/backend/peers-db.json" "$TMP_DIR/peers-db.json"
fi

rm -rf "${PANEL_DIR:?}/frontend/"*
cp -r "$SOURCE_DIR/frontend/." "$PANEL_DIR/frontend/"
cp "$SOURCE_DIR/backend/package.json" "$SOURCE_DIR/backend/server.js" "$PANEL_DIR/backend/"
[ -f "$SOURCE_DIR/backend/package-lock.json" ] && cp "$SOURCE_DIR/backend/package-lock.json" "$PANEL_DIR/backend/"

if [ "$IS_UPGRADE" -eq 1 ]; then
    cp "$TMP_DIR/panel-config.json" "$PANEL_DIR/backend/panel-config.json"
    [ -f "$TMP_DIR/peers-db.json" ] && cp "$TMP_DIR/peers-db.json" "$PANEL_DIR/backend/peers-db.json"
    # به‌روزرسانی شماره نسخه در کانفیگ
    PANEL_DIR="$PANEL_DIR" VERSION="$VERSION" node -e '
        const fs=require("fs");const p=process.env.PANEL_DIR+"/backend/panel-config.json";
        const c=JSON.parse(fs.readFileSync(p,"utf8"));c.version=process.env.VERSION;
        fs.writeFileSync(p,JSON.stringify(c,null,2));'
fi

# بیلد فرانت‌اند React (devDependencies لازم است، پس NODE_ENV نباید production باشد)
echo "Building React frontend (${VERSION})..."
cd "$PANEL_DIR/frontend"
if [ -f package-lock.json ]; then npm ci; else npm install; fi
npm run build
if [ ! -d "$PANEL_DIR/frontend/dist" ]; then echo "Frontend build failed (dist not found)."; exit 1; fi
rm -rf node_modules

echo "Installing lightweight backend dependencies..."
cd "$PANEL_DIR/backend"
npm install --omit=dev

if [ "$IS_UPGRADE" -eq 0 ]; then
    SERVER_IPV4=$(curl -s -4 --max-time 10 icanhazip.com | tr -d '[:space:]' || true)
    [ -z "$SERVER_IPV4" ] && SERVER_IPV4=$(hostname -I | awk '{print $1}')
    PASS_HASH=$(printf '%s' "$PASSWORD" | sha256sum | awk '{print $1}')
    JWT_SECRET=$(openssl rand -hex 32)

    # ساخت JSON با node تا کاراکترهای خاص در username/tunnel باعث خراب شدن فایل نشوند
    P_VERSION="$VERSION" P_USER="$USERNAME" P_HASH="$PASS_HASH" P_PORT="$APP_PORT" \
    P_IFACE="$INTERFACE_NAME" P_WGPORT="$WG_PORT" P_IP="$SERVER_IPV4" P_TUNNEL="$TUNNEL_IP" \
    P_JWT="$JWT_SECRET" P_OUT="$PANEL_DIR/backend/panel-config.json" node -e '
        const e=process.env;
        const cfg={version:e.P_VERSION,username:e.P_USER,passwordHash:e.P_HASH,
          appPort:Number(e.P_PORT),interface:e.P_IFACE,wgPort:Number(e.P_WGPORT),
          serverIp:e.P_IP,tunnelIp:e.P_TUNNEL,dns:"1.1.1.1, 8.8.8.8",mtu:1280,
          keepalive:25,jwtSecret:e.P_JWT};
        require("fs").writeFileSync(e.P_OUT,JSON.stringify(cfg,null,2),{mode:0o600});'
    chmod 600 "$PANEL_DIR/backend/panel-config.json"

    cat > /etc/systemd/system/wg-panel.service <<EOL
[Unit]
Description=Lightweight WireGuard Panel ${VERSION} (Node.js + React)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$PANEL_DIR/backend
ExecStart=$(command -v node) --max-old-space-size=64 server.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOL

    if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
        ufw allow "$APP_PORT/tcp"
        ufw allow "$WG_PORT/udp"
    fi
fi

systemctl daemon-reload
systemctl enable wg-panel
systemctl restart wg-panel

echo ""
echo "================================================"
echo "  WireGuard Panel ${VERSION} Ready!"
echo "================================================"
if [ "$IS_UPGRADE" -eq 1 ]; then
    echo "  Upgrade completed! Existing users preserved."
else
    echo "  URL      : http://$SERVER_IPV4:$APP_PORT"
    echo "  Username : $USERNAME"
    echo "  Password : $PASSWORD"
fi
echo "================================================"
