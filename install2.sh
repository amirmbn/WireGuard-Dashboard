#!/bin/bash

# دریافت اطلاعات از کاربر
read -p "Enter desired username (default: admin): " USERNAME_INPUT
USERNAME=${USERNAME_INPUT:-admin}

read -sp "Enter desired password (default: 1234): " PASSWORD_INPUT
echo
PASSWORD=${PASSWORD_INPUT:-1234}

read -p "Enter desired port (default: 1000): " PORT_INPUT
APP_PORT=${PORT_INPUT:-1000}

# شروع فرآیند نصب
apt update -y
apt install wireguard -y

PRIVATE_KEY=$(wg genkey)
echo "$PRIVATE_KEY" | sudo tee /etc/wireguard/server_private.key

DEFAULT_INTERFACE=$(ip route list default | awk '{print $5}' | head -n 1)

CONFIG_FILE="/etc/wireguard/wg0.conf"

cat > "$CONFIG_FILE" <<EOL
[Interface]
Address = 172.20.0.1/24
PostUp = iptables -I INPUT -p udp --dport 40600 -j ACCEPT
PostUp = iptables -I FORWARD -i $DEFAULT_INTERFACE -o wg0 -j ACCEPT
PostUp = iptables -I FORWARD -i wg0 -j ACCEPT
PostUp = iptables -t nat -A POSTROUTING -o $DEFAULT_INTERFACE -j MASQUERADE
PostUp = ip6tables -I FORWARD -i wg0 -j ACCEPT
PostUp = ip6tables -t nat -A POSTROUTING -o $DEFAULT_INTERFACE -j MASQUERADE
PostDown = iptables -D INPUT -p udp --dport 40600 -j ACCEPT
PostDown = iptables -D FORWARD -i $DEFAULT_INTERFACE -o wg0 -j ACCEPT
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT
PostDown = iptables -t nat -D POSTROUTING -o $DEFAULT_INTERFACE -j MASQUERADE
PostDown = ip6tables -D FORWARD -i wg0 -j ACCEPT
PostDown = ip6tables -t nat -D POSTROUTING -o $DEFAULT_INTERFACE -j MASQUERADE
ListenPort = 40600
PrivateKey = $PRIVATE_KEY
SaveConfig = true
EOL

apt update
apt install git -y
git clone https://github.com/amirmbn/WireGuard-Dashboard.git
cd WireGuard-Dashboard
mv src /root/
cd
rm -rf WireGuard-Dashboard

apt-get -y install python3-pip python3-venv
apt install gunicorn -y

cd src
sudo chmod u+x wgd.sh
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# تنظیم فایل INI با اطلاعات دریافتی
cat > wg-dashboard.ini <<EOL
[Server]
username = $USERNAME
password = $(echo -n "$PASSWORD" | sha256sum | awk '{print $1}')
app_port = $APP_PORT
EOL

sudo ./wgd.sh install
sudo chmod -R 755 /etc/wireguard

./wgd.sh start

(crontab -l 2>/dev/null; echo "@reboot cd /root/src && ./wgd.sh restart") | crontab -

echo "--- Installation Complete ---"
echo "Access the dashboard at: http://$(curl -s ifconfig.me):$APP_PORT"
echo "Username: $USERNAME"
echo "Password: $PASSWORD"
