# WireGuard Dashboard

<div align="right">
مانیتورینگ WireGuard راحت نیست، باید وارد سرور شوید و دستور wg show را اجرا کنید.

به همین دلیل این پلتفرم را برای مشاهده تمام تنظیمات و مدیریت آنها به روشی ساده‌تر ایجاد کردم.
</div>

### سیستم عامل‌های قابل استفاده
- اوبونتو 20 ~ 22
- دبیان 11
- **توصیه شده: اوبونتو 22**

<br>

## نصب خودکار

<div align="right">
کد زیر را در سرور اوبونتو خود وارد کنید:
</div>

```bash
sudo wget https://raw.githubusercontent.com/amirmbn/WireGuard-Dashboard/main/setup_wireguard.sh && sudo chmod +x setup_wireguard.sh && sudo ./setup_wireguard.sh
```

<div align="right">

- به پنل خود با آدرس `http://Your_Server_IP:1000` وارد شوید. نام کاربری `admin` و رمز عبور `1234` است.
- درصورت استفاده از تانل، داخل تنظیمات Peer Remote Endpoint را به IP ایران تغییر دهید.
- برای تنظیمات تانل سرورهای ایران و خارج به [این لینک](https://github.com/amirmbn/UDP2RAW) مراجعه کنید.
- اگر از سرورهای دیجیتال اوشن استفاده می‌کنید، روش نصب دستی پنل وایرگارد را دنبال کنید.
</div>

<br>

---
<div align="right">
<details>
<summary><strong>نصب دستی پنل وایرگارد</strong></summary>

<div align="right">

### 1. سرور را به‌روز کنید و وایرگارد را نصب کنید
</div>

```bash
apt update -y
apt install wireguard -y
```

<div align="right">

### 2. کلید خصوصی بسازید و آن را یادداشت کنید
</div>

```bash
wg genkey | sudo tee /etc/wireguard/server_private.key
```

<div align="right">

### 3. دریافت اینترفیس پیش‌فرض
عبارت بعد از dev نام اینترفیس شما خواهد بود (مثلاً eth0)
</div>

```bash
ip route list default
```

<div align="right">

### 4. ایجاد فایل پیکربندی وایرگارد
</div>

```bash
nano /etc/wireguard/wg0.conf
```

<div align="right">
متن زیر را در فایل کپی کنید:
</div>

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

<div align="right">

**نکات مهم:**
- پورت وایرگارد در اینجا 40600 است، می‌توانید پورت دیگری انتخاب کنید.
- برای سرورهای دیجیتال اوشن، از آدرس IP خصوصی دیگری استفاده نمایید.
- کلید خصوصی که ساخته‌اید را به جای `YOUR_GENERATED_PRIVATE_KEY` قرار دهید.
- نام اینترفیس به صورت پیش‌فرض `eth0` قرار داده شده، اگر اینترفیس شما متفاوت است، دستورات بالا را ویرایش کنید.
- برای ساختن اینترفیس‌های بیشتر با پورت‌های مختلف، از همین روش استفاده کنید و فقط نام، پورت و IP را تغییر دهید.
</div>

<div align="right">

### 5. نصب پنل مدیریت وایرگارد
</div>

```bash
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

<div align="right">

- به پنل خود با آدرس `http://Your_Server_IP:1000` وارد شوید. نام کاربری `admin` و رمز عبور `1234` است.
- درصورت استفاده از تانل، داخل تنظیمات Peer Remote Endpoint را به IP ایران تغییر دهید.
- برای تنظیمات تانل سرورهای ایران و خارج به [این لینک](https://github.com/amirmbn/UDP2RAW) مراجعه کنید.
</div>

</details>

---

<div align="right">

## حذف کامل وایرگارد و پنل فارسی
</div>

```bash
cd
rm -rf src
rm -rf /etc/wireguard
sudo apt remove wireguard -y
```

<div align="right">
اگر بعد از حذف، قصد نصب مجدد پنل را دارید، کد زیر را قبل از نصب وارد کنید:
</div>

```bash
mkdir /etc/wireguard
```

## پیش‌نمایش

![Login](./images/login.png)
![Dashboard](./images/dashboard.png)
![Configuration](./images/configuration.png)
![Setting](./images/setting.png)
