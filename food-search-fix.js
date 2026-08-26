(() => {
  const originalFetch = window.fetch.bind(window);
  const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const has = (text, terms) => terms.some(t => text.includes(norm(t)));
  const words = (s) => norm(s).split(/\s+/).filter(Boolean);
  const RAW_PRODUCE = ['pomme','poire','peche','nectarine','abricot','prune','raisin','fraise','framboise','myrtille','mangue','ananas','orange','citron','kiwi','banane','melon','pasteque','tomate','carotte','courgette','concombre','brocoli','epinard','haricot','champignon','poivron','salade'];
  const DERIVATIVES = ['jus','juice','nectar','sirop','boisson','ice tea','iced tea','the glace','the froid','soda','smoothie','compote','confiture','puree','glace','ice cream','sorbet','dessert','creme dessert','mousse','gateau','biscuit','yaourt','yogourt','patisserie','confiserie','chocolat','arome','saveur','fourre','coulis','muesli','cereales','cereal','barre','granola','cookie','tarte'];
  function scoreProduct(product, query) {
    const name = norm(product.product_name_fr || product.product_name || '');
    const brand = norm(product.brands || '');
    const categories = norm(product.categories || '');
    const tags = norm((product.categories_tags || []).join(' '));
    const hay = `${name} ${brand} ${categories} ${tags}`;
    const q = norm(query), qw = words(q); let score = 0;
    if (name === q) score += 1500;
    if (name.startsWith(q + ' ') || name.startsWith(q + ',')) score += 700;
    if (name.includes(q)) score += 250;
    score += qw.reduce((n, w) => n + (name.includes(w) ? 40 : 0), 0);
    const raw = RAW_PRODUCE.find(x => q === x || q.startsWith(x + ' '));
    if (raw) {
      const fruitVeg = has(hay, ['fruits','fruit','legumes','vegetables','vegetable']) || has(tags, ['en:fruits','en:vegetables','fr:fruits','fr:legumes']);
      const derivative = has(hay, DERIVATIVES);
      if (name === raw || name.startsWith(raw + ' ') || name.startsWith(raw + ',')) score += 2500;
      if (fruitVeg) score += 1400; else score -= 900;
      if (derivative) score -= 5000;
      if (!name.startsWith(raw) && !name.includes(` ${raw} `)) score -= 1800;
    }
    if (q.includes('cafe')) {
      if (has(hay, ['cafe','coffee','espresso','latte','cappuccino'])) score += 180;
      if (q.includes('lait') && has(hay, ['cafe au lait','cafe latte','latte','cappuccino'])) score += 600;
      if (q.includes('lait') && has(hay, ['lait'])) score += 80;
      if (has(hay, ['glace','ice cream','dessert','creme glacee','mousse','gateau'])) score -= 5000;
    }
    if (q.includes('the') || q.includes('infusion') || q.includes('tisane')) {
      if (has(hay, ['the','tea','infusion','tisane'])) score += 300;
      if (has(hay, ['ice tea','iced tea','the glace','boisson','soda'])) score -= 700;
    }
    if (has(q, ['zero','sans sucre','light','sans sucres'])) {
      if (has(hay, ['zero','sans sucre','sans sucres','light'])) score += 350; else score -= 150;
    }
    return score;
  }
  function rank(products, query) { return products.map((p, i) => ({ p, i, s: scoreProduct(p, query) })).sort((a, b) => b.s - a.s || a.i - b.i).map(x => x.p); }
  async function enrichRawProduce(data, query) {
    const q = norm(query), raw = RAW_PRODUCE.find(x => q === x || q.startsWith(x + ' '));
    if (!raw) return data;
    try {
      const u = new URL('https://world.openfoodfacts.org/cgi/search.pl');
      u.searchParams.set('search_terms', raw); u.searchParams.set('categories_tags_en', 'fruits'); u.searchParams.set('page_size', '50'); u.searchParams.set('json', '1');
      const extra = await originalFetch(u.toString()).then(r => r.json());
      if (Array.isArray(extra.products)) {
        const seen = new Set((data.products || []).map(p => p.code || `${p.product_name || ''}|${p.brands || ''}`));
        for (const p of extra.products) { const key = p.code || `${p.product_name || ''}|${p.brands || ''}`; if (!seen.has(key)) { data.products.push(p); seen.add(key); } }
      }
    } catch (_) {}
    return data;
  }
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    try {
      const input = args[0], url = typeof input === 'string' ? input : input?.url || '';
      if (!url.includes('world.openfoodfacts.org/cgi/search.pl')) return response;
      const query = new URL(url).searchParams.get('search_terms') || '', data = await response.clone().json();
      if (Array.isArray(data.products)) { await enrichRawProduce(data, query); data.products = rank(data.products, query); data.count = data.products.length; }
      return new Response(JSON.stringify(data), { status: response.status, statusText: response.statusText, headers: response.headers });
    } catch (_) { return response; }
  };
  const s = document.createElement('script'); s.src = 'shopping-list-tools.js'; s.async = false; document.body.appendChild(s);

  // Coach Neiram — motivation + favoris/plats récurrents.
  // Les données sont stockées séparément pour ne pas modifier l'état React ni provoquer de re-render.
  const read = (key, fallback) => { try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return v == null ? fallback : v; } catch (_) { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} };
  const uid = () => 'cn-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  const monday = d => { const x = new Date(d); const n = (x.getDay() + 6) % 7; x.setHours(0,0,0,0); x.setDate(x.getDate() - n); return x; };
  const iso = d => new Date(d).toISOString().slice(0,10);
  const getMotivation = () => {
    const p = read('coach_profile', {}), sessions = read('coach_sessions', []);
    const target = Number(p.weeklyWorkoutTarget || 0); if (!target) return null;
    const start = monday(new Date()), today = iso(new Date());
    const count = sessions.filter(s => s && s.date >= iso(start) && s.date <= today).length;
    const left = Math.max(0, target - count);
    if (left === 0) return { title: '🏆 Objectif atteint !', text: `${count}/${target} séances réalisées cette semaine. Tu as tenu ton engagement. Bravo !` };
    const phrases = left === 1 ? [
      `Plus qu'une séance pour atteindre ton objectif de la semaine. Tu y es presque ! 🔥`,
      `Une dernière séance et c'est validé. Ne lâche rien ! 💪`,
      `Tu as fait le plus gros. Plus qu'une séance pour finir la semaine fort ! 🚀`
    ] : [
      `Plus que ${left} séances pour atteindre ton objectif. Continue, tu es sur la bonne voie ! 🔥`,
      `${count}/${target} séances réalisées. Chaque séance compte : on continue ! 💪`,
      `Ton objectif est à ${left} séance${left > 1 ? 's' : ''}. La régularité fera la différence. 🚀`
    ];
    const idx = (new Date().getDate() + count) % phrases.length;
    return { title: '🎯 Ton objectif de la semaine', text: phrases[idx], count, target, left };
  };
  const addStyle = (el, css) => Object.assign(el.style, css);
  const showMotivation = () => {
    if (document.getElementById('cn-motivation-card')) return;
    const m = getMotivation(); if (!m) return;
    const card = document.createElement('div'); card.id = 'cn-motivation-card';
    addStyle(card, { position:'fixed', left:'12px', right:'12px', bottom:'78px', zIndex:9996, background:'#18181B', color:'#F5F5F2', border:'1px solid #F8D040', borderRadius:'14px', padding:'12px 14px', boxShadow:'0 10px 30px rgba(0,0,0,.35)', fontFamily:'Inter,system-ui,sans-serif' });
    const close = document.createElement('button'); close.type='button'; close.textContent='×'; addStyle(close,{position:'absolute',right:'7px',top:'5px',background:'none',border:'0',color:'#aaa',fontSize:'20px',cursor:'pointer'}); close.onclick=()=>{ card.remove(); try{sessionStorage.setItem('cn_motivation_hidden',new Date().toISOString().slice(0,10));}catch(_){} };
    const title=document.createElement('div'); title.textContent=m.title; addStyle(title,{fontWeight:'800',fontSize:'13px',paddingRight:'24px'});
    const text=document.createElement('div'); text.textContent=m.text; addStyle(text,{fontSize:'12px',lineHeight:'1.45',marginTop:'4px',color:'#D8D8DC'});
    card.append(title,text,close); document.body.appendChild(card);
  };
  const createTools = () => {
    if (document.getElementById('cn-memory-tools')) return;
    const btn=document.createElement('button'); btn.id='cn-memory-tools'; btn.type='button'; btn.textContent='⭐ Favoris & repas';
    addStyle(btn,{position:'fixed',right:'12px',bottom:'132px',zIndex:9995,border:'1px solid #28282D',borderRadius:'10px',background:'#141416',color:'#F8D040',padding:'9px 11px',font:'600 12px Inter,system-ui,sans-serif',boxShadow:'0 7px 20px rgba(0,0,0,.25)',cursor:'pointer'});
    btn.onclick=openPanel; document.body.appendChild(btn);
  };
  function openPanel(){
    if(document.getElementById('cn-memory-panel')) return;
    const panel=document.createElement('div'); panel.id='cn-memory-panel';
    addStyle(panel,{position:'fixed',inset:'12px',zIndex:10000,maxWidth:'520px',margin:'auto',background:'#101012',color:'#F5F5F2',border:'1px solid #2B2B30',borderRadius:'16px',padding:'16px',boxShadow:'0 20px 60px rgba(0,0,0,.6)',overflowY:'auto',fontFamily:'Inter,system-ui,sans-serif'});
    const fav=read('coach_food_favorites',[]), dishes=read('coach_dishes',[]);
    const h=document.createElement('div'); addStyle(h,{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}); const title=document.createElement('b'); title.textContent='⭐ Favoris & repas réguliers'; const x=document.createElement('button'); x.textContent='×'; addStyle(x,{background:'none',border:0,color:'#aaa',fontSize:'24px'}); x.onclick=()=>panel.remove(); h.append(title,x); panel.appendChild(h);
    const info=document.createElement('div'); info.textContent='Enregistre un aliment ou un plat habituel pour le retrouver sans tout retaper.'; addStyle(info,{fontSize:'12px',color:'#A7A7AE',marginBottom:'12px'}); panel.appendChild(info);
    const section=(name)=>{const e=document.createElement('div'); const t=document.createElement('div'); t.textContent=name; addStyle(t,{fontWeight:'800',fontSize:'12px',margin:'14px 0 7px',color:'#F8D040'}); e.appendChild(t); return e;};
    const makeInput=(ph)=>{const i=document.createElement('input'); i.placeholder=ph; i.style.cssText='width:100%;box-sizing:border-box;padding:9px;border-radius:8px;border:1px solid #2B2B30;background:#18181B;color:#F5F5F2;margin-bottom:7px;font-size:14px;'; return i;};
    const name=makeInput('Nom de l’aliment / plat'); const kcal=makeInput('Kcal'); const p=makeInput('Protéines (g)'); const c=makeInput('Glucides (g)'); const f=makeInput('Lipides (g)'); [name,kcal,p,c,f].forEach(i=>panel.appendChild(i));
    const type=document.createElement('select'); type.innerHTML='<option value="petit_dejeuner">Petit-déjeuner</option><option value="dejeuner">Déjeuner</option><option value="diner">Dîner</option><option value="collation">Collation</option>'; type.style.cssText='width:100%;padding:9px;border-radius:8px;background:#18181B;color:#F5F5F2;border:1px solid #2B2B30;margin-bottom:8px;font-size:14px;'; panel.appendChild(type);
    const saveFav=document.createElement('button'); saveFav.textContent='⭐ Enregistrer en favori'; addStyle(saveFav,{width:'100%',padding:'10px',border:0,borderRadius:'9px',background:'#F8D040',color:'#15120A',fontWeight:'800'}); saveFav.onclick=()=>{if(!name.value.trim())return; const a={id:uid(),name:name.value.trim(),calories:Number(kcal.value)||0,protein:Number(p.value)||0,carbs:Number(c.value)||0,fat:Number(f.value)||0}; write('coach_food_favorites',[...read('coach_food_favorites',[]),a]); name.value=kcal.value=p.value=c.value=f.value=''; renderLists();}; panel.appendChild(saveFav);
    const saveDish=document.createElement('button'); saveDish.textContent='🍽️ Enregistrer comme plat régulier'; addStyle(saveDish,{width:'100%',padding:'10px',marginTop:'7px',border:'1px solid #3A3A40',borderRadius:'9px',background:'#18181B',color:'#F5F5F2',fontWeight:'700'}); saveDish.onclick=()=>{if(!name.value.trim())return; const d={id:uid(),name:name.value.trim(),calories:Number(kcal.value)||0,protein:Number(p.value)||0,carbs:Number(c.value)||0,fat:Number(f.value)||0}; write('coach_dishes',[...read('coach_dishes',[]),d]); name.value=kcal.value=p.value=c.value=f.value=''; renderLists();}; panel.appendChild(saveDish);
    const lists=document.createElement('div'); panel.appendChild(lists);
    function renderLists(){lists.innerHTML=''; const ff=read('coach_food_favorites',[]), dd=read('coach_dishes',[]); const s1=section('Aliments favoris'); if(!ff.length){const e=document.createElement('div');e.textContent='Aucun favori pour le moment.';addStyle(e,{fontSize:'12px',color:'#888'});s1.appendChild(e);} ff.slice(-20).reverse().forEach(a=>row(s1,a,true)); lists.appendChild(s1); const s2=section('Repas réguliers'); if(!dd.length){const e=document.createElement('div');e.textContent='Aucun plat enregistré.';addStyle(e,{fontSize:'12px',color:'#888'});s2.appendChild(e);} dd.slice(-20).reverse().forEach(a=>row(s2,a,false)); lists.appendChild(s2);}
    function row(parent,a,isFav){const r=document.createElement('div');addStyle(r,{display:'flex',alignItems:'center',gap:'7px',padding:'8px 0',borderTop:'1px solid #25252A'});const txt=document.createElement('div');txt.style.flex='1';txt.innerHTML='<b>'+String(a.name).replace(/[&<>]/g,'')+'</b><div style="font-size:10px;color:#999;margin-top:2px">'+a.calories+' kcal · P '+a.protein+' · G '+a.carbs+' · L '+a.fat+'</div>';const add=document.createElement('button');add.textContent='Ajouter';add.style.cssText='padding:7px 8px;border:1px solid #38383D;border-radius:7px;background:#18181B;color:#F8D040;font-size:11px;';add.onclick=()=>{const logs=read('coach_log_entries',[]); logs.push({id:uid(),date:iso(new Date()),mealType:type.value,dishId:isFav?null:a.id,name:a.name,calories:Number(a.calories)||0,protein:Number(a.protein)||0,carbs:Number(a.carbs)||0,fat:Number(a.fat)||0}); write('coach_log_entries',logs); panel.remove(); location.reload();};r.append(txt,add);parent.appendChild(r);}
    renderLists();
  }
  const boot=()=>{ setTimeout(()=>{ try{ if(!sessionStorage.getItem('cn_motivation_hidden')) showMotivation(); }catch(_){showMotivation();} createTools(); },900); };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
