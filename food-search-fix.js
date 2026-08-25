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
    const q = norm(query);
    const qw = words(q);
    let score = 0;

    if (name === q) score += 1500;
    if (name.startsWith(q + ' ') || name.startsWith(q + ',')) score += 700;
    if (name.includes(q)) score += 250;
    score += qw.reduce((n, w) => n + (name.includes(w) ? 40 : 0), 0);

    // Raw fruit/vegetable searches: the ingredient itself must dominate derivatives.
    const raw = RAW_PRODUCE.find(x => q === x || q.startsWith(x + ' '));
    if (raw) {
      const fruitVeg = has(hay, ['fruits','fruit','legumes','vegetables','vegetable']) || has(tags, ['en:fruits','en:vegetables','fr:fruits','fr:legumes']);
      const derivative = has(hay, DERIVATIVES);

      if (name === raw || name.startsWith(raw + ' ') || name.startsWith(raw + ',')) score += 2500;
      if (fruitVeg) score += 1400;
      else score -= 900;
      if (derivative) score -= 5000;

      // A product whose name contains the requested fruit but is clearly another food
      // (e.g. muesli raisin) must never outrank the raw ingredient.
      if (!name.startsWith(raw) && !name.includes(` ${raw} `)) score -= 1800;
    }

    // Coffee intent: real coffee drinks before desserts/ice creams.
    if (q.includes('cafe')) {
      if (has(hay, ['cafe','coffee','espresso','latte','cappuccino'])) score += 180;
      if (q.includes('lait') && has(hay, ['cafe au lait','cafe latte','latte','cappuccino'])) score += 600;
      if (q.includes('lait') && has(hay, ['lait'])) score += 80;
      if (has(hay, ['glace','ice cream','dessert','creme glacee','mousse','gateau'])) score -= 5000;
    }

    // Tea intent: prioritize tea/infusions, not peach-flavoured drinks when searching tea itself.
    if (q.includes('the') || q.includes('infusion') || q.includes('tisane')) {
      if (has(hay, ['the','tea','infusion','tisane'])) score += 300;
      if (has(hay, ['ice tea','iced tea','the glace','boisson','soda'])) score -= 700;
    }

    // Explicit zero/light requests.
    if (has(q, ['zero','sans sucre','light','sans sucres'])) {
      if (has(hay, ['zero','sans sucre','sans sucres','light'])) score += 350;
      else score -= 150;
    }

    return score;
  }

  function rank(products, query) {
    return products
      .map((p, i) => ({ p, i, s: scoreProduct(p, query) }))
      .sort((a, b) => b.s - a.s || a.i - b.i)
      .map(x => x.p);
  }

  async function enrichRawProduce(data, query) {
    const q = norm(query);
    const raw = RAW_PRODUCE.find(x => q === x || q.startsWith(x + ' '));
    if (!raw) return data;

    // Open Food Facts often returns processed products first. Make a second, targeted
    // request for the fruit/vegetable category and merge it before ranking.
    try {
      const u = new URL('https://world.openfoodfacts.org/cgi/search.pl');
      u.searchParams.set('search_terms', raw);
      u.searchParams.set('categories_tags_en', 'fruits');
      u.searchParams.set('page_size', '50');
      u.searchParams.set('json', '1');
      const extra = await originalFetch(u.toString()).then(r => r.json());
      if (Array.isArray(extra.products)) {
        const seen = new Set((data.products || []).map(p => p.code || `${p.product_name || ''}|${p.brands || ''}`));
        for (const p of extra.products) {
          const key = p.code || `${p.product_name || ''}|${p.brands || ''}`;
          if (!seen.has(key)) {
            data.products.push(p);
            seen.add(key);
          }
        }
      }
    } catch (_) {}
    return data;
  }

  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    try {
      const input = args[0];
      const url = typeof input === 'string' ? input : input?.url || '';
      if (!url.includes('world.openfoodfacts.org/cgi/search.pl')) return response;
      const query = new URL(url).searchParams.get('search_terms') || '';
      const data = await response.clone().json();
      if (Array.isArray(data.products)) {
        await enrichRawProduce(data, query);
        data.products = rank(data.products, query);
        data.count = data.products.length;
      }
      return new Response(JSON.stringify(data), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    } catch (_) {
      return response;
    }
  };
})();
