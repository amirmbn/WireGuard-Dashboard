#!/bin/bash

# wgd.sh - Copyright(C) 2021 Donald Zou & amirmbn [https://github.com/amirmbn]
## Edited By amirmbn

app_name="dashboard.py"
app_official_name="WGDashboard"
PID_FILE=./gunicorn.pid
environment=$(if [[ $ENVIRONMENT ]]; then echo $ENVIRONMENT; else echo 'develop'; fi)
if [[ $CONFIGURATION_PATH ]]; then
  cb_work_dir=$CONFIGURATION_PATH/letsencrypt/work-dir
  cb_config_dir=$CONFIGURATION_PATH/letsencrypt/config-dir
else
  cb_work_dir=/etc/letsencrypt
  cb_config_dir=/var/lib/letsencrypt
fi

dashes='------------------------------------------------------------'
equals='============================================================'
help() {
  GREEN='\033[92m'
  YELLOW='\033[93m'
  BLUE='\033[96m'
  NC='\033[0m' 
  display_logo2
  printf "${YELLOW}=================================================================================\n"
  printf "${YELLOW}+     ${BLUE}<Wireguard Panel> by Donald Zou & amirmbn ${BLUE}https://github.com/amirmbn        ${YELLOW}+\n"
  printf "${YELLOW}=================================================================================${NC}\n"
  printf "${YELLOW}| Usage: ${GREEN}./wgd.sh <option>${NC}                                                      ${YELLOW}|\n"
  printf "${YELLOW}|                                                                               ${YELLOW}|\n"
  printf "${YELLOW}| Available options:                                                            ${YELLOW}|\n"
  printf "${YELLOW}|    ${GREEN}start${NC}: To start Wireguard Panel.                                           ${YELLOW}|\n"
  printf "${YELLOW}|    ${GREEN}stop${NC}: To stop Wireguard Panel.                                             ${YELLOW}|\n"
  printf "${YELLOW}|    ${GREEN}debug${NC}: To start Wireguard Panel in debug mode (i.e., run in foreground).   ${YELLOW}|\n"
  printf "${YELLOW}|    ${GREEN}install${NC}: To install Wireguard Panel                                        ${YELLOW}|\n"
  printf "${YELLOW}=================================================================================${NC}\n"
}
_check_and_set_venv(){
    # This function will not be using in v3.0
    # deb/ubuntu users: might need a 'apt install python3.8-venv'
    # set up the local environment
    APP_ROOT=`pwd`
    VIRTUAL_ENV="${APP_ROOT%/*}/venv"
    if [ ! -d $VIRTUAL_ENV ]; then
        python3 -m venv $VIRTUAL_ENV
    fi
    . ${VIRTUAL_ENV}/bin/activate
}
function display_logo2() {
echo -e "\033[1;92m$logo2\033[0m"
}

logo2=$(cat << "EOF"

amirmbn

EOF
)
function display_logo() {
echo -e "\033[1;96m$logo\033[0m"
}

