#!/bin/bash

# Update server and install WireGuard
echo "Updating server and installing WireGuard..."
apt update -y
apt install wireguard -y

# Generate private key and save it
echo "Generating WireGuard private key..."
PRIVATE_KEY=$(wg genkey)
echo "$PRIVATE_KEY" | sudo tee /etc/wireguard/server_private.key
echo "Private key has been saved to /etc/wireguard/server_private.key"
echo "Private Key: $PRIVATE_KEY"
echo "Please note this private key for your records."

# Get default interface
DEFAULT_INTERFACE=$(ip route list default | awk '{print $5}' | head -n 1)
echo "Detected default network interface: $DEFAULT_INTERFACE"

# Create WireGuard configuration
echo "Creating WireGuard configuration..."
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

echo "WireGuard configuration created at $CONFIG_FILE"

# Install WireGuard Dashboard
echo "Installing WireGuard Dashboard..."
apt update
apt install git -y
git clone https://github.com/amirmbn/WireGuard-Dashboard.git
cd WireGuard-Dashboard
mv src /root/
cd
rm -rf WireGuard-Dashboard

# Install required packages
echo "Installing required packages..."
apt-get -y install python3-pip
apt install gunicorn -y

# Set up WireGuard Dashboard
echo "Setting up WireGuard Dashboard..."
cd src
sudo chmod u+x wgd.sh
pip install -r requirements.txt
sudo ./wgd.sh install
sudo chmod -R 755 /etc/wireguard

# Start WireGuard Dashboard
echo "Starting WireGuard Dashboard..."
./wgd.sh start

echo "Setup completed successfully!"
echo "WireGuard is configured with:"
echo "- Interface: wg0"
echo "- Listen Port: 40600"
echo "- Private Key: $PRIVATE_KEY"
echo "WireGuard Dashboard has been installed and started."