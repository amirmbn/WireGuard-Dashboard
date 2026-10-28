# WireGuard Dashboard ![GitHub Downloads](https://img.shields.io/github/downloads/amirmbn/WireGuard-Dashboard/total)
Latest Version: 4.0.0 (28.10.2026)<br>
v4.0.0 — Major Core Rewrite: Blazing Fast Node.js & React Architecture 🚀<br><br>

انتشار نسخه 4 — یک تحول عظیم در هسته و عملکرد!

مانیتورینگ WireGuard راحت نیست،

به همین دلیل من این پلتفرم را برای مشاهده تمام تنظیمات و مدیریت آنها به روشی ساده تر ایجاد کردم

امکان تهیه نسخه پشتیبان (Backup) و بازگردانی (Restore) به پنل اضافه شد. اکنون می‌توانید تنها با فشردن یک دکمه در بخش تنظیمات پنل، نسخه پشتیبان را دانلود کرده و به‌راحتی آن را روی سرور جدید آپلود و بازیابی کنید.

سیستم عامل های قابل استفاده: اوبونتو 20+ / دبیان 11+
<br>
<br>

## Automatic Installation

<div align="right">

- دستور زیر را کپی و در سرور مجازی خود Past کنید
</div>

<div align="left">
 
```
bash <(curl -Ls https://raw.githubusercontent.com/amirmbn/WireGuard-Dashboard/main/install.sh)
```
</div>
<div align="right">

⚠️ اگر قصد دارید از یک سرور جدید برای ریستور بک‌آپ استفاده کنید، ابتدا دستور زیر را اجرا کنید. پس از اجرا، هنگام پاسخ به سؤالات، نام اینترفیس و پورت WireGuard را متفاوت از تنظیمات سرور قبلی وارد کنید.

مثلاً در اینجا نام اینترفیس را `backup` و پورت را `2010` وارد کرده‌ایم:

```text
Enter desired WireGuard interface name (default: int1): backup
Enter desired WireGuard UDP port (default: 1080): 2010
```
- نام کاربری، رمز عبور و پورت در ابتدا بعد از اجرا اسکریپت بالا از شما پرسیده میشود.
- درصورت تانل، داخل تنظیمات پنل بخش "آی‌پی یا دامنه سرور تانل" IP ایران را وارد کنید
- برای راه اندازی تانل سرور ایران و خارج میتوانید از [UDP2RAW](https://github.com/amirmbn/UDP2RAW) استفاده کنید
- می‌توانید از تانل فوروارد [Natix](https://github.com/amirmbn/Natix) هم استفاده کنید؛ این ابزار امکان تنظیم MTU و DNS را هم دارد.
</div><br>


## 💰 Support This Project with Crypto
[![Donate BTC](https://img.shields.io/badge/Donate-BTC-orange)](https://www.blockchain.com/btc/address/bc1qul4v4rudyl7lacekfp8yda5sc5575mh2tzv9au)
[![Donate ETH](https://img.shields.io/badge/Donate-ETH-purple)](https://etherscan.io/address/0x79Bb867649277272C65ae047083A36ea91DFeE5B)
[![Donate TRX](https://img.shields.io/badge/Donate-TRX-red)](https://tronscan.org/#/address/TVdJjbJLMdSLzEZEsWuCutjo5RimaiATd6)
[![Donate USDT](https://img.shields.io/badge/Donate-USDT-green)](https://tronscan.org/#/address/TVdJjbJLMdSLzEZEsWuCutjo5RimaiATd6)

- Bitcoin `bc1qul4v4rudyl7lacekfp8yda5sc5575mh2tzv9au`

- Ethereum `0x79Bb867649277272C65ae047083A36ea91DFeE5B`

- Tron `TVdJjbJLMdSLzEZEsWuCutjo5RimaiATd6`

- Tether (TRC20) `TVdJjbJLMdSLzEZEsWuCutjo5RimaiATd6`

Thank you for your support!
