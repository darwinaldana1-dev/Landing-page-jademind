# JadeMind

Landing estática de JadeMind, construida con HTML, CSS y JavaScript sin dependencias de ejecución.

## Validación local

```powershell
node --check app.js
node scripts/validate-site.mjs
```

`validate-site.mjs` comprueba anclas, recursos, IDs, labels y metadatos.

## Archivos de publicación

- `index.html`
- `styles_v22.css`
- `app.js`
- `politicas-de-privacidad.html`
- `terminos-y-condiciones.html`
- `robots.txt`
- `sitemap.xml`
- `site.webmanifest`
- `neural-field.js` (fondo animado del hero)
- `assets/fonts/`: Poppins + Inter, las tipografías del CRM, servidas desde el sitio
- `banner.jpg`, `video/vende-en-piloto-automatico.mp4`, `assets/logo-icon.png` y los logos de `visual/`

## Antes de publicar

1. Confirmar que `https://jademind.com.co/` es la URL canónica definitiva.
2. Activar y probar la dirección `info@jademind.com.co` en FormSubmit. El primer envío puede requerir confirmación del propietario del correo.
3. Completar o validar con asesoría jurídica la identificación del responsable del tratamiento y los textos legales.
4. Configurar en el hosting HTTPS y encabezados como CSP, HSTS, Referrer-Policy, Permissions-Policy y X-Content-Type-Options.
5. Probar el formulario en el dominio publicado sin utilizar datos sensibles.
