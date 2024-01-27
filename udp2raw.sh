CYAN="\e[96m"
GREEN="\e[92m"
YELLOW="\e[93m"
RED="\e[91m"
BLUE="\e[94m "
MAGENTA="\e[95m"
NC="\e[0m"

press_enter() {
    echo -e "\n${RED}Press Enter to continue... ${NC}"
    read
}

display_fancy_progress() {
    local duration=$1
    local sleep_interval=0.1
    local progress=0
    local bar_length=40

    while [ $progress -lt $duration ]; do
        echo -ne "\r[${YELLOW}"
        for ((i = 0; i < bar_length; i++)); do
            if [ $i -lt $((progress * bar_length / duration)) ]; then
                echo -ne "▓"
            else
                echo -ne "░"
            fi
        done
        echo -ne "${RED}] ${progress}%${NC}"
        progress=$((progress + 1))
        sleep $sleep_interval
    done
    echo -ne "\r[${YELLOW}"
    for ((i = 0; i < bar_length; i++)); do
        echo -ne "#"
    done
    echo -ne "${RED}] ${progress}%${NC}"
    echo
}

if [ "$EUID" -ne 0 ]; then
    echo -e "\n ${RED}This script must be run as root.${NC}"
    exit 1
fi

install() {
    clear
    echo ""
    echo -e "${YELLOW}First, making sure that all packages are suitable for your server.${NC}"
    echo ""
    echo -e "Please wait, it might take a while"
    echo ""
    sleep 1
    secs=4
    while [ $secs -gt 0 ]; do
        echo -ne "Continuing in $secs seconds\033[0K\r"
        sleep 1
        : $((secs--))
    done
    echo ""
    apt-get update > /dev/null 2>&1
    display_fancy_progress 20
    echo ""
    system_architecture=$(uname -m)

if [ "$system_architecture" != "x86_64" ] && [ "$system_architecture" != "amd64" ]; then
    echo "Unsupported architecture: $system_architecture"
    exit 1
fi

sleep 1
    echo ""
    echo -e "${YELLOW}Downloading and installing udp2raw for architecture: $system_architecture${NC}"
curl -L -o udp2raw_amd64 https://github.com/Azumi67/udp2raw-core/raw/main/udp2raw_amd64
curl -L -o udp2raw_x86 https://github.com/Azumi67/udp2raw-core/raw/main/udp2raw_x86
sleep 1

chmod +x udp2raw_amd64
chmod +x udp2raw_x86

echo ""
echo -e "${GREEN}Enabling IP forwarding...${NC}"
display_fancy_progress 20
echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.conf
echo "net.ipv6.conf.all.forwarding = 1" >> /etc/sysctl.conf
sysctl -p > /dev/null 2>&1
ufw reload > /dev/null 2>&1
echo ""
echo -e "${GREEN}All packages were installed and configured.${NC}"
}

logo() {
    echo -e "\n${BLUE}https://github.com/amirmbn${NC}\n"
}

