# WireGuard Dashboard
Latest Version 3.0.7 (15.05.2025)<br><br>

مانیتورینگ WireGuard راحت نیست، باید وارد سرور شوید و wg show را تایپ کنید

به همین دلیل من این پلتفرم را برای مشاهده تمام تنظیمات و مدیریت آنها به روشی ساده تر ایجاد کردم

سیستم عامل های قابل استفاده: اوبونتو 20 ~ 22 / دبیان 11 ( توصیه شده: اوبونتو 22 )
<br>
<br>

## Automatic Installation

<div align="right">
 
 - کد زیر را در سرور اوبونتو خود Past کنید
</div>

<div align="left">
 
```
sudo wget https://raw.githubusercontent.com/amirmbn/WireGuard-Dashboard/main/setup_wireguard.sh && sudo chmod +x setup_wireguard.sh && sudo ./setup_wireguard.sh
```
</div>
<div align="right">

- با استفاده از نام کاربری admin، رمز عبور 1234 و پورت 1000 ( Server-IP:1000 ) وارد پنل شوید.
- درصورت تانل، داخل تنظیمات Peer Remote Endpoint را به IP ایران تغییر دهید
- برای تنظیمات تانل سرورهای ایران و خارج به [این لینک](https://github.com/amirmbn/UDP2RAW) مراجعه کنید
- اگر از سرورهای دیجیتال اوشن استفاده میکنید، نصب دستی پنل وایرگارد را دنبال کنید.
</div><br>

--------------
<div align="left">
  <details>
    <summary><strong>Manual Installation</strong></summary>
   <br>
<div align="right">
 
 - سرور را اپدیت کنید و وایرگارد را نصب کنید
</div>
<div align="left">
 
```
apt update -y
apt install wireguard -y
```
</div>
<div align="right">
 
 - با دستور زیر پرایوت کی بسازید و در یک جا یادداشتش کنید
 
 
</div>
<div align="left">
 
```
wg genkey | sudo tee /etc/wireguard/server_private.key
```
</div>
<div align="right">


- دریافت اینترفیس default، عبارت بعد از dev میشه اسم اینترفیس شما (مثل eth0)
</div>
<div align="left">
 
```
ip route list default
```
</div>
<div align="right">


- با دستور زیر وارد مسیر کانفیگ وایرگارد بشوید
</div>
<div align="left">
 
```
nano /etc/wireguard/wg0.conf
```
</div>
<div align="right">

- داخلش متن زیر را کپی کنید
</div>
<div align="left">
  
```
[Interface]
Address = 172.20.0.1/24
PostUp = iptables -I INPUT -p udp --dport 40600 -j ACCEPT
PostUp = iptables -I FORWARD -i eth0 -o wg0 -j ACCEPT
PostUp = iptables -I FORWARD -i wg0 -j ACCEPT
PostUp = iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostUp = ip6tables -I FORWARD -i wg0 -j ACCEPT
PostUp = ip6tables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D INPUT -p udp --dport 40600 -j ACCEPT
PostDown = iptables -D FORWARD -i eth0 -o wg0 -j ACCEPT
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT
PostDown = iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE
PostDown = ip6tables -D FORWARD -i wg0 -j ACCEPT
PostDown = ip6tables -t nat -D POSTROUTING -o eth0 -j MASQUERADE
ListenPort = 40600
PrivateKey = YOUR_GENERATED_PRIVATE_KEY
SaveConfig = true
```
</div>
<div align="right">

- پورت وایرگارد در اینجا 40600 است، میتوانید پورت دیگری انتخاب کنید
- دقت کنید برای سرور های دیجیتال اوشن،  از پرایوت ایپی دیگری استفاده نمایید
- پرایوت کی که ساخته بودید را به جای YOUR_GENERATED_PRIVATE_KEY قرار دهید
- نام اینترفیس را به صورت پیش فرض eth0 قرار دادیم، اگر اینترفیس شما متفاوت است دستور بالا را ویرایش کنید
- برای ساختن اینترفیس های بیشتر با پورت های مختلف روش بالا رو انجام بدید فقط نام، پورت و IP رو عوض کنید
</div>
<div align="left">
 
```
apt update
apt install git
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
```
</div>
<div align="right">

- به پنل خودتون با http://Your_Server_IP:1000 وارد شوید. نام کاربری admin و رمزعبور 1234 است
- درصورت تانل، داخل تنظیمات Peer Remote Endpoint را به IP ایران تغییر دهید
- برای تنظیمات تانل سرورهای ایران و خارج به [این لینک](https://github.com/amirmbn/UDP2RAW) مراجعه کنید
<div>
  </details>
</div>

--------------
<div align="left">
  <details>
    <summary><strong>Uninstall WireGuard Panel</strong></summary>
   <br>
<div align="right">

 
 - برای حذف کامل وایرگارد و پنل فارسی کد زیر را در سرور اوبونتو خود وارد کنید
</div>
<div align="left">
 
```
cd
rm -rf src
rm -rf /etc/wireguard
sudo apt remove wireguard -y
```
</div>
<div align="right">
 
 - اگر بعد از حذف، قصد نصب مجدد پنل را دارید کد ریز را قبل از نصب وارد کنید
 
 
</div>
<div align="left">
 
```
mkdir /etc/wireguard
```

  </details>
</div>

--------------
<br>

## Preview

<div align="right">عکس های زیر مربوط به نسخه 3.0.6 است و امکان دارد تغییراتی با نسخه نصب شده شما داشته باشد</div>

![Login](./images/login.png)
![Dashboard](./images/dashboard.png)
![Configuration](./images/configuration.png)
![Setting](./images/setting.png)

</div>
