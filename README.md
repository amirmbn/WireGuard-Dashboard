<div align="right">

[English](README.md) | [فارسی](README.fa.md)

</div>

# WireGuard Dashboard ![GitHub Downloads](https://img.shields.io/github/downloads/amirmbn/WireGuard-Dashboard/total)

**Latest Version:** 4.0.1 (October 29, 2026)  
**v4 — Major Core Rewrite:** Blazing-fast Node.js & React architecture 🚀

WireGuard monitoring and management can be challenging. WireGuard Dashboard makes it easier to view and manage your WireGuard configurations from one place.

Version 4 introduces a major core rewrite and adds **Backup & Restore** support. You can download a backup from the dashboard settings, then upload and restore it on a new server.

**Supported operating systems:** Ubuntu 20+ / Debian 11+

## Automatic Installation

Run the following command on your server:

```bash
bash <(curl -Ls https://raw.githubusercontent.com/amirmbn/WireGuard-Dashboard/main/install.sh)
```

During installation, you will be prompted to set the username, password, and port.

### Tunnel setup

- If you use a tunnel, enter the Iranian server's IP address in the dashboard settings under **Tunnel Server IP or Domain**.
- To set up a tunnel between an Iranian server and an overseas server, you can use [UDP2RAW](https://github.com/amirmbn/UDP2RAW).
- You can also use [Natix](https://github.com/amirmbn/Natix) for tunnel forwarding. It also supports MTU and DNS configuration.

## Backup and Restore

To restore a backup on a new server, run the installation command first. When prompted, use a different interface name and WireGuard UDP port from those used on the original server.

For example, enter `backup` as the interface name and `2010` as the UDP port:

```text
Enter desired WireGuard interface name (default: int1): backup
Enter desired WireGuard UDP port (default: 1080): 2010
```

## 💰 Support This Project with Crypto

[![Donate BTC](https://img.shields.io/badge/Donate-BTC-orange)](https://www.blockchain.com/btc/address/bc1qul4v4rudyl7lacekfp8yda5sc5575mh2tzv9au)
[![Donate ETH](https://img.shields.io/badge/Donate-ETH-purple)](https://etherscan.io/address/0x79Bb867649277272C65ae047083A36ea91DFeE5B)
[![Donate TRX](https://img.shields.io/badge/Donate-TRX-red)](https://tronscan.org/#/address/TVdJjbJLMdSLzEZEsWuCutjo5RimaiATd6)
[![Donate USDT](https://img.shields.io/badge/Donate-USDT-green)](https://tronscan.org/#/address/TVdJjbJLMdSLzEZEsWuCutjo5RimaiATd6)

- **Bitcoin (BTC):** `bc1qul4v4rudyl7lacekfp8yda5sc5575mh2tzv9au`
- **Ethereum (ETH):** `0x79Bb867649277272C65ae047083A36ea91DFeE5B`
- **Tron (TRX):** `TVdJjbJLMdSLzEZEsWuCutjo5RimaiATd6`
- **Tether (USDT — TRC20):** `TVdJjbJLMdSLzEZEsWuCutjo5RimaiATd6`
