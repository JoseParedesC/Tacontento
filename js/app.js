/* ==========================================================================
   Tacontento · app.js
   - Carga el menú desde data/menu.json y lo pinta
   - Carrito con cantidades, persistencia y envío del pedido por WhatsApp
   - Reproductor de música con play/pausa, stop y volumen
   Sin frameworks ni dependencias: funciona tal cual en GitHub Pages.
   ========================================================================== */
(() => {
  'use strict';

  const MENU_URL = 'data/menu.json';
  const KEYS = {
    cart: 'tacontento.cart.v1',
    customer: 'tacontento.customer.v1',
    volume: 'tacontento.volume.v1'
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* ---------- Utilidades ---------- */
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); }
      catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* modo privado: se ignora */ }
    }
  };

  const escapeHTML = (str) => String(str).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let money = (n) => '$' + Math.round(n).toLocaleString('es-CO');

  let toastTimer;
  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }

  function bump(el) {
    el.classList.remove('bump');
    void el.offsetWidth; // reinicia la animación
    el.classList.add('bump');
  }

  /* ---------- Estado ---------- */
  const state = {
    business: { name: 'Tacontento', whatsapp: '', currency: 'COP', locale: 'es-CO' },
    products: new Map(), // id -> { id, name, price, ... }
    cart: {}             // id -> cantidad
  };

  const cartCount = () => Object.values(state.cart).reduce((a, b) => a + b, 0);
  const cartTotal = () => Object.entries(state.cart)
    .reduce((sum, [id, qty]) => sum + (state.products.get(id)?.price ?? 0) * qty, 0);

  /* ---------- Menú ---------- */
  async function loadMenu() {
    const list = $('#menuList');
    try {
      const res = await fetch(MENU_URL, { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      applyBusiness(data.business);
      indexProducts(data.categories);
      renderMenu(data.categories);
      loadCart();
      renderCart();
    } catch (err) {
      console.error('No se pudo cargar el menú:', err);
      list.innerHTML = `
        <div class="state-msg">
          <p><strong>No pudimos cargar el menú.</strong></p>
          <p>Si abriste el archivo con doble clic, el navegador bloquea la lectura del JSON.
          Abre el sitio con un servidor local (por ejemplo <code>python -m http.server</code>) o desde GitHub Pages.</p>
        </div>`;
    }
  }

  function applyBusiness(business = {}) {
    state.business = { ...state.business, ...business };
    const { locale, currency } = state.business;
    try {
      const fmt = new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 });
      money = (n) => fmt.format(n).replace(/\s/g, '');
    } catch { /* se queda con el formato por defecto */ }

    const link = whatsappLink('Hola, quiero hacer un pedido en ' + state.business.name);
    ['#waFab', '#heroWhatsapp'].forEach((sel) => { const a = $(sel); if (a) a.href = link; });
  }

  function indexProducts(categories) {
    state.products.clear();
    categories.forEach((cat) => cat.items.forEach((item) => state.products.set(item.id, item)));
  }

  function renderMenu(categories) {
    $('#menuChips').innerHTML = categories
      .map((c) => `<a class="chip" href="#cat-${escapeHTML(c.id)}">${escapeHTML(c.name)}</a>`).join('');

    $('#menuList').innerHTML = categories.map((cat) => `
      <section class="menu-cat" id="cat-${escapeHTML(cat.id)}" aria-labelledby="h-${escapeHTML(cat.id)}">
        <div class="menu-cat__head">
          <h3 id="h-${escapeHTML(cat.id)}">${escapeHTML(cat.name)}</h3>
          ${cat.description ? `<p>${escapeHTML(cat.description)}</p>` : ''}
        </div>
        <ul class="dish-list">
          ${cat.items.map((item) => `
            <li class="dish">
              <div class="dish__top">
                <span class="dish__name">${escapeHTML(item.name)}${item.tag ? `<span class="dish__tag">${escapeHTML(item.tag)}</span>` : ''}</span>
                <span class="dish__dots" aria-hidden="true"></span>
                <span class="dish__price">${money(item.price)}</span>
              </div>
              <p class="dish__desc">${escapeHTML(item.description || '')}</p>
              <button class="dish__add" type="button" data-add="${escapeHTML(item.id)}" aria-label="Agregar ${escapeHTML(item.name)} al pedido">
                <svg class="icon" aria-hidden="true"><use href="#i-plus"/></svg>Agregar
              </button>
            </li>`).join('')}
        </ul>
      </section>`).join('');
  }

  /* ---------- Carrito ---------- */
  function loadCart() {
    const saved = store.get(KEYS.cart, {});
    state.cart = {};
    // Solo se conservan productos que siguen existiendo en el menú
    Object.entries(saved).forEach(([id, qty]) => {
      if (state.products.has(id) && Number.isInteger(qty) && qty > 0) state.cart[id] = Math.min(qty, 99);
    });
  }

  const saveCart = () => store.set(KEYS.cart, state.cart);

  function setQty(id, qty) {
    if (!state.products.has(id)) return;
    if (qty <= 0) delete state.cart[id];
    else state.cart[id] = Math.min(qty, 99);
    saveCart();
    renderCart();
  }

  function addToCart(id, btn) {
    setQty(id, (state.cart[id] || 0) + 1);
    bump($('#cartBadge'));
    bump($('#cartToggle'));
    toast(`${state.products.get(id).name} agregado`);
    if (btn) {
      btn.classList.remove('added');
      void btn.offsetWidth;
      btn.classList.add('added');
    }
  }

  function renderCart() {
    const ids = Object.keys(state.cart);
    const list = $('#cartItems');

    list.innerHTML = ids.map((id) => {
      const p = state.products.get(id);
      const qty = state.cart[id];
      return `
        <li class="cart-line">
          <span class="cart-line__name">${escapeHTML(p.name)}</span>
          <span class="cart-line__sub">${money(p.price * qty)}</span>
          <span class="cart-line__unit">${money(p.price)} c/u</span>
          <div class="stepper" role="group" aria-label="Cantidad de ${escapeHTML(p.name)}">
            <button type="button" data-dec="${escapeHTML(id)}" aria-label="Quitar uno de ${escapeHTML(p.name)}">
              <svg class="icon" aria-hidden="true"><use href="#i-${qty === 1 ? 'trash' : 'minus'}"/></svg>
            </button>
            <output aria-live="polite">${qty}</output>
            <button type="button" data-inc="${escapeHTML(id)}" aria-label="Agregar uno más de ${escapeHTML(p.name)}">
              <svg class="icon" aria-hidden="true"><use href="#i-plus"/></svg>
            </button>
          </div>
        </li>`;
    }).join('');

    const empty = ids.length === 0;
    $('#cartEmpty').hidden = !empty;
    $('#cartFooter').hidden = empty;
    $('#cartTotal').textContent = money(cartTotal());
    $('#cartBadge').textContent = cartCount();
  }

  /* Panel del carrito en móvil / tablet */
  const cartEl = () => $('#cart');
  function openCart() {
    cartEl().classList.add('is-open');
    $('#overlay').hidden = false;
    document.body.classList.add('no-scroll');
    $('#cartToggle').setAttribute('aria-expanded', 'true');
    $('#cartClose').focus();
  }
  function closeCart() {
    cartEl().classList.remove('is-open');
    $('#overlay').hidden = true;
    document.body.classList.remove('no-scroll');
    $('#cartToggle').setAttribute('aria-expanded', 'false');
  }

  /* ---------- Checkout por WhatsApp ---------- */
  function whatsappLink(text) {
    return `https://wa.me/${state.business.whatsapp}?text=${encodeURIComponent(text)}`;
  }

  function buildOrderMessage(customer) {
    const lines = [`*Nuevo pedido · ${state.business.name}*`, ''];
    lines.push(`*Cliente:* ${customer.name}`);
    lines.push(`*Entrega:* ${customer.mode}`);
    if (customer.mode === 'Domicilio') lines.push(`*Dirección:* ${customer.address}`);
    lines.push('', '*Pedido:*');
    Object.entries(state.cart).forEach(([id, qty]) => {
      const p = state.products.get(id);
      lines.push(`• ${qty} × ${p.name} — ${money(p.price * qty)}`);
    });
    lines.push('', `*Total: ${money(cartTotal())}*`);
    if (customer.notes) lines.push('', `*Notas:* ${customer.notes}`);
    return lines.join('\n');
  }

  function initCheckout() {
    const form = $('#checkoutForm');
    const errorEl = $('#formError');
    const addressField = $('#addressField');
    const addressInput = $('#custAddress');

    // Restaurar datos del cliente
    const saved = store.get(KEYS.customer, {});
    if (saved.name) form.elements.name.value = saved.name;
    if (saved.address) form.elements.address.value = saved.address;
    if (saved.mode) {
      const radio = $(`input[name="mode"][value="${saved.mode}"]`, form);
      if (radio) radio.checked = true;
    }

    const currentMode = () => $('input[name="mode"]:checked', form).value;
    const syncMode = () => {
      const delivery = currentMode() === 'Domicilio';
      addressField.hidden = !delivery;
      addressInput.required = delivery;
    };
    syncMode();

    const persist = () => store.set(KEYS.customer, {
      name: form.elements.name.value.trim(), address: form.elements.address.value.trim(), mode: currentMode()
    });

    form.addEventListener('input', persist);
    form.addEventListener('change', (e) => { if (e.target.name === 'mode') { syncMode(); persist(); } });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const customer = {
        name: form.elements.name.value.trim(),
        mode: currentMode(),
        address: form.elements.address.value.trim(),
        notes: form.elements.notes.value.trim()
      };

      let message = '';
      if (cartCount() === 0) message = 'Agrega al menos un producto a tu pedido.';
      else if (!customer.name) message = 'Escribe tu nombre para enviar el pedido.';
      else if (customer.mode === 'Domicilio' && !customer.address) message = 'Escribe la dirección de entrega.';

      errorEl.hidden = !message;
      errorEl.textContent = message;
      $$('.field', form).forEach((f) => f.classList.remove('invalid'));
      if (message) {
        const bad = !customer.name ? form.elements.name : (customer.mode === 'Domicilio' && !customer.address ? form.elements.address : null);
        if (bad) { bad.closest('.field').classList.add('invalid'); bad.focus(); }
        return;
      }

      const url = whatsappLink(buildOrderMessage(customer));
      // Un enlace temporal evita bloqueos de ventanas emergentes (window.open con noopener devuelve null)
      const a = document.createElement('a');
      a.href = url; a.target = '_blank'; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
      toast('Abriendo WhatsApp…');
    });

    $('#cartClear').addEventListener('click', () => {
      if (cartCount() === 0) return;
      if (confirm('¿Vaciar todo el pedido?')) {
        state.cart = {};
        saveCart();
        renderCart();
      }
    });
  }

  /* ---------- Reproductor ---------- */
  function initPlayer() {
    const audio = $('#bgMusic');
    const player = $('#player');
    const playBtn = $('#playBtn');
    const stopBtn = $('#stopBtn');
    const muteBtn = $('#muteBtn');
    const vol = $('#volume');

    const setIcon = (btn, id) => $('use', btn).setAttribute('href', '#' + id);

    const savedVol = store.get(KEYS.volume, { level: 0.3, muted: false });
    audio.volume = vol.value = savedVol.level;
    audio.muted = savedVol.muted;

    const renderPlay = () => {
      const playing = !audio.paused;
      player.classList.toggle('is-playing', playing);
      setIcon(playBtn, playing ? 'i-pause' : 'i-play');
      playBtn.setAttribute('aria-label', playing ? 'Pausar música' : 'Reproducir música');
    };

    const renderVolume = () => {
      const silent = audio.muted || audio.volume === 0;
      setIcon(muteBtn, silent ? 'i-vol-mute' : audio.volume > 0.5 ? 'i-vol-high' : 'i-vol-low');
      muteBtn.setAttribute('aria-label', silent ? 'Activar sonido' : 'Silenciar');
      vol.value = audio.muted ? 0 : audio.volume;
    };

    const persistVol = () => store.set(KEYS.volume, { level: audio.volume, muted: audio.muted });

    playBtn.addEventListener('click', async () => {
      if (audio.paused) {
        try { await audio.play(); }
        catch (err) { console.error(err); toast('No se pudo reproducir la música'); }
      } else {
        audio.pause();
      }
    });

    stopBtn.addEventListener('click', () => {
      audio.pause();
      audio.currentTime = 0;
    });

    muteBtn.addEventListener('click', () => {
      if (audio.muted || audio.volume === 0) {
        audio.muted = false;
        if (audio.volume === 0) audio.volume = 0.3;
      } else {
        audio.muted = true;
      }
      renderVolume();
      persistVol();
    });

    vol.addEventListener('input', () => {
      audio.volume = parseFloat(vol.value);
      audio.muted = audio.volume === 0;
      renderVolume();
      persistVol();
    });

    audio.addEventListener('play', renderPlay);
    audio.addEventListener('pause', renderPlay);
    audio.addEventListener('error', () => {
      player.classList.add('is-error');
      playBtn.disabled = stopBtn.disabled = true;
      playBtn.setAttribute('aria-label', 'Música no disponible');
    });

    renderPlay();
    renderVolume();
  }

  /* ---------- Eventos globales ---------- */
  function bindEvents() {
    $('#menuList').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-add]');
      if (btn) addToCart(btn.dataset.add, btn);
    });

    $('#cartItems').addEventListener('click', (e) => {
      const inc = e.target.closest('[data-inc]');
      const dec = e.target.closest('[data-dec]');
      if (inc) setQty(inc.dataset.inc, (state.cart[inc.dataset.inc] || 0) + 1);
      if (dec) setQty(dec.dataset.dec, (state.cart[dec.dataset.dec] || 0) - 1);
    });

    $('#cartToggle').addEventListener('click', openCart);
    $('#cartClose').addEventListener('click', closeCart);
    $('#overlay').addEventListener('click', closeCart);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && cartEl().classList.contains('is-open')) closeCart(); });

    // Si se agranda la ventana, el panel vuelve a ser columna fija
    window.matchMedia('(min-width: 981px)').addEventListener('change', (e) => { if (e.matches) closeCart(); });

    // Las fotos externas que fallen no deben dejar huecos rotos
    $$('.gallery img').forEach((img) => img.addEventListener('error', () => img.closest('figure').remove()));
  }

  /* ---------- Inicio ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    initCheckout();
    initPlayer();
    loadMenu();
  });
})();
