# Coolify ile Yayına Alma

Bu proje Next.js uygulamasıdır ve her site için **ayrı WordPress Docker stack**'i oluşturur. Coolify'da çalışması için uygulama container'ının **Docker socket** erişimine ve **kalıcı `data/` diskine** ihtiyacı vardır.

## Ön koşullar

- Coolify kurulu bir VPS (Ubuntu 22.04+ önerilir)
- Sunucuda Docker zaten çalışıyor (Coolify bunu sağlar)
- Google Gemini API key
- Git deposu (GitHub / GitLab) bu projeyi içeriyor

## 1. Repoyu Coolify'a bağlayın

1. Coolify → **Projects** → yeni proje
2. **+ New Resource** → **Application**
3. Kaynak: Git repository → bu repo
4. Build pack: **Dockerfile** (kök dizindeki `Dockerfile`)
5. Port: **3100** (set the same value in Coolify **and** `PORT=3100` in env vars)

## 2. Ortam değişkenleri

Coolify → Application → **Environment Variables**:

| Değişken | Zorunlu | Örnek | Açıklama |
|----------|---------|-------|----------|
| `GEMINI_API_KEY` | Evet | `AIza...` | Gemini API |
| `SESSION_SECRET` | Evet | `openssl rand -hex 32` çıktısı | Oturum imzalama |
| `ADMIN_EMAIL` | Evet | `admin@solver.com` | İlk admin e-posta |
| `ADMIN_PASSWORD` | Evet | güçlü şifre | İlk admin şifre |
| `ADMIN_NAME` | Hayır | `Admin` | Admin görünen ad |
| `APP_URL` | Evet | `https://builder.sizin-domain.com` | Ana uygulama URL'si |
| `WORDPRESS_PUBLIC_HOST` | Evet | `203.0.113.10` veya sunucu IP | WP sitelerinin host'u |
| `WORDPRESS_URL_SCHEME` | Hayır | `http` veya `https` | WP site URL şeması |
| `WORDPRESS_REACHABILITY_HOST` | Hayır | `host.docker.internal` | Container içinden WP sağlık kontrolü (genelde gerekmez) |
| `NODE_ENV` | Evet | `production` | Production modu |

`WORDPRESS_PUBLIC_HOST` için IP kullanıyorsanız genelde `WORDPRESS_URL_SCHEME=http` yeterlidir. Her WordPress sitesi `http://IP:8001`, `http://IP:8002` … adresinde açılır.

## 3. Kalıcı depolama (volume) — kritik

Uygulama Docker socket ile **host üzerinde** WordPress container'ı oluşturur. `docker-compose.yml` dosyası host'ta **aynı mutlak yolla** görünmelidir; aksi halde kurulum sessizce başarısız olur ve `watch` ile `_wordpress` container'ı hiç görünmez.

### Adım A — Host'ta klasör oluşturun (SSH)

```bash
mkdir -p /app/data/runtime
chmod 755 /app/data
```

### Adım B — Coolify Persistent Storage

Application → **Persistent Storage** → mevcut volume'u **silin** ve yeniden ekleyin:

| Alan | Değer |
|------|--------|
| **Source Path** | `/app/data` |
| **Destination Path** | `/app/data` |

> Source Path **boş bırakılmamalı**. Coolify'ın yönettiği anonim volume (`bs0gaoolfp9deytx887ujaan-data` gibi) host'ta `/app/data` yoluna denk gelmez; Docker compose dosyasını bulamaz.

İsteğe bağlı: farklı host yolu kullanacaksanız hem Source hem Destination aynı olsun (ör. `/data/ai-wp` → `/data/ai-wp`) ve `WP_DATA_ROOT=/data/ai-wp` environment variable ekleyin.

Bu olmadan her deploy'da kullanıcılar silinmez (volume bağlıysa) ancak **WordPress stack'leri hiç oluşmaz**.

## 4. Docker socket (kritik)

Uygulama, kullanıcı başına WordPress container'ı oluşturmak için host Docker'ına erişmelidir.

Coolify 4'te **Custom Docker Options** bazen container'a uygulanmaz. Socket'i **Persistent Storage** ile bağlayın:

