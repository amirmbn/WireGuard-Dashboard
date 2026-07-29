#!/bin/bash
export DEBIAN_FRONTEND=noninteractive
read -p "Enter desired username (default: admin): " USERNAME_INPUT
USERNAME=${USERNAME_INPUT:-admin}
read -sp "Enter desired password (default: 1234): " PASSWORD_INPUT
echo
PASSWORD=${PASSWORD_INPUT:-1234}
read -p "Enter desired port (default: 1000): " PORT_INPUT
APP_PORT=${PORT_INPUT:-1000}

apt update -y
apt install wireguard -y

PRIVATE_KEY=$(wg genkey)
echo "$PRIVATE_KEY" | sudo tee /etc/wireguard/server_private.key

DEFAULT_INTERFACE=$(ip route list default | awk '{print $5}' | head -n 1)

CONFIG_FILE="/etc/wireguard/wg0.conf"

cat > "$CONFIG_FILE" <<EOL
[Interface]
Address = 10.20.30.1/24
PostUp = iptables -I INPUT -p udp --dport 1080 -j ACCEPT
PostUp = iptables -I FORWARD -i $DEFAULT_INTERFACE -o wg0 -j ACCEPT
PostUp = iptables -I FORWARD -i wg0 -j ACCEPT
PostUp = iptables -t nat -A POSTROUTING -o $DEFAULT_INTERFACE -j MASQUERADE
PostUp = ip6tables -I FORWARD -i wg0 -j ACCEPT
PostUp = ip6tables -t nat -A POSTROUTING -o $DEFAULT_INTERFACE -j MASQUERADE
PostDown = iptables -D INPUT -p udp --dport 1080 -j ACCEPT
PostDown = iptables -D FORWARD -i $DEFAULT_INTERFACE -o wg0 -j ACCEPT
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT
PostDown = iptables -t nat -D POSTROUTING -o $DEFAULT_INTERFACE -j MASQUERADE
PostDown = ip6tables -D FORWARD -i wg0 -j ACCEPT
PostDown = ip6tables -t nat -D POSTROUTING -o $DEFAULT_INTERFACE -j MASQUERADE
ListenPort = 1080
PrivateKey = $PRIVATE_KEY
SaveConfig = true
EOL

apt update
apt install unzip -y
curl -L -o /root/wd-source.zip https://github.com/amirmbn/WireGuard-Dashboard/releases/latest/download/wd-source.zip
mkdir -p /root/src
unzip -q /root/wd-source.zip -d /root/src
rm -f /root/wd-source.zip

apt-get -y install python3-pip
apt install gunicorn -y

cd /root/src
sudo chmod u+x wgd.sh
pip install -r requirements.txt --break-system-packages

cat > wg-dashboard.ini <<EOL
[Account]
username = $USERNAME
password = $(echo -n "$PASSWORD" | sha256sum | awk '{print $1}')

[Server]
app_port = $APP_PORT
EOL

sudo ./wgd.sh install
sudo chmod -R 755 /etc/wireguard

pip install --upgrade ifcfg --break-system-packages

./wgd.sh start

if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
    ufw allow "$APP_PORT"
    ufw allow 1080
fi

(crontab -l 2>/dev/null; echo "@reboot cd /root/src && ./wgd.sh restart") | crontab -

SERVER_IPV4=$(curl -s -4 icanhazip.com)
echo "Installation Complete."
echo ""
echo "---------------------------"
echo "Wireguard Panel Information"
echo "---------------------------"
echo ""
echo "Access the dashboard at: http://$SERVER_IPV4:$APP_PORT"
echo "Username: $USERNAME"
echo "Password: $PASSWORD"
