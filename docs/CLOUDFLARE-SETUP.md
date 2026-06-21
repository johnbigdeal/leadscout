# Configuración de Dominio con Cloudflare + Vercel

## Dominio Principal: `leadscout.lat`

---

## Paso 1: Agregar dominio en Cloudflare

1. Crear cuenta en [cloudflare.com](https://cloudflare.com) (gratis)
2. Hacer clic en **Add a Site**
3. Escribir: `leadscout.lat`
4. Seleccionar plan **Free**
5. Cloudflare escaneará los registros existentes

---

## Paso 2: Configurar DNS en Cloudflare

Eliminá todos los registros existentes y agregá estos:

### Opción A: Para dominio apex (leadscout.lat)

```
Type: A
Name: @
IPv4 address: 76.76.21.21
Proxy status: Proxied (naranja)
TTL: Auto
```

```
Type: CNAME
Name: www
Target: cname.vercel-dns.com
Proxy status: Proxied (naranja)
TTL: Auto
```

### Opción B: Para subdominios (cuando ya funcione el apex)

Cuando crees un website para un cliente (ej. `pedro.leadscout.lat`), la app creará automáticamente:

```
Type: CNAME
Name: pedro
Target: cname.vercel-dns.com
Proxy status: Proxied (naranja)
TTL: Auto
```

**Nota:** La app ya hace esto automáticamente via API cuando usás **Settings → Dominios → Agregar subdominio**.

---

## Paso 3: Cambiar Nameservers

Cloudflare te dará 2 nameservers. Ejemplo:

```
dana.ns.cloudflare.com
greg.ns.cloudflare.com
```

Andá a tu registrador de `leadscout.lat` (Namecheap, GoDaddy, Nic.mx, etc.) y reemplazá los nameservers actuales por los de Cloudflare.

**Esperar propagación:** Puede tardar desde minutos hasta 24 horas.

---

## Paso 4: Configurar SSL/TLS en Cloudflare

1. En Cloudflare Dashboard, andá a **SSL/TLS**
2. Modo de cifrado: **Full (strict)** o **Full**
3. En **Edge Certificates**: confirmá que hay un certificado activo para `leadscout.lat` y `*.leadscout.lat`

---

## Paso 5: Agregar dominio en Vercel

1. Andá a [vercel.com/dashboard](https://vercel.com/dashboard)
2. Seleccioná el proyecto **leadscout**
3. **Settings** → **Domains**
4. Escribí `leadscout.lat` y clic en **Add**
5. Escribí `www.leadscout.lat` y clic en **Add**

Vercel detectará que Cloudflare gestiona el DNS y te dará opciones. Elegí:
- **Recommended**: " leadscout.lat is managed by Cloudflare. We'll configure it automatically."

Si te pide verificación, asegurate de que el registro A apunte a `76.76.21.21`.

---

## Paso 6: Variables de entorno en Vercel

En el dashboard de Vercel, andá a **Settings** → **Environment Variables**:

```
NEXT_PUBLIC_APP_URL = https://leadscout.lat
```

**Importante:** Re-deploy después de agregar la variable.

```bash
npx vercel --prod
```

---

## Paso 7: Conectar Cloudflare API en la App

1. En Cloudflare Dashboard:
   - Andá a **My Profile** (arriba a la derecha)
   - **API Tokens** → **Create Token**
   - Usá el template: **Edit zone DNS**
   - O creá uno custom con:
     - Zone:Read
     - DNS:Edit
   - Zone Resources: Include - All zones
   - Copiá el token

2. Copiá también el **Account ID** (aparece en la sidebar derecha del dashboard)

3. En la app LeadScout:
   - Andá a **Settings** → **Dominios**
   - Pegá el **Account ID** y **API Token**
   - Clic en **Conectar**

---

## Paso 8: Crear subdominios para clientes

Una vez conectado:

1. En **Settings** → **Dominios** vas a ver `leadscout.lat` en la lista
2. Andá a **Websites**
3. Creá un nuevo website o editá uno existente
4. Clic en **Publicar**
5. Seleccioná crear subdominio: `pedro.leadscout.lat`
6. La app creará automáticamente el DNS en Cloudflare

---

## Verificación

Comandos para verificar:

```bash
# Verificar DNS
dig leadscout.lat +short
# Debería devolver: 104.21.xx.xx (IP de Cloudflare)

# Verificar subdominio
dig pedro.leadscout.lat +short
# Debería devolver: 104.21.xx.xx (IP de Cloudflare)

# Verificar HTTPS
curl -I https://leadscout.lat
# Debería devolver: HTTP/2 200
```

---

## Troubleshooting

### "Too many redirects"
- En Cloudflare SSL/TLS, cambiar de "Flexible" a "Full (strict)"
- Asegurate que el registro A apunte a `76.76.21.21`, no a la IP de Vercel directamente

### "DNS_PROBE_FINISHED_NXDOMAIN"
- Los nameservers no se propagaron todavía. Esperá 24h.
- Verificá con `whois leadscout.lat | grep "Name Server"`

### SSL no funciona
- En Cloudflare, asegurate que esté en modo **Proxied** (nube naranja)
- Esperá a que Cloudflare emita el certificado (puede tardar 24h para nuevos dominios)

### El subdominio no resuelve
- Verificá en Cloudflare que el DNS record existe
- Probá desactivar y reactivar el proxy (nube naranja)

---

## Arquitectura Final

```
Usuario → Cloudflare (Proxy + SSL)
              ↓
        Vercel Edge Network
              ↓
        Next.js App (leadscout-steel.vercel.app)
              ↓
        Si es leadscout.lat → App normal
        Si es pedro.leadscout.lat → /site/pedro.leadscout.lat
```

---

## Beneficios de esta configuración

1. **SSL automático** — Cloudflare emite y renueva certificados
2. **CDN global** — Cloudflare cachea assets estáticos
3. **DDoS protection** — Cloudflare filtra tráfico malicioso
4. **Subdominios ilimitados** — via API de Cloudflare
5. **Analytics** — Cloudflare da stats de tráfico

---

¿Tenés acceso al panel de tu registrador para cambiar los nameservers?