logo=$(cat << "EOF"

amirmbn  

EOF
)
install_wgd() {
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[93m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
LIGHT_GREEN='\033[1;32m'
BOLD='\033[1m'
RESET='\033[0m'

    print_box() {
        local text="$1"
        local color="$2"
        local width=$((${#text} + 2))
        local dashes=$(printf "─%.0s" $(seq 1 $width))

        printf "${color}╭${dashes}╮${RESET}\n"
        printf "${color}│ ${text} │${RESET}\n"
        printf "${color}╰${dashes}╯${RESET}\n"
    }

    display_logo

    version_pass=$(python3 -c 'import sys; print("1") if (sys.version_info.major == 3 and sys.version_info.minor >= 7) else print("0");')
    if [ $version_pass == "0" ]; then
        print_box "Wireguard Panel requires Python 3.7 or above" "${RED}"
        exit 1
    fi

    if [ ! -d "db" ]; then
        mkdir "db"
    fi
    if [ ! -d "log" ]; then
        mkdir "log"
    fi

    print_box "Upgrading pip, Please Wait!" "${BLUE}"
    python3 -m pip install -U pip > /dev/null 2>&1

    print_box "Installing latest Python dependencies" "${CYAN}"
    python3 -m pip install -U -r requirements.txt > /dev/null 2>&1

    print_box "Wireguard Panel installed successfully!" "${LIGHT_GREEN}"
    print_box "Enter ./wgd.sh start to start the dashboard!" "${YELLOW}"
}

check_wgd_status(){
  if test -f "$PID_FILE"; then
    if ps aux | grep -v grep | grep $(cat ./gunicorn.pid)  > /dev/null; then
    return 0
    else
      return 1
    fi
  else
    if ps aux | grep -v grep | grep '[p]ython3 '$app_name > /dev/null; then
      return 0
    else
      return 1
    fi
  fi
}

certbot_create_ssl () {
  certbot certonly --config ./certbot.ini --email "$EMAIL" --work-dir $cb_work_dir --config-dir $cb_config_dir --domain "$SERVERURL"
}

certbot_renew_ssl () {
  certbot renew --work-dir $cb_work_dir --config-dir $cb_config_dir
}

print_box() {
  local text="$1"
  local color="$2"
  local width=$((${#text} + 4))
  local dashes=$(printf "%-${width}s" "-" | tr ' ' "~")
  
  printf "${color}╭${dashes}╮${NC}\n"
  printf "${color}│  ${text}  │${NC}\n"
  printf "${color}╰${dashes}╯${NC}\n"
}

gunicorn_start() {
  GREEN='\033[92m'
  YELLOW='\033[93m'
  BLUE='\033[96m'
  NC='\033[0m'

  print_box "Starting Wireguard Panel with Gunicorn in the background." "$YELLOW"
  
  if [ ! -d "log" ]; then
    mkdir "log"
  fi

  d=$(date '+%Y%m%d%H%M%S')

  if [[ $USER == root ]]; then
    export PATH=$PATH:/usr/local/bin:$HOME/.local/bin
  fi

  gunicorn --access-logfile log/access_"$d".log \
  --error-logfile log/error_"$d".log 'dashboard:run_dashboard()'

  print_box "Log files are under log/" "$YELLOW"
}

gunicorn_stop () {
  kill $(cat ./gunicorn.pid)
}

start_wgd () {
    gunicorn_start
}

stop_wgd() {
  if test -f "$PID_FILE"; then
    gunicorn_stop
  else
    kill "$(ps aux | grep "[p]ython3 $app_name" | awk '{print $2}')"
  fi
}

start_wgd_debug() {

    YELLOW='\033[0;33m'
    BLUE='\033[0;34m'
    BOLD='\033[1m'
	GREEN='\033[92m'
    RESET='\033[0m'

print_box() {
  local text="$1"
  local color="$2"
  local width=$((${#text} + 4))
  local dashes=$(printf "%-${width}s" "-" | tr ' ' "-")
  
  printf "${color}╔${dashes}╗${RESET}\n"
  printf "${color}║  ${text}  ║${RESET}\n"
  printf "${color}╚${dashes}╝${RESET}\n"
}
    dashes=$(printf "%-${logo_width}s" "─" | tr ' ' "─")

    printf "%s\n" "$dashes"
    print_box "Wireguard Panel in the foreground." "${GREEN}"
    python3 "$app_name"
    printf "%s\n" "$dashes"
}

update_wgd() {
  new_ver=$(python3 -c "import json; import urllib.request; data = urllib.request.urlopen('https://api.github.com/repos/amirmbn/WireGuard-Dashboard.git').read(); output = json.loads(data);print(output['tag_name'])")
  printf "%s\n" "$dashes"
  printf "| Are you sure you want to update to the %s? (Y/N): " "$new_ver"
  read up
  if [ "$up" = "Y" ]; then
    printf "| Shutting down Wireguard Panel...                             |\n"
    if check_wgd_status; then
      stop_wgd
    fi
    mv wgd.sh wgd.sh.old
    printf "| Downloading %s from GitHub...                            |\n" "$new_ver"
    git stash > /dev/null 2>&1
    git pull https://github.com/amirmbn/WireGuard-Dashboard.git $new_ver --force >  /dev/null 2>&1
    printf "| Upgrading pip                                            |\n"
    python3 -m pip install -U pip > /dev/null 2>&1
    printf "| Installing latest Python dependencies                    |\n"
    python3 -m pip install -U -r requirements.txt > /dev/null 2>&1
    printf "| Update Successfully!                                     |\n"
    printf "%s\n" "$dashes"
    rm wgd.sh.old
  else
    printf "%s\n" "$dashes"
    printf "| Update Canceled.                                         |\n"
    printf "%s\n" "$dashes"
  fi
}

YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
GREEN='\033[92m'
NC='\033[0m'

print_box() {
  local text="$1"
  local color="$2"
  local width=$((${#text} + 4))
  local dashes=$(printf "%-${width}s" "-" | tr ' ' "-")
  
  printf "${color}╔${dashes}╗${NC}\n"
  printf "${color}║  ${text}  ║${NC}\n"
  printf "${color}╚${dashes}╝${NC}\n"
}

if [ "$#" != 1 ]; then
  help
else
  if [ "$1" = "start" ]; then
    if check_wgd_status; then
      printf "%s\n" "$dashes"
      printf "${GREEN}| Wireguard Panel is already running.                          ${NC}|\n"
      printf "%s\n" "$dashes"
    else
      printf "%s\n" "$dashes"
      print_box "Starting Wireguard Panel with Gunicorn in the background." "$BLUE"
      start_wgd
    fi
  elif [ "$1" = "stop" ]; then
    if check_wgd_status; then
      printf "%s\n" "$dashes"
      stop_wgd
      print_box "Wireguard Panel is stopped." "$GREEN"
      printf "%s\n" "$dashes"
    else
      printf "%s\n" "$dashes"
      print_box "Wireguard Panel is stopped." "$GREEN"
      printf "%s\n" "$dashes"
      printf "${GREEN}| Wireguard Panel is not running.                              ${NC}|\n"
      printf "%s\n" "$dashes"
    fi
  elif [ "$1" = "update" ]; then
    update_wgd
  elif [ "$1" = "install" ]; then
    printf "%s\n" "$dashes"
    install_wgd
    printf "%s\n" "$dashes"
  elif [ "$1" = "restart" ]; then
    if check_wgd_status; then
      printf "%s\n" "$dashes"
      stop_wgd
      print_box "Wireguard Panel is stopped." "$GREEN"                   
      sleep 4
      start_wgd
    else
      printf "%s\n" "$dashes"
      print_box "Wireguard Panel is not running. Starting it now." "$GREEN"
      start_wgd
    fi
  elif [ "$1" = "debug" ]; then
    if check_wgd_status; then
      printf "%s\n" "$dashes"
      printf "${GREEN}| Wireguard Panel is already running.                          ${NC}|\n"
    else
      printf "%s\n" "$dashes"
      print_box "Starting Wireguard Panel with Gunicorn in the background." "$BLUE"
      start_wgd_debug
    fi
  else
    help
  fi
fi
