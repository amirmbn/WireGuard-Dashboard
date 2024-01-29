# WireGuard Dashboard
مانیتورینگ WireGuard راحت نیست، باید وارد سرور شوید و wg show را تایپ کنید<br>

به همین دلیل من این پلتفرم را برای مشاهده تمام تنظیمات و مدیریت آنها به روشی ساده تر ایجاد کردم
<br>
<br>

## Install Manually

<div align="right">


 - سرور را اپدیت کنید و وایرگارد را نصب کنید
<div align="left">
 
```
apt update -y
apt install wireguard -y
```
<div align="right">
 
 - با دستور زیر پرایوت کی بسازید و در یک جا یادداشتش کنید
 
 
<div align="left">
 
```
wg genkey | sudo tee /etc/wireguard/server_private.key
```
<div align="right">


- دریافت اینترفیس default، عبارت بعد از dev میشه اسم اینترفیس شما (مثل eth0)
<div align="left">
 
```
ip route list default
```
<div align="right">


- با دستور زیر وارد مسیر کانفیگ وایرگارد بشوید
<div align="left">
 
```
nano /etc/wireguard/wg0.conf
```
<div align="right">

- داخلش متن زیر را کپی کنید
<div align="left">
  
```
[Interface]
Address = 176.44.44.1/24
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
<div align="right">

- پورت وایرگارد در اینجا 40600 است، میتوانید پورت دیگری انتخاب کنید
- دقت کنید برای سرور های دیجیتال اوشن،  از پرایوت ایپی دیگری استفاده نمایید
- پرایوت کی که ساخته بودید را به جای YOUR_GENERATED_PRIVATE_KEY قرار دهید
- در اینجا نام اینترفیس را به صورت پیش فرض eth0 قرار دادیم، اگر اینترفیس شما متفاوت است دستور بالا را ادیت کنید
- برای ساختن اینترفیس های بیشتر و با پورت های مختلف با همین روش بالا انجام بدید و فقط نام و پورت و ایپی رو عوض کنید
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
```
<div align="right">

- به پنل خودتون با http://Your_Server_IP:1000 وارد شوید. نام کاربری admin و رمز عبور 1234 میباشد
- درصورت تانل، داخل تنظیمات Peer Remote Endpoint را به IP ایران تغییر دهید
- برای تنظیمات تانل سرورهای ایران و خارج به [این لینک](https://github.com/amirmbn/UDP2RAW) مراجعه کنید
- اگر به مشکل internal error در زمان لود پنل خوردید، سرور را یک بار ریبوت کنید و سپس دستور زیر را بزنید
<div align="left">
 
```
cd src
./wgd.sh restart
```
</div>
