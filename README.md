# Tacontento · prototipo de pedidos

Sitio estático (HTML + CSS + JS puro, sin frameworks) listo para GitHub Pages.

## Estructura
```
index.html
css/styles.css
js/app.js            ← carga el menú, carrito, reproductor y envío por WhatsApp
data/menu.json       ← TODO el menú y el número de WhatsApp (business.whatsapp)
assets/img/          ← logo optimizado, favicon, whatsapp.svg
assets/audio/cancion.mp3
```

## Probar en local
`menu.json` se carga con `fetch`, así que no funciona con doble clic en el archivo.
Usa un servidor local:
```
python -m http.server 8000     # y abre http://localhost:8000
```

## Publicar en GitHub Pages
1. Sube el contenido de esta carpeta a un repositorio (la raíz debe contener `index.html`).
2. Settings → Pages → Source: *Deploy from a branch* → `main` / `/ (root)`.

## Editar el menú
Modifica `data/menu.json`: cada producto necesita `id` único, `name`, `description` y `price` (en pesos).
`tag` es opcional y muestra una etiqueta junto al nombre.
