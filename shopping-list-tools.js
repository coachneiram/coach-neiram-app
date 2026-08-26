/* Coach Neiram — ajout Courses : photo aliment + code-barres, sans duplications. */
(() => {
  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const findCourseInput = () => [...document.querySelectorAll('input')].find(i => i.placeholder === 'Ajouter un article...');

  const setReactInput = (el, value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (!setter) return;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const addToCourses = name => {
    const input = findCourseInput();
    if (!input || !String(name || '').trim()) return false;
    setReactInput(input, String(name).trim());
    setTimeout(() => {
      const row = input.parentElement;
      const ok = [...(row?.querySelectorAll('button') || [])].find(b => norm(b.textContent) === 'ok');
      if (ok && !ok.disabled) ok.click();
      else input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    }, 80);
    return true;
  };

  const notify = msg => {
    let n = document.getElementById('cn-shop-tool-note');
    if (!n) {
      n = document.createElement('div');
      n.id = 'cn-shop-tool-note';
      Object.assign(n.style, { position:'fixed', left:'50%', bottom:'86px', transform:'translateX(-50%)', zIndex:9999, background:'#18181B', color:'#F5F5F2', border:'1px solid #F8D040', borderRadius:'10px', padding:'10px 13px', font:'12px Inter,sans-serif', maxWidth:'calc(100vw - 30px)', boxShadow:'0 8px 25px rgba(0,0,0,.45)' });
      document.body.appendChild(n);
    }
    n.textContent = msg;
    clearTimeout(n._t);
    n._t = setTimeout(() => n.remove(), 3500);
  };

  const resize = file => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error('image'));
    r.onload = e => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 1000 / img.width);
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', .82));
      };
      img.onerror = () => reject(new Error('image'));
      img.src = e.target.result;
    };
    r.readAsDataURL(file);
  });

  const readKey = () => {
    let raw = '';
    try { raw = localStorage.getItem('coach_gemini_key') || ''; } catch (_) { return ''; }
    if (!raw) return '';
    try { const p = JSON.parse(raw); if (typeof p === 'string') return p.trim(); } catch (_) {}
    return raw.replace(/^"+|"+$/g, '').trim();
  };

  const geminiVision = async (dataUrl, prompt) => {
    const key = readKey();
    if (!key) throw new Error('key');
    const body = { contents:[{ role:'user', parts:[{ inlineData:{ mimeType:'image/jpeg', data:dataUrl.split(',')[1] } }, { text:prompt }] }], generationConfig:{ maxOutputTokens:100, thinkingConfig:{ thinkingLevel:'low' } } };
    for (const model of ['gemini-3.6-flash','gemini-3.5-flash-lite','gemini-flash-latest']) {
      let r;
      try { r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + encodeURIComponent(key), { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) }); } catch (_) { continue; }
      if (!r.ok) continue;
      const d = await r.json();
      const text = (((d.candidates || [])[0] || {}).content?.parts || []).map(p => p.text || '').join('').trim();
      if (text) return text;
    }
    throw new Error('ai');
  };

  const lookupBarcode = async code => {
    const r = await fetch('https://world.openfoodfacts.org/api/v2/product/' + encodeURIComponent(code) + '.json?fields=product_name,product_name_fr,brands');
    if (!r.ok) return null;
    const d = await r.json();
    if (d.status !== 1 || !d.product) return null;
    const p = d.product;
    return (p.product_name_fr || p.product_name || '').trim() || null;
  };

  const readBarcode = async dataUrl => {
    if ('BarcodeDetector' in window) {
      try {
        const img = new Image();
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
        const det = new BarcodeDetector({ formats:['ean_13','ean_8','upc_a','upc_e','code_128'] });
        const found = await det.detect(img);
        if (found[0]?.rawValue) return found[0].rawValue;
      } catch (_) {}
    }
    const text = await geminiVision(dataUrl, 'Lis uniquement le code-barres visible sur cette photo. Réponds UNIQUEMENT avec les chiffres EAN/UPC, sans texte. Si aucun code lisible, réponds NONE.');
    const m = text.replace(/\D/g, '').match(/\d{8,14}/);
    return m?.[0] || null;
  };

  const identifyFood = async dataUrl => {
    const text = await geminiVision(dataUrl, 'Identifie l aliment ou le produit alimentaire principal visible sur cette photo. Réponds uniquement avec son nom simple en français, sans marque, sans quantité et sans explication. Exemple : Banane, Pomme, Riz basmati, Yaourt grec.');
    return text.replace(/\n/g, ' ').replace(/^[-•" ]+|[" ]+$/g, '').slice(0, 100);
  };

  const makeButton = (label, kind) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = label;
    Object.assign(b.style, { padding:'8px 10px', borderRadius:'9px', border:'1px solid #28282D', background:'#141416', color:'#F8D040', font:'600 12px Inter,sans-serif', cursor:'pointer', flex:'1' });
    b.dataset.cnShopTool = kind;
    return b;
  };

  let photoInput = null, barcodeInput = null, observer = null, setupScheduled = false, running = false;

  const ensureFileInputs = () => {
    if (!photoInput) {
      photoInput = document.createElement('input');
      photoInput.type='file'; photoInput.accept='image/*'; photoInput.capture='environment'; photoInput.style.display='none';
      document.body.appendChild(photoInput);
      photoInput.addEventListener('change', async () => {
        const f = photoInput.files?.[0]; photoInput.value=''; if (!f) return;
        try { notify('Analyse de la photo…'); const name = await identifyFood(await resize(f)); if (!name) throw new Error('no-name'); addToCourses(name); notify('Ajouté : ' + name); }
        catch (e) { notify(e.message === 'key' ? 'Clé IA absente ou invalide — vérifie-la dans Mon profil & réglages.' : 'Photo non reconnue — réessaie avec une photo plus nette.'); }
      });
    }
    if (!barcodeInput) {
      barcodeInput = document.createElement('input');
      barcodeInput.type='file'; barcodeInput.accept='image/*'; barcodeInput.capture='environment'; barcodeInput.style.display='none';
      document.body.appendChild(barcodeInput);
      barcodeInput.addEventListener('change', async () => {
        const f = barcodeInput.files?.[0]; barcodeInput.value=''; if (!f) return;
        try { notify('Lecture du code-barres…'); const code = await readBarcode(await resize(f)); if (!code) throw new Error('no-code'); const name = await lookupBarcode(code); if (!name) throw new Error('not-found'); addToCourses(name); notify('Ajouté : ' + name); }
        catch (e) { notify(e.message === 'key' ? 'Clé IA absente ou invalide — vérifie-la dans Mon profil & réglages.' : e.message === 'not-found' ? 'Produit introuvable dans Open Food Facts.' : 'Code-barres illisible — cadre-le bien à plat.'); }
      });
    }
  };

  const setup = () => {
    setupScheduled = false;
    if (running) return;
    const input = findCourseInput();
    if (!input) return;
    const host = input.parentElement?.parentElement || input.parentElement;
    if (!host?.parentElement) return;
    const hostParent = host.parentElement;
    const existing = [...hostParent.querySelectorAll(':scope > [data-cn-shop-toolbar]')];
    if (existing.length) { existing.slice(1).forEach(el => el.remove()); return; }

    ensureFileInputs();
    const toolbar = document.createElement('div');
    toolbar.dataset.cnShopToolbar = '1';
    Object.assign(toolbar.style, { display:'flex', gap:'7px', marginTop:'8px', marginBottom:'4px' });
    const photo = makeButton('📷 Photo aliment', 'photo');
    const barcode = makeButton('▥ Code-barres', 'barcode');
    toolbar.append(photo, barcode);
    photo.onclick = () => photoInput?.click();
    barcode.onclick = () => barcodeInput?.click();

    if (observer) observer.disconnect();
    running = true;
    hostParent.insertBefore(toolbar, host);
    running = false;
    if (observer) observer.observe(document.getElementById('root'), { childList:true, subtree:true });
  };

  const scheduleSetup = () => {
    if (setupScheduled) return;
    setupScheduled = true;
    const run = () => { try { setup(); } catch (_) { setupScheduled = false; running = false; } };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run); else setTimeout(run, 0);
  };

  const start = () => {
    const root = document.getElementById('root');
    if (!root) { setTimeout(start, 300); return; }
    observer = new MutationObserver(scheduleSetup);
    observer.observe(root, { childList:true, subtree:true });
    scheduleSetup();
  };
  start();
})();
