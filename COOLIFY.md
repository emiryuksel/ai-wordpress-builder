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
| `NODE_ENV` | Evet | `production` | Production modu |

`WORDPRESS_PUBLIC_HOST` için IP kullanıyorsanız genelde `WORDPRESS_URL_SCHEME=http` yeterlidir. Her WordPress sitesi `http://IP:8001`, `http://IP:8002` … adresinde açılır.

## 3. Kalıcı depolama (volume)

Application → **Storages** / **Persistent Storage**:

| Container path | Açıklama |
|----------------|----------|
| `/app/data` | Projeler, kullanıcılar, runtime |

Bu olmadan her deploy'da kullanıcılar ve siteler silinir.

## 4. Docker socket (kritik)

Uygulama, kullanıcı başına WordPress container'ı oluşturmak için host Docker'ına erişmelidir.

Application → **Advanced** → **Custom Docker Options** (veya Coolify sürümünüze göre **Volumes**):

```text
-v /var/run/docker.sock:/var/run/docker.sock
```

> **Güvenlik:** Docker socket tam host kontrolü verir. Yalnızca güvendiğiniz sunucuda ve bu uygulama için kullanın.

Container'ın root olarak çalışması socket erişimi için daha sorunsuzdur (Coolify varsayılanı genelde uygundur).

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

### "Docker komutu başarısız oldu"

- Docker socket volume bağlı mı kontrol edin
- Sunucuda `docker ps` çalışıyor mu
- Coolify loglarında `permission denied` varsa container'ı root ile çalıştırın

### Önizleme boş / site açılmıyor

- `WORDPRESS_PUBLIC_HOST` sunucunun **dışarıdan erişilebilir IP/domain** olmalı (`localhost` production'da çalışmaz)
- Firewall'da `8001-8999` açık mı
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
