# UDP Tunnel

<div align="right">


 - سرور ایران را ابتدا آپدیت و بعد شروع به نصب تانل کنید
<div align="left">
 
```
apt update -y && apt upgrade -y
```
<div align="right">


 - اسکریپت راه اندازی تانل بین سرور ایران و خارج
<div align="left">
 
```
bash <(curl -Ls https://raw.githubusercontent.com/opiran-club/wgtunnel/main/udp2raw.sh --ipv4)
```
<div align="right">


 - شماره 1 مربوط به نصب udp2raw است
 - در ادامه شماره 2 و 3 مربوط به تنظیمات سرور ایران و خارج میباشد.
