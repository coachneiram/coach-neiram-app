from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')
marker = '  async function searchOpenFoodFacts(query) {'
if 'EXTRA_BEVERAGE_SAUCE_ALIASES' in text:
    print('Beverage/sauce aliases already installed')
    raise SystemExit(0)
if marker not in text:
    raise SystemExit('Food search anchor not found')

block = '''  const EXTRA_BEVERAGE_SAUCE_ALIASES = [
    { keys: ["the", "thé", "the vert", "thé vert"], name: "Thé vert sans sucre", kcal100: 1, p100: 0, c100: 0, f100: 0, serving: 250, raw: true },
    { keys: ["the noir", "thé noir"], name: "Thé noir sans sucre", kcal100: 1, p100: 0, c100: 0, f100: 0, serving: 250, raw: true },
    { keys: ["the blanc", "thé blanc"], name: "Thé blanc sans sucre", kcal100: 1, p100: 0, c100: 0, f100: 0, serving: 250, raw: true },
    { keys: ["infusion", "tisane", "tisanes"], name: "Infusion / tisane sans sucre", kcal100: 1, p100: 0, c100: 0, f100: 0, serving: 250, raw: true },
    { keys: ["the glace", "thé glacé"], name: "Thé glacé sans sucre", kcal100: 1, p100: 0, c100: 0, f100: 0, serving: 250, raw: true },
    { keys: ["eau", "eau plate"], name: "Eau", kcal100: 0, p100: 0, c100: 0, f100: 0, serving: 500, raw: true },
    { keys: ["eau gazeuse", "eau petillante", "eau pétillante"], name: "Eau gazeuse nature", kcal100: 0, p100: 0, c100: 0, f100: 0, serving: 500, raw: true },
    { keys: ["cola zero", "coca zero", "soda zero"], name: "Soda zéro sans sucre", kcal100: 0, p100: 0, c100: 0, f100: 0, serving: 330, raw: true },
    { keys: ["sirop zero", "sirop 0", "sirop sans sucre"], name: "Sirop sans sucre / zéro", kcal100: 0, p100: 0, c100: 0, f100: 0, serving: 20, raw: true },
    { keys: ["sauce zero", "sauce 0", "sauce sans sucre"], name: "Sauce zéro / sans sucre", kcal100: 5, p100: 0, c100: 1, f100: 0, serving: 15, raw: true },
    { keys: ["ketchup zero", "ketchup sans sucre"], name: "Ketchup zéro / sans sucre", kcal100: 20, p100: 1, c100: 4, f100: 0, serving: 15, raw: true },
    { keys: ["sauce barbecue zero", "sauce barbecue sans sucre"], name: "Sauce barbecue zéro / sans sucre", kcal100: 25, p100: 1, c100: 5, f100: 0, serving: 15, raw: true },
    { keys: ["sauce soja light", "sauce soja allegee", "sauce soja allégée"], name: "Sauce soja légère", kcal100: 50, p100: 6, c100: 5, f100: 0.5, serving: 15, raw: true },
    { keys: ["vinaigrette light", "vinaigrette legere", "vinaigrette légère"], name: "Vinaigrette légère", kcal100: 180, p100: 1, c100: 5, f100: 17, serving: 15, raw: true },
    { keys: ["moutarde", "moutarde dijon"], name: "Moutarde de Dijon", kcal100: 150, p100: 7, c100: 6, f100: 10, serving: 15, raw: true }
  ];
  RAW_FOOD_ALIASES.push(...EXTRA_BEVERAGE_SAUCE_ALIASES);
'''
text = text.replace(marker, block + marker, 1)
path.write_text(text, encoding='utf-8')
print('Expanded tea, beverage, zero and sauce alternatives')