Application → **Persistent Storage** → **+ Add** (veri volume'una ek olarak ikinci kayıt):

| Alan | Değer |
|------|--------|
| **Source Path** | `/var/run/docker.sock` |
| **Destination Path** | `/var/run/docker.sock` |

Application → **Advanced** → **Custom Docker Options**:

```text
--add-host=host.docker.internal:host-gateway
```

Deploy sonrası doğrulama (builder container adınızı yazın):

```bash
docker exec bs0gaoolfp9deytx887ujaan-XXXXXXXX sh -c 'ls -la /var/run/docker.sock && docker ps | head -3'
```

`No such file or directory` görürseniz socket hâlâ bağlı değildir.

> **Güvenlik:** Docker socket tam host kontrolü verir. Yalnızca güvendiğiniz sunucuda ve bu uygulama için kullanın.

### Environment Variables — Coolify `=` tuzağı

Coolify arayüzünde değerlerin başına yanlışlıkla `=` eklenebilir. **Şöyle olmamalı:**

| Yanlış | Doğru |
|--------|--------|
| `=188.34.207.213` | `188.34.207.213` |
| `http://` | `http` |

Yanlış değer `http://=188.34.207.213:8001` gibi bozuk site URL'si üretir.

## 5. Firewall — WordPress portları

Her site `8001–8999` aralığında bir port kullanır. Önizleme ve "Siteyi görüntüle" için bu aralığı açın:

```bash
# UFW örneği
sudo ufw allow 3100/tcp
sudo ufw allow 8001:8999/tcp
```

Coolify ana uygulamayı 443 üzerinden proxy'ler; WordPress portları doğrudan sunucu IP'si üzerinden erişilir.

## 6. Domain ve SSL

1. Ana uygulama için Coolify'da domain ekleyin (ör. `builder.example.com`)
2. SSL: Let's Encrypt (Coolify otomatik)
3. `APP_URL` değerini bu domain ile eşleştirin: `https://builder.example.com`

## 7. Deploy

1. **Deploy** butonuna basın
2. Loglarda `npm run build` ve container start başarılı olmalı
3. `https://builder.example.com` adresini açın
4. Kayıt olun / admin ile giriş yapın
5. Yeni site oluşturmayı deneyin

## 8. Sorun giderme

### "Docker komutu başarısız oldu" / `Cannot connect to the Docker daemon`

- `docker inspect <builder-container> --format '{{json .Mounts}}'` çıktısında `/var/run/docker.sock` görünmeli
- Container içinde `ls /var/run/docker.sock` başarısızsa → Bölüm 4'teki socket volume'u ekleyin (Custom Docker Options tek başına yetmeyebilir)
- Sunucuda `docker ps` çalışıyor mu
- Coolify loglarında `permission denied` varsa container'ı root ile çalıştırın

### "Site kuruluyor" ekranında takılı kalıyor / `watch` boş

**En sık sebep:** Persistent Storage Source Path boş — host'ta `/app/data` yok, Docker compose dosyasına erişilemiyor. Bölüm 3'teki `/app/data` → `/app/data` bind mount'u uygulayın.

Uygulama Coolify container'ında çalışırken WordPress stack'leri **host** üzerinde port yayınlar (`8003` gibi). Güncel kod `docker exec` ile WP container'ını da kontrol eder — **yeniden deploy** edin.

Hâlâ takılıysa sunucuda SSH ile:

```bash
docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}" | grep wordpress
curl -I http://127.0.0.1:8003
sudo ufw status | grep 800
```

- `docker ps` boşsa → Docker socket volume eksik veya izin hatası (Coolify loglarına bakın)
- `curl` host'ta çalışıyor ama tarayıcıda açılmıyorsa → firewall (aşağıdaki bölüm)

### Önizleme boş / bozuk (404, CSS yüklenmiyor, çift menü)

HTTPS builder (`https://wp.withsolver.com`) üzerinde önizleme, WordPress'i doğrudan iframe ile değil **`/site-preview/{projeId}` proxy** üzerinden yükler. Böylece mixed content engeli olmaz ve CSS/görseller aynı origin üzerinden gelir.

| Belirti | Çözüm |
|---------|--------|
| Önizleme paneli boş veya 404 | `WORDPRESS_PUBLIC_HOST` sunucunun dışarıdan erişilebilir IP/domain olmalı (`localhost` production'da çalışmaz) |
| CSS/görseller eksik | Coolify'da **Redeploy** + tarayıcıda hard refresh (`Ctrl+Shift+R`) |
| Site linki `http://localhost:800x` gösteriyor | `WORDPRESS_PUBLIC_HOST` ayarlayıp redeploy; proje açıldığında URL otomatik düzelir |
| "Siteyi görüntüle" çalışıyor, panel bozuk | Firewall'da `8001-8999` açık mı kontrol edin |

Kontrol listesi:

- `APP_URL` tam HTTPS domain olmalı: `https://wp.withsolver.com` (sonunda `/` yok)
- `WORDPRESS_PUBLIC_HOST` = sunucu IP (ör. `188.34.207.213`) — değerin başında `=` olmamalı
- `WORDPRESS_URL_SCHEME=http` (port tabanlı WP erişimi için)
- Coolify sunucusunda `curl -I http://127.0.0.1:8001` ile WP container yanıt veriyor mu

### Oturum / giriş sorunu

- `SESSION_SECRET` ayarlı ve deploy sonrası değişmemiş olmalı
- `APP_URL` gerçek domain ile aynı olmalı

### Gemini / görsel üretilmiyor

- `GEMINI_API_KEY` geçerli mi
- Coolify env'de key'in tırnak veya boşluk hatası yok mu

## 9. Yerel geliştirme vs production

| Ortam | `WORDPRESS_PUBLIC_HOST` | Site URL |
|-------|-------------------------|----------|
| Yerel (`npm run dev`) | (boş → localhost) | `http://localhost:8001` |
| Coolify | Sunucu IP veya domain | `http://IP:8001` |

## 10. Güncelleme

Coolify'da yeni commit push edildiğinde **Redeploy** yeterlidir. `/app/data` volume'u bağlıysa mevcut projeler korunur.

---

**Not:** İleride her WordPress sitesi için ayrı subdomain (`site1.builder.com`) istenirse Traefik dinamik routing ve kod değişikliği gerekir. Mevcut mimari port tabanlıdır ve VPS + açık port aralığı ile Coolify'da çalışır.
