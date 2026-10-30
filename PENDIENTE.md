# Pendiente por implementar

## Ya funciona
- Menú cargado desde `data/menu.json` y renderizado por `js/app.js`
- Carrito: agregar, subir/bajar cantidad, quitar, vaciar, total, persistencia (localStorage)
- Pedido enviado por WhatsApp con nombre, entrega (domicilio/recoger), dirección y notas
- Botón flotante de WhatsApp con ícono oficial
- Reproductor: reproducir/pausar, detener, silenciar y volumen (se recuerda)
- Diseño responsive, panel de carrito tipo drawer en móvil, accesibilidad básica, `prefers-reduced-motion`

## Falta / siguientes pasos
1. **Pago real**: hoy el pedido solo se envía por WhatsApp. Integrar pasarela (Wompi, PayU, Mercado Pago) o confirmar pago manual.
2. **Fotos reales** de productos y de la galería (hoy son imágenes de Unsplash). Añadir campo `image` en `menu.json` y mostrarlo en cada plato.
3. **Opciones por producto** (tipo de carne, sin cebolla, nivel de picante, sabor de bebida) como `options` en el JSON.
4. **Horario y estado** (abierto/cerrado) y mensaje cuando el local no recibe pedidos.
5. **Costo de domicilio** y pedido mínimo según zona.
6. **Historial de pedidos** y botón "repetir pedido".
7. **SEO / compartir**: imagen Open Graph, `manifest.json` y favicon en más tamaños (PWA).
8. **Audio**: autoplay no está permitido por los navegadores, el usuario debe pulsar play. Opcional: barra de progreso y selector de canciones.
9. **Pruebas** en Safari iOS y Android reales; revisión de contraste con Lighthouse.
10. **Fuentes**: se cargan desde Google Fonts. Para funcionar sin conexión, descargarlas a `assets/fonts/`.
