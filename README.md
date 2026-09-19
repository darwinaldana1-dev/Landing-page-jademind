# JadeMind

Landing estática de JadeMind, construida con HTML, CSS y JavaScript sin dependencias de ejecución.

## Validación local

```powershell
node --check app.js
node scripts/validate-site.mjs
node scripts/browser-qa.mjs
```

`validate-site.mjs` comprueba anclas, recursos, IDs, labels y metadatos. `browser-qa.mjs` abre Chrome o Edge en modo headless, valida los layouts de 320, 390, 820 y 1440 px, revisa las páginas legales y prueba menú, demo sectorial, Circuito Jade, estimador y estados del formulario. Sus capturas se guardan en la carpeta temporal del sistema.

## Archivos de publicación

- `index.html`
- `styles_v22.css`
- `app.js`
- `politicas-de-privacidad.html`
- `terminos-y-condiciones.html`
- `robots.txt`
- `sitemap.xml`
- `site.webmanifest`
- Imágenes y video referenciados por las páginas

## Antes de publicar

1. Confirmar que `https://jademind.com.co/` es la URL canónica definitiva.
2. Activar y probar la dirección `info@jademind.com.co` en FormSubmit. El primer envío puede requerir confirmación del propietario del correo.
3. Completar o validar con asesoría jurídica la identificación del responsable del tratamiento y los textos legales.
4. Configurar en el hosting HTTPS y encabezados como CSP, HSTS, Referrer-Policy, Permissions-Policy y X-Content-Type-Options.
5. Probar el formulario en el dominio publicado sin utilizar datos sensibles.

La copia previa a la mejora está guardada localmente en `backups/` y esa carpeta está excluida de Git.
