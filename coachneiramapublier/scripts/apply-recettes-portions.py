# -*- coding: utf-8 -*-
"""Recettes maison : nombre de portions sur les repas enregistres.

Une recette (pancakes, crepes, batch cooking) se saisit une fois avec la
totalite des ingredients, on indique combien de portions elle produit, et au
reemploi on choisit combien on en mange : toutes les lignes sont divisees.
"""
import io

P = '/home/claude/chk5/coach-neiram-app-main/index.html'
s = io.open(P, encoding='utf-8').read()
orig = s

# --- 1. stockage : champ portions ---------------------------------------
old = ('    const save = useCallback((name, mealType, entries) => {')
assert s.count(old) == 1
s = s.replace(old, '    const save = useCallback((name, mealType, entries, portions) => {', 1)

old = ('      persist((prev) => [{ id: uid(), name: String(name || "Repas").trim() || "Repas", '
       'mealType, items, createdAt: todayISO() }, ...prev].slice(0, 60));')
assert s.count(old) == 1
new = ('      const parts = Math.max(1, Math.round(num(portions) || 1));\n'
       '      persist((prev) => [{ id: uid(), name: String(name || "Repas").trim() || "Repas", '
       'mealType, items, portions: parts, createdAt: todayISO() }, ...prev].slice(0, 60));')
s = s.replace(old, new, 1)

# --- 2. setPortions : corriger le decoupage apres coup -------------------
old = ('    const rename = useCallback((id, name) => persist((prev) => prev.map((p) => '
       'p.id === id ? { ...p, name: String(name || "").trim() || p.name } : p)), [persist]);\n'
       '    return { presets, save, remove, rename, setItemGrams };')
assert s.count(old) == 1
new = ('    const rename = useCallback((id, name) => persist((prev) => prev.map((p) => '
       'p.id === id ? { ...p, name: String(name || "").trim() || p.name } : p)), [persist]);\n'
       '    const setPortions = useCallback((id, portions) => {\n'
       '      const parts = Math.max(1, Math.round(num(portions) || 1));\n'
       '      persist((prev) => prev.map((p) => p.id === id ? { ...p, portions: parts } : p));\n'
       '    }, [persist]);\n'
       '    return { presets, save, remove, rename, setItemGrams, setPortions };')
s = s.replace(old, new, 1)

# --- 3. confirmSavePreset transmet les portions --------------------------
old = '      presetApi.save(savePrompt.name, savePrompt.mealType, items);'
assert s.count(old) == 1
s = s.replace(old, '      presetApi.save(savePrompt.name, savePrompt.mealType, items, savePrompt.portions);', 1)

old = 'setSavePrompt({ mealType: sec.id, name: sec.label })'
assert s.count(old) == 1
s = s.replace(old, 'setSavePrompt({ mealType: sec.id, name: sec.label, portions: "1" })', 1)

# --- 4. champ "portions" dans la modale d'enregistrement -----------------
old = ('onKeyDown: (e) => {\n'
       '      if (e.key === "Enter") confirmSavePreset();\n'
       '    } })), /* @__PURE__ */ React.createElement(Btn, { onClick: confirmSavePreset, '
       'disabled: !savePrompt.name.trim(), style: { width: "100%" } }, "Enregistrer")')
assert s.count(old) == 1
new = ('onKeyDown: (e) => {\n'
       '      if (e.key === "Enter") confirmSavePreset();\n'
       '    } })), /* @__PURE__ */ React.createElement(Field, '
       '{ label: "Cette recette fait combien de portions ?" }, '
       '/* @__PURE__ */ React.createElement(NumberInput, { min: "1", step: "1", '
       'value: savePrompt.portions, '
       'onChange: (e) => setSavePrompt({ ...savePrompt, portions: e.target.value }) }), '
       '/* @__PURE__ */ React.createElement("p", { style: { fontSize: 11, color: COLORS.textFaint, '
       'margin: "6px 0 0", lineHeight: 1.45 } }, '
       '"Laisse 1 si tu as saisi une seule assiette. Mets 8 si tu as saisi toute la p\\xE2te '
       '\\xE0 pancakes et qu\'elle donne 8 pancakes : l\'appli divisera pour toi.")), '
       '/* @__PURE__ */ React.createElement(Btn, { onClick: confirmSavePreset, '
       'disabled: !savePrompt.name.trim(), style: { width: "100%" } }, "Enregistrer")')
