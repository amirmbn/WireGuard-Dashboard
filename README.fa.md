<div dir="rtl" align="right">

[English](README.md) | [فارسی](README.fa.md)

</div>

# WireGuard Dashboard ![GitHub Downloads](https://img.shields.io/github/downloads/amirmbn/WireGuard-Dashboard/total)

**آخرین نسخه:** 4.0.1 (۲۹ اکتبر ۲۰۲۶)  
**نسخه ۴ — بازنویسی کامل هسته:** معماری سریع Node.js و React 🚀

مانیتورینگ و مدیریت WireGuard می‌تواند دشوار باشد. WireGuard Dashboard این کار را ساده‌تر می‌کند و امکان مشاهده و مدیریت تنظیمات WireGuard را از یک پنل فراهم می‌سازد.

در نسخه ۴، هسته پروژه به‌طور کامل بازنویسی شده و قابلیت **پشتیبان‌گیری و بازیابی (Backup & Restore)** نیز اضافه شده است. می‌توانید از بخش تنظیمات پنل نسخه پشتیبان را دانلود کنید و سپس آن را روی سرور جدید بارگذاری و بازیابی کنید.

**سیستم‌عامل‌های پشتیبانی‌شده:** Ubuntu 20+ / Debian 11+

## نصب خودکار (Automatic Installation)

دستور زیر را روی سرور خود اجرا کنید:

```bash
bash <(curl -Ls https://raw.githubusercontent.com/amirmbn/WireGuard-Dashboard/main/install.sh)
```

در طول نصب، نام کاربری، رمز عبور و پورت از شما پرسیده می‌شود.

### راه‌اندازی تانل

- اگر از تانل استفاده می‌کنید، آدرس IP سرور ایران را در تنظیمات پنل و در بخش **آی‌پی یا دامنه سرور تانل** وارد کنید.
- برای راه‌اندازی تانل بین سرور ایران و خارج می‌توانید از [UDP2RAW](https://github.com/amirmbn/UDP2RAW) استفاده کنید.
- همچنین می‌توانید از [Natix](https://github.com/amirmbn/Natix) برای تانل فوروارد استفاده کنید. این ابزار از تنظیم MTU و DNS نیز پشتیبانی می‌کند.

## پشتیبان‌گیری و بازیابی (Backup and Restore)

برای بازیابی بک‌آپ روی سرور جدید، ابتدا دستور نصب را اجرا کنید. هنگام پاسخ به پرسش‌های نصب، نام اینترفیس و پورت UDP مربوط به WireGuard را متفاوت از مقادیر سرور قبلی وارد کنید.

برای مثال، نام اینترفیس را `backup` و پورت UDP را `2010` وارد کنید:

```text
Enter desired WireGuard interface name (default: int1): backup
Enter desired WireGuard UDP port (default: 1080): 2010
```

## 💰 حمایت از پروژه با رمزارز

[![Donate BTC](https://img.shields.io/badge/Donate-BTC-orange)](https://www.blockchain.com/btc/address/bc1qul4v4rudyl7lacekfp8yda5sc5575mh2tzv9au)
[![Donate ETH](https://img.shields.io/badge/Donate-ETH-purple)](https://etherscan.io/address/0x79Bb867649277272C65ae047083A36ea91DFeE5B)
[![Donate TRX](https://img.shields.io/badge/Donate-TRX-red)](https://tronscan.org/#/address/TVdJjbJLMdSLzEZEsWuCutjo5RimaiATd6)
[![Donate USDT](https://img.shields.io/badge/Donate-USDT-green)](https://tronscan.org/#/address/TVdJjbJLMdSLzEZEsWuCutjo5RimaiATd6)

- **Bitcoin (BTC):** `bc1qul4v4rudyl7lacekfp8yda5sc5575mh2tzv9au`
- **Ethereum (ETH):** `0x79Bb867649277272C65ae047083A36ea91DFeE5B`
- **Tron (TRX):** `TVdJjbJLMdSLzEZEsWuCutjo5RimaiATd6`
- **Tether (USDT — TRC20):** `TVdJjbJLMdSLzEZEsWuCutjo5RimaiATd6`
