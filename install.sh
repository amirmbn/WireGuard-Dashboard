#!/bin/bash

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

apt-get -y install python3-pip
apt install gunicorn -y

cd src
sudo chmod u+x wgd.sh
pip install -r requirements.txt
sudo ./wgd.sh install
sudo chmod -R 755 /etc/wireguard

./wgd.sh start

(crontab -l 2>/dev/null; echo "@reboot cd src && ./wgd.sh restart") | crontab -