s = s.replace(old, new, 1)

# --- 5. MealPortionEditor : selecteur de portions ------------------------
old = 'function MealPortionEditor({ title, items, onAdd, onCancel, onRemember }) {'
assert s.count(old) == 1
s = s.replace(old, 'function MealPortionEditor({ title, items, onAdd, onCancel, onRemember, portions }) {', 1)

old = ('    const scaleAll = (mult) => setQty(bases.map((b) => '
       'String(round(b.qty * mult, 2))));')
assert s.count(old) == 1
new = old + ('\n    // Recette en plusieurs parts : on divise toutes les lignes par le nombre\n'
             '    // de portions produites, puis on multiplie par ce qui est r\\xE9ellement mang\\xE9.\n'
             '    const parts = Math.max(1, Math.round(num(portions) || 1));\n'
             '    const [eaten, setEaten] = useState("1");\n'
             '    const applyPortions = (v) => {\n'
             '      setEaten(v);\n'
             '      const n = num(String(v).replace(",", "."));\n'
             '      if (n > 0) scaleAll(n / parts);\n'
             '    };\n'
             '    const portionRow = parts > 1 ? /* @__PURE__ */ React.createElement("div", '
             '{ style: { background: `${COLORS.gold}14`, border: `1px solid ${COLORS.gold}44`, '
             'borderRadius: 8, padding: 10, marginBottom: 10 } }, '
             '/* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, '
             'color: COLORS.textMuted, marginBottom: 7 } }, "Recette pour ", parts, '
             '" portions \\u2014 tu en manges combien ?"), '
             '/* @__PURE__ */ React.createElement("div", { style: { display: "flex", '
             'alignItems: "center", gap: 8 } }, '
             '/* @__PURE__ */ React.createElement("div", { style: { width: 82 } }, '
             '/* @__PURE__ */ React.createElement(NumberInput, { step: "0.5", min: "0", '
             'value: eaten, onChange: (e) => applyPortions(e.target.value), '
             'style: { padding: "8px 10px" } })), '
             '/* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, '
             'flexWrap: "wrap" } }, [1, 2, parts].filter((v, i, a) => a.indexOf(v) === i)'
             '.map((v) => /* @__PURE__ */ React.createElement("button", { key: v, '
             'onClick: () => applyPortions(String(v)), style: { padding: "7px 11px", '
             'borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "none", '
             'color: COLORS.textMuted, fontSize: 11.5, fontWeight: 600, cursor: "pointer", '
             'fontFamily: "IBM Plex Mono" } }, v, v > 1 ? " parts" : " part"))))) : null;')
s = s.replace(old, new, 1)

# insertion du bloc dans le rendu, juste avant les boutons "tout xN"
old = ('"Ajuste la quantit\\xE9 de chaque aliment : les macros suivent."), '
       '/* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, '
       'flexWrap: "wrap", marginBottom: 10 } }, PORTION_STEPS.map((s) =>')
assert s.count(old) == 1
new = ('"Ajuste la quantit\\xE9 de chaque aliment : les macros suivent."), portionRow, '
       '/* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, '
       'flexWrap: "wrap", marginBottom: 10 } }, PORTION_STEPS.map((s) =>')
s = s.replace(old, new, 1)

# --- 6. passage de la prop au point d'appel ------------------------------
old = ('      onRemember: (index, grams) => presetApi.setItemGrams(portionFor.item.id, index, grams),')
assert s.count(old) == 1
s = s.replace(old, '      portions: portionFor.item.portions,\n' + old, 1)

# --- 7. affichage du nombre de portions dans la liste --------------------
old = ('(p.items || []).length, " aliment", (p.items || []).length > 1 ? "s" : "")')
assert s.count(old) == 1
new = ('(p.items || []).length, " aliment", (p.items || []).length > 1 ? "s" : "", '
       '(p.portions || 1) > 1 ? ` \\xB7 ${p.portions} portions` : "")')
s = s.replace(old, new, 1)

s = s.replace('2026-08-28.04-aliments-bruts', '2026-08-28.05-recettes-portions', 1)

io.open(P, 'w', encoding='utf-8').write(s)
print('delta octets :', len(s) - len(orig))