validate_port() {
    local port="$1"
    local exclude_ports=()
    local wireguard_port=$(awk -F'=' '/ListenPort/ {gsub(/ /,"",$2); print $2}' /etc/wireguard/*.conf)
    exclude_ports+=("$wireguard_port")

    if [[ " ${exclude_ports[@]} " =~ " $port " ]]; then
        return 0  
    fi

    if ss -tuln | grep -q ":$port "; then
        echo -e "${RED}Port $port is already in use. Please choose another port.${NC}"
        return 1
    fi

    return 0
}
remote_func() {
    clear
    echo ""
    echo -e "     ${GREEN}Configuring Remote Server (KHAREJ)${NC}"
    echo ""
    echo ""
    echo -e "\e[33mTunnel Mode \e[92m[Default: IPV6]${NC}"
    echo ""
    echo -e "${RED}1${NC}. ${YELLOW}IPV6${NC}"
    echo -e "${RED}2${NC}. ${YELLOW}IPV4${NC}"
    echo ""
    echo -ne "Enter your choice [1-2] : ${NC}"
    read tunnel_mode

    case $tunnel_mode in
        1)
            tunnel_mode="[::]"
            ;;
        2)
            tunnel_mode="0.0.0.0"
            ;;
        *)
            echo -e "${RED}Invalid choice, choose correctly ...${NC}"
            ;;
    esac

    while true; do
        echo -ne "\e[33mEnter the Local server (IRAN) port \e[92m[Default: 443]${NC}: "
        read local_port
        if [ -z "$local_port" ]; then
            local_port=443
            break
        fi
        if validate_port "$local_port"; then
            break
        fi
    done

    while true; do
        echo ""
        echo -ne "\e[33mEnter the Wireguard port \e[92m[Default: 50820]${NC}: "
        read remote_port
        if [ -z "$remote_port" ]; then
            remote_port=50820
            break
        fi
        if validate_port "$remote_port"; then
            break
        fi
    done

    echo ""
    echo -ne "\e[33mEnter the Password for UDP2RAW \e[92m[This will be used on your local server (IRAN)]${NC}: "
    read password
    echo ""
    echo -e "\e[33m protocol (Mode) (Local and remote should be the same)${NC}"
    echo ""
    echo -e "${RED}1${NC}. ${YELLOW}udp${NC}"
    echo -e "${RED}2${NC}. ${YELLOW}faketcp${NC}"
    echo -e "${RED}3${NC}. ${YELLOW}icmp${NC}"
    echo ""
    echo -ne "Enter your choice [1-3] : ${NC}"
    read protocol_choice

    case $protocol_choice in
        1)
            raw_mode="udp"
            ;;
        2)
            raw_mode="faketcp"
            ;;
        3)
            raw_mode="icmp"
            ;;
        *)
            echo -e "${RED}Invalid choice, choose correctly ...${NC}"
            ;;
    esac

    echo -e "${CYAN}Selected protocol: ${GREEN}$raw_mode${NC}"

cat << EOF > /etc/systemd/system/udp2raw-s.service
[Unit]
Description=udp2raw-s Service
After=network.target

[Service]
ExecStart=/root/udp2raw_amd64 -s -l $tunnel_mode:${local_port} -r 127.0.0.1:${remote_port} -k "${password}" --raw-mode ${raw_mode} -a

Restart=always

[Install]
WantedBy=multi-user.target
EOF

    sleep 1
    systemctl daemon-reload
    systemctl restart "udp2raw-s.service"
    systemctl enable --now "udp2raw-s.service"
    systemctl start --now "udp2raw-s.service"
    sleep 1

    echo -e "\e[92mRemote Server (Kharej) configuration has been adjusted and service started. Yours truly, Azumi${NC}"
echo ""
GREEN='\033[0;92m'
RED='\033[0;91m'
NC='\033[0m'

echo -e "${GREEN}Make sure to allow port ${RED}$remote_port${GREEN} on your firewall by this command:${RED} ufw allow $remote_port ${NC}"
}

local_func() {
    clear
    echo ""
    echo -e "     ${Green}Configuring Local server (Iran)${NC}"
    echo ""
    echo -e "\e[33mTunnel Mode \e[92m[Default: IPV6]${NC}"
    echo ""
    echo -e "${RED}1${NC}. ${YELLOW}IPV6${NC}"
    echo -e "${RED}2${NC}. ${YELLOW}IPV4${NC}"
    echo ""
    echo -ne "Enter your choice [1-2] : ${NC}"
    read tunnel_mode

    case $tunnel_mode in
        1)
            tunnel_mode="IPV6"
            ;;
        2)
            tunnel_mode="IPV4"
            ;;
        *)
            echo -e "${RED}Invalid choice, choose correctly ...${NC}"
            ;;
    esac
    while true; do
        echo -ne "\e[33mEnter the Local server (IRAN) port \e[92m[Default: 443]${NC}: "
        read remote_port
        if [ -z "$remote_port" ]; then
            remote_port=443
            break
        fi
        if validate_port "$remote_port"; then
            break
        fi
    done

    while true; do
        echo ""
        echo -ne "\e[33mEnter the Wireguard port - installed on kharej \e[92m[Default: 50820]${NC}: "
        read local_port
        if [ -z "$local_port" ]; then
            local_port=50820
            break
        fi
        if validate_port "$local_port"; then
            break
        fi
    done
    echo ""
    echo -ne "\e[33mEnter the Remote server (Kharej) IPV6 / IPV4 (Based on your tunnel preference)\e[92m${NC}: "
    read remote_address
    echo ""
    echo -ne "\e[33mEnter the Password for UDP2RAW \e[92m[The same as you set on remote server (Kharej)]${NC}: "
    read password
    echo ""
    echo -e "\e[33m protocol (Mode) \e[92m(Local and Remote shoud have the same value)${NC}"
    echo ""
    echo -e "${RED}1${NC}. ${YELLOW}udp${NC}"
    echo -e "${RED}2${NC}. ${YELLOW}faketcp${NC}"
    echo -e "${RED}3${NC}. ${YELLOW}icmp${NC}"
    echo ""
    echo -ne "Enter your choice [1-3] : ${NC}"
    read protocol_choice

    case $protocol_choice in
        1)
            raw_mode="udp"
            ;;
        2)
            raw_mode="faketcp"
            ;;
        3)
            raw_mode="icmp"
            ;;
        *)
            echo -e "${RED}Invalid choice, choose correctly ...${NC}"
            ;;
    esac

echo -e "${CYAN}Selected protocol: ${GREEN}$raw_mode${NC}"

if [ "$tunnel_mode" == "IPV4" ]; then
    exec_start="/root/udp2raw_amd64 -c -l 0.0.0.0:${local_port} -r ${remote_address}:${remote_port} -k ${password} --raw-mode ${raw_mode} -a"
else
    exec_start="/root/udp2raw_amd64 -c -l [::]:${local_port} -r [${remote_address}]:${remote_port} -k ${password} --raw-mode ${raw_mode} -a"
fi

cat << EOF > /etc/systemd/system/udp2raw-c.service
[Unit]
Description=udp2raw-c Service
After=network.target

[Service]
ExecStart=${exec_start}
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sleep 1
systemctl daemon-reload
systemctl restart "udp2raw-c.service"
systemctl enable --now "udp2raw-c.service"
systemctl start --now "udp2raw-c.service"

echo -e "\e[92mLocal Server (IRAN) configuration has been adjusted and service started. Yours truly, Azumi${NC}"
echo ""
GREEN='\033[0;92m'
RED='\033[0;91m'
NC='\033[0m'

echo -e "${GREEN}Make sure to allow port ${RED}$remote_port${GREEN} on your firewall by this command:${RED} ufw allow $remote_port ${NC}"
}

uninstall() {
    clear
    echo ""
    echo -e "${YELLOW}Uninstalling UDP2RAW, Please wait ...${NC}"
    echo ""
    echo ""
    display_fancy_progress 20

    systemctl stop --now "udp2raw-s.service" > /dev/null 2>&1
    systemctl disable --now "udp2raw-s.service" > /dev/null 2>&1
    systemctl stop --now "udp2raw-c.service" > /dev/null 2>&1
    systemctl disable --now "udp2raw-c.service" > /dev/null 2>&1
    rm -f /etc/systemd/system/udp2raw-s.service > /dev/null 2>&1
    rm -f /etc/systemd/system/udp2raw-c.service > /dev/null 2>&1
    rm -f /usr/local/bin/udp2raw > /dev/null 2>&1
    
    sleep 2
    echo ""
    echo ""
    echo -e "${GREEN}UDP2RAW has been uninstalled.${NC}"
}

menu_status() {
    systemctl is-active "udp2raw-s.service" &> /dev/null
    remote_status=$?

    systemctl is-active "udp2raw-c.service" &> /dev/null
    local_status=$?

GREEN='\033[0;92m'
RED='\033[0;91;1m'
CYAN='\033[0;96m'
NC='\033[0m'
echo ""
if [ $remote_status -eq 0 ]; then
    echo -e "\e[36m ${CYAN}EU Server Status${NC} > ${GREEN}Wireguard Tunnel is running.${NC}"
else
    echo -e "\e[36m ${CYAN}EU Server Status${NC} > ${RED}Wireguard Tunnel is not running.${NC}"
fi
echo ""
if [ $local_status -eq 0 ]; then
    echo -e "\e[36m ${CYAN}IR Server Status${NC} > ${GREEN}Wireguard Tunnel is running.${NC}"
else
    echo -e "\e[36m ${CYAN}IR Server Status${NC} > ${RED}Wireguard Tunnel is not running.${NC}"
fi
}
echo ""
while true; do
    clear    
    menu_status
    echo ""
    echo ""
    echo -e "\e[36m 1\e[0m) \e[93mInstall UDP2RAW binary"
    echo -e "\e[36m 2\e[0m) \e[93mSet EU Tunnel"
    echo -e "\e[36m 3\e[0m) \e[93mSet IR Tunnel"  
    echo ""
    echo -e "\e[36m 4\e[0m) \e[93mUninstall UDP2RAW"
    echo -e "\e[36m 0\e[0m) \e[93mExit as Server"
    echo ""
    echo ""
    echo -ne "\e[92mSelect an option \e[31m[\e[97m0-4\e[31m]: \e[0m"
    read choice

    case $choice in
        
        1)
            install
            ;;
        2)
            remote_func
            ;;
        3)
            local_func
            ;;
        4)
            uninstall
            ;;
        0)
            echo -e "\n ${RED}Exiting...${NC}"
            exit 0
            ;;
        *)
            echo -e "\n ${RED}Invalid choice. Please enter a valid option.${NC}"
            ;;
    esac

    echo -e "\n ${RED}Press Enter to continue... ${NC}"
    read
done
