(() => {
  const originalFetch = window.fetch.bind(window);
  const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const has = (text, terms) => terms.some(t => text.includes(t));
  const words = (s) => norm(s).split(/\s+/).filter(Boolean);

  function scoreProduct(product, query) {
    const name = norm(product.product_name_fr || product.product_name || '');
    const brand = norm(product.brands || '');
    const categories = norm(product.categories || '');
    const hay = `${name} ${brand} ${categories}`;
    const q = norm(query);
    const qw = words(q);
    let score = 0;

    // Strongly reward exact/near-exact matches.
    if (name === q) score += 1000;
    if (name.startsWith(q)) score += 350;
    if (name.includes(q)) score += 180;
    score += qw.reduce((n, w) => n + (name.includes(w) ? 35 : 0), 0);

    const beverage = ['jus','juice','nectar','sirop','soda','boisson','ice tea','iced tea','the glace','the froid','limonade','cola','drink','energy drink','smoothie'];
    const dessert = ['glace','ice cream','sorbet','dessert','creme dessert','mousse','gateau','biscuit','yaourt','yogourt','patisserie','confiserie','chocolat'];
    const processed = ['compote','confiture','puree','arome','saveur','fourre','coulis'];

    // Raw fruit/vegetable intent: prefer the actual ingredient and reject derivatives.
    const rawProduce = ['pomme','poire','peche','nectarine','abricot','prune','raisin','fraise','framboise','myrtille','mangue','ananas','orange','citron','kiwi','banane','melon','pasteque','tomate','carotte','courgette','concombre','brocoli','epinard','haricot','champignon','poivron','salade'];
    if (rawProduce.some(x => q === x || q.startsWith(x + ' '))) {
      if (name === q || name.startsWith(q + ' ')) score += 700;
      if (has(hay, beverage)) score -= 900;
      if (has(hay, dessert)) score -= 800;
      if (has(hay, processed)) score -= 650;
      if (has(hay, ['frais','fraiche','frais entier','entier'])) score += 100;
    }

    // Coffee intent: desserts/glaces au café must not outrank coffee drinks.
    if (q.includes('cafe')) {
      if (has(hay, ['cafe','coffee','espresso','latte','cappuccino'])) score += 160;
      if (q.includes('lait')) {
        if (has(hay, ['cafe au lait','cafe latte','latte','cappuccino'])) score += 450;
        if (has(hay, ['lait'])) score += 80;
      }
      if (has(hay, dessert)) score -= 1000;
      if (has(hay, ['glace','ice cream','dessert','creme glacee'])) score -= 1200;
    }

    // Tea intent: prioritize tea/infusions and avoid peach-flavoured soft drinks.
    if (q.includes('the') || q.includes('infusion') || q.includes('tisane')) {
      if (has(hay, ['the','tea','infusion','tisane'])) score += 250;
      if (has(hay, ['ice tea','iced tea','the glace','boisson','soda'])) score -= 450;
    }

    // Explicit zero/light requests should prefer matching alternatives.
    if (has(q, ['zero','sans sucre','light','sans sucres'])) {
      if (has(hay, ['zero','sans sucre','sans sucres','light'])) score += 300;
      else score -= 120;
    }

    return score;
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
        data.products = data.products.map((p, i) => ({ p, i, s: scoreProduct(p, query) }))
          .sort((a, b) => b.s - a.s || a.i - b.i)
          .map(x => x.p);
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
