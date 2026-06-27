# Configuración de Dominio con Cloudflare + Vercel

## Dominios soportados

- `leadscout.lat` (principal)
- `pyme.live`
- `brber.xyz`

---

## Paso 1: Agregar dominio en Cloudflare

1. Crear cuenta en [cloudflare.com](https://cloudflare.com) (gratis)
2. Hacer clic en **Add a Site**
3. Escribir el dominio (ej: `leadscout.lat`)
4. Seleccionar plan **Free**
5. Cloudflare escaneará los registros existentes

---

## Paso 2: Configurar DNS en Cloudflare

Eliminá todos los registros existentes y agregá estos:

### Dominio apex (ej: leadscout.lat)

```
Type: A
Name: @
IPv4 address: 76.76.21.21
Proxy status: DNS only (GRIS)
TTL: Auto
```

```
Type: CNAME
Name: www
Target: cname.vercel-dns.com
Proxy status: DNS only (GRIS)
TTL: Auto
```

**IMPORTANTE:** El proxy debe estar en **DNS only (gris)** para que Vercel pueda validar el dominio. Si está en **Proxied (naranja)**, Vercel no puede ver el CNAME y falla la validación SSL.

---

## Paso 3: Cambiar Nameservers

Cloudflare te dará 2 nameservers. Ejemplo:

```
dana.ns.cloudflare.com
greg.ns.cloudflare.com
```

Andá a tu registrador (Namecheap, GoDaddy, Nic.mx, etc.) y reemplazá los nameservers actuales por los de Cloudflare.

**Esperar propagación:** Puede tardar desde minutos hasta 24 horas.

---

## Paso 4: Configurar SSL/TLS en Cloudflare

1. En Cloudflare Dashboard, andá a **SSL/TLS**
2. Modo de cifrado: **Full (strict)** o **Full**
3. En **Edge Certificates**: confirmá que hay un certificado activo

---

## Paso 5: Agregar dominio en Vercel

1. Andá a [vercel.com/dashboard](https://vercel.com/dashboard)
2. Seleccioná el proyecto **leadscout**
3. **Settings** → **Domains**
4. Escribí el dominio (ej: `leadscout.lat`) y clic en **Add**
5. Escribí `www.leadscout.lat` y clic en **Add**

Vercel detectará que Cloudflare gestiona el DNS. Elegí la opción recomendada.

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
   - Zone Resources: Include - All zones (o Specific zone)
   - Copiá el token

2. Copiá también el **Account ID** (aparece en la sidebar derecha del dashboard)

3. En la app LeadScout:
   - Andá a **Settings** → **Dominios**
   - Pegá el **Account ID** y **API Token**
   - Clic en **Conectar**

---

## Paso 8: Agregar dominios disponibles para publishing

Una vez conectado Cloudflare:

1. En **Settings** → **Dominios** vas a ver la lista de zonas de Cloudflare
2. Activá los dominios que querés usar para publishing
3. Marcá uno como **default** (será el dominio por defecto al publicar)
4. La app guarda esto en la tabla `available_domains`

---

## Paso 9: Publicar un website

1. Andá a **Websites** o **CRM** → lead detail → **Crear Website**
2. En el builder, clic en **Publicar**
3. Elegí el dominio (si hay múltiples disponibles)
4. Escribí el subdominio (ej: `mi-negocio`)
5. La app:
   - Crea CNAME en Cloudflare: `mi-negocio.leadscout.lat` → `cname.vercel-dns.com`
   - Agrega el dominio al proyecto Vercel
   - Guarda en `custom_domains`

**El CNAME se crea con proxy DNS only (gris)** para que Vercel lo valide correctamente.

---

## Verificación

```bash
# Verificar DNS
dig leadscout.lat +short
# Debería devolver: 76.76.21.21

# Verificar subdominio
 dig mi-negocio.leadscout.lat +short
# Debería devolver: cname.vercel-dns.com.

# Verificar HTTPS
curl -I https://leadscout.lat
# Debería devolver: HTTP/2 200
```

---

## Troubleshooting

### "Too many redirects"
- En Cloudflare SSL/TLS, cambiar de "Flexible" a "Full (strict)"
- Asegurate que el registro A apunte a `76.76.21.21`

### "DNS_PROBE_FINISHED_NXDOMAIN" en subdominios nuevos
- Verificá que el CNAME exista en Cloudflare DNS
- Confirmá que está en **DNS only** (gris), NO proxied (naranja)
- Esperá 1-5 minutos para propagación
- Verificá con `dig {subdomain}.leadscout.lat +short`

### Subdominio no aparece después de publish
- Revisá logs de Vercel (Functions tab)
- Verificá que `VERCEL_TOKEN` esté configurado
- Confirmá que el dominio root esté en `available_domains` con `zoneId` correcto

### SSL no funciona en subdominio
- Vercel necesita validar el dominio primero
- Con `proxied: false`, Vercel ve el CNAME directo y valida rápido
- Con `proxied: true`, Vercel ve IPs de Cloudflare y no puede validar

### Website borrado pero subdominio sigue resolviendo
- La app borra el registro DNS de Cloudflare al eliminar o despublicar un website
- Si quedaron huérfanos: **Settings → Dominios → "Limpiar sin usar"** elimina de golpe todos los subdominios sin sitio asociado o no publicados (DNS en Cloudflare + Vercel + DB). Equivale a `DELETE /api/cloudflare/domains?cleanup=unused`
- Como último recurso, borralo manualmente en Cloudflare → DNS → Records

---

## Arquitectura DNS

```
Usuario → DNS lookup mi-negocio.leadscout.lat
              ↓
         Cloudflare DNS (CNAME → cname.vercel-dns.com)
              ↓
         Vercel Edge Network
              ↓
         Next.js App
              ↓
         /site/mi-negocio.leadscout.lat
```

---

## Beneficios de DNS only (gris)

1. **Vercel valida rápido** — Ve el CNAME real, no IPs de Cloudflare
2. **SSL automático** — Vercel genera y renueva certificados
3. **Sin "Too many redirects"** — No hay doble proxy (Cloudflare + Vercel)

---

## Nota sobre OAuth

El flujo OAuth 2.0 para Cloudflare fue removido. La conexión ahora es **siempre manual** via API Token. Los scopes de OAuth de Cloudflare no permiten la funcionalidad necesaria para DNS editing.
