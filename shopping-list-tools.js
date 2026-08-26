/* Coach Neiram — ajout rapide dans Courses : photo aliment + code-barres. */
(() => {
  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const findCourseInput = () => [...document.querySelectorAll('input')].find(i => i.placeholder === 'Ajouter un article...');
  const setReactInput = (el, value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const addToCourses = name => {
    const input = findCourseInput();
    if (!input || !String(name || '').trim()) return false;
    setReactInput(input, String(name).trim());
    setTimeout(() => {
      const wrap = input.parentElement;
      const ok = [...(wrap?.querySelectorAll('button') || [])].find(b => norm(b.textContent) === 'ok');
      if (ok) ok.click();
    }, 80);
    return true;
  };
  const notify = msg => {
    let n = document.getElementById('cn-shop-tool-note');
    if (!n) { n = document.createElement('div'); n.id = 'cn-shop-tool-note'; Object.assign(n.style,{position:'fixed',left:'50%',bottom:'86px',transform:'translateX(-50%)',zIndex:9999,background:'#18181B',color:'#F5F5F2',border:'1px solid #F8D040',borderRadius:'10px',padding:'10px 13px',font:'12px Inter, sans-serif',maxWidth:'calc(100vw - 30px)',boxShadow:'0 8px 25px rgba(0,0,0,.45)'}); document.body.appendChild(n); } n.textContent=msg; clearTimeout(n._t); n._t=setTimeout(()=>n.remove(),3500);
  };
  const resize = file => new Promise((resolve,reject)=>{ const r=new FileReader(); r.onerror=()=>reject(new Error('image')); r.onload=e=>{ const img=new Image(); img.onload=()=>{ const scale=Math.min(1,1000/img.width), c=document.createElement('canvas'); c.width=Math.round(img.width*scale); c.height=Math.round(img.height*scale); c.getContext('2d').drawImage(img,0,0,c.width,c.height); resolve(c.toDataURL('image/jpeg',.82)); }; img.onerror=()=>reject(new Error('image')); img.src=e.target.result; }; r.readAsDataURL(file); });
  const geminiVision = async (dataUrl, prompt) => {
    const key = localStorage.getItem('coach_gemini_key') || '';
    if (!key) throw new Error('key');
    const body={contents:[{role:'user',parts:[{inlineData:{mimeType:'image/jpeg',data:dataUrl.split(',')[1]}},{text:prompt}]}],generationConfig:{maxOutputTokens:100,thinkingConfig:{thinkingLevel:'low'}}};
    for (const model of ['gemini-3.6-flash','gemini-3.5-flash-lite','gemini-flash-latest']) {
      const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent?key='+encodeURIComponent(key),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      if (!r.ok) continue;
      const d=await r.json(); const text=(((d.candidates||[])[0]||{}).content?.parts||[]).map(p=>p.text||'').join('').trim(); if(text) return text;
    }
    throw new Error('ai');
  };
  const lookupBarcode = async code => {
    const r=await fetch('https://world.openfoodfacts.org/api/v2/product/'+encodeURIComponent(code)+'.json?fields=product_name,product_name_fr,brands');
    if(!r.ok) return null; const d=await r.json(); if(d.status !== 1 || !d.product) return null;
    const p=d.product; return (p.product_name_fr || p.product_name || '').trim() || null;
  };
  const readBarcode = async dataUrl => {
    if ('BarcodeDetector' in window) {
      try { const img=new Image(); await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=dataUrl}); const det=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e','code_128']}); const found=await det.detect(img); if(found[0]?.rawValue) return found[0].rawValue; } catch(_){}
    }
    const text=await geminiVision(dataUrl,'Lis uniquement le code-barres visible sur cette photo. Réponds UNIQUEMENT avec les chiffres EAN/UPC, sans texte. Si aucun code lisible, réponds NONE.');
    const m=text.replace(/\D/g,'').match(/\d{8,14}/); return m?.[0] || null;
  };
  const identifyFood = async dataUrl => {
    const text=await geminiVision(dataUrl,'Identifie l aliment ou le produit alimentaire principal visible sur cette photo. Réponds uniquement avec son nom simple en français, sans marque, sans quantité et sans explication. Exemple : Banane, Pomme, Riz basmati, Yaourt grec.');
    return text.replace(/\n/g,' ').replace(/^[-•" ]+|[" ]+$/g,'').slice(0,100);
  };
  const makeButton=(label,kind)=>{ const b=document.createElement('button'); b.type='button'; b.textContent=label; Object.assign(b.style,{padding:'8px 10px',borderRadius:'9px',border:'1px solid #28282D',background:'#141416',color:'#F8D040',font:'600 12px Inter,sans-serif',cursor:'pointer',flex:'1'}); b.dataset.cnShopTool=kind; return b; };
  let setupScheduled = false;
  const setup = () => {
    setupScheduled = false;
    const input=findCourseInput(); if(!input) return;
    const parent=input.parentElement?.parentElement || input.parentElement; if(!parent || parent.querySelector('[data-cn-shop-toolbar]')) return;
    const toolbar=document.createElement('div'); toolbar.dataset.cnShopToolbar='1'; Object.assign(toolbar.style,{display:'flex',gap:'7px',marginTop:'8px',marginBottom:'4px'});
    const photo=makeButton('📷 Photo aliment','photo'); const barcode=makeButton('▥ Code-barres','barcode'); toolbar.append(photo,barcode); parent.parentElement.insertBefore(toolbar,parent);
    const photoInput=document.createElement('input'); photoInput.type='file'; photoInput.accept='image/*'; photoInput.capture='environment'; photoInput.style.display='none';
    const barcodeInput=document.createElement('input'); barcodeInput.type='file'; barcodeInput.accept='image/*'; barcodeInput.capture='environment'; barcodeInput.style.display='none';
    parent.parentElement.append(photoInput,barcodeInput);
    photo.onclick=()=>photoInput.click(); barcode.onclick=()=>barcodeInput.click();
    photoInput.onchange=async()=>{ const f=photoInput.files?.[0]; photoInput.value=''; if(!f)return; try{notify('Analyse de la photo…'); const data=await resize(f); const name=await identifyFood(data); if(!name)throw new Error('no-name'); addToCourses(name); notify('Ajouté : '+name);}catch(e){notify(e.message==='key'?'Ajoute ta clé IA dans Réglages pour identifier la photo.':'Photo non reconnue — réessaie avec une photo plus nette.');} };
    barcodeInput.onchange=async()=>{ const f=barcodeInput.files?.[0]; barcodeInput.value=''; if(!f)return; try{notify('Lecture du code-barres…'); const data=await resize(f); const code=await readBarcode(data); if(!code)throw new Error('no-code'); const name=await lookupBarcode(code); if(!name)throw new Error('not-found'); addToCourses(name); notify('Ajouté : '+name);}catch(e){notify(e.message==='key'?'Scanne avec une photo ou ajoute ta clé IA dans Réglages.':e.message==='not-found'?'Produit introuvable dans Open Food Facts.':'Code-barres illisible — cadre-le bien à plat.');} };
  };
  const scheduleSetup = () => {
    if (setupScheduled) return;
    setupScheduled = true;
    const run = () => setup();
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
    else setTimeout(run, 0);
  };
  const root = document.getElementById('root');
  if (root) {
    const obs = new MutationObserver(scheduleSetup);
    obs.observe(root, { childList: true, subtree: true });
  }
  scheduleSetup();
})();
