import io, sys

P = '/home/claude/coach-neiram-app-main/index.html'
s = io.open(P, encoding='utf-8').read()
orig = s

# ---------------------------------------------------------------- PATCH 1
# ProfileFields : mode d'entrainement + lien Google Sheets
anchor1 = 'set({ weeklyWorkoutTarget: e.target.value ? parseInt(e.target.value) : "" }) }))), '
assert s.count(anchor1) == 1

inject1 = (
    '/* @__PURE__ */ React.createElement(Field, { label: "O\\xF9 se passent tes s\\xE9ances" }, '
    '/* @__PURE__ */ React.createElement(SelectInput, { options: TRAINING_MODES, '
    'value: value.trainingMode || "app", onChange: (e) => set({ trainingMode: e.target.value }) }), '
    '/* @__PURE__ */ React.createElement("p", { style: { fontSize: 11, color: COLORS.textFaint, margin: "6px 0 0", lineHeight: 1.45 } }, '
    'value.trainingMode === "sheets" ? "Ton programme et tes charges se remplissent dans le Google Sheets du coach. '
    'L\'appli ne garde que le pointage des s\\xE9ances, pour le bilan hebdo." '
    ': "Tu construis et remplis tes s\\xE9ances directement dans l\'application.")), '
    'value.trainingMode === "sheets" && /* @__PURE__ */ React.createElement(Field, { label: "Lien Google Sheets de mon programme" }, '
    '/* @__PURE__ */ React.createElement(TextInput, { value: value.sheetsUrl || "", type: "url", '
    'placeholder: "https://docs.google.com/spreadsheets/...", '
    'onChange: (e) => set({ sheetsUrl: e.target.value.trim() }) })), '
)
s = s.replace(anchor1, anchor1 + inject1, 1)

# ---------------------------------------------------------------- PATCH 2
# Constante TRAINING_MODES a cote de TABS
anchor2 = '  const DIET_TYPES = [\n'
assert s.count(anchor2) == 1
inject2 = (
    '  const TRAINING_MODES = [\n'
    '    { id: "app", label: "Dans l\'application" },\n'
    '    { id: "sheets", label: "Sur mon Google Sheets (programme du coach)" }\n'
    '  ];\n'
)
s = s.replace(anchor2, inject2 + anchor2, 1)

# ---------------------------------------------------------------- PATCH 3
# Valeur par defaut a l'onboarding
anchor3 = 'jobType: "sedentaire", targetSteps: 8e3 }'
assert s.count(anchor3) == 1
s = s.replace(anchor3, 'jobType: "sedentaire", targetSteps: 8e3, trainingMode: "app" }', 1)

# ---------------------------------------------------------------- PATCH 4
# EntrainementsTab : bascule mode Sheets + nouvel onglet de pointage
old_tab = (
    'function EntrainementsTab({ routinesApi, sessionsApi, profile }) {\n'
    '    const pl1rm = usePowerlifting1RM();\n'
    '    const plOn = (profile == null ? void 0 : profile.goal) === "performance";\n'
    '    return /* @__PURE__ */ React.createElement(React.Fragment, null, '
    '/* @__PURE__ */ React.createElement(TrainingPerformanceCard, { sessions: sessionsApi.items }), '
    '/* @__PURE__ */ React.createElement(RecordsCard, { sessions: sessionsApi.items }), '
    '/* @__PURE__ */ React.createElement(EntrainementsTabLegacy, { routinesApi, sessionsApi, plOn, pl1rm }));\n'
    '  }\n'
)
assert s.count(old_tab) == 1

new_tab = r'''function SeancesSheetsTab({ sessionsApi, profile }) {
    const url = (profile == null ? void 0 : profile.sheetsUrl) || "";
    const [date, setDate] = useState(todayISO());
    const [durationMin, setDurationMin] = useState("");
    const [rpe, setRpe] = useState("");
    const [notes, setNotes] = useState("");
    const [saved, setSaved] = useState(false);
    const target = (profile == null ? void 0 : profile.weeklyWorkoutTarget) || 0;
    const weekKey = getWeekKey(todayISO());
    const weekSessions = (sessionsApi.items || []).filter((x) => x.date && getWeekKey(x.date) === weekKey).sort((a, b) => b.date.localeCompare(a.date));
    const alreadyToday = weekSessions.some((x) => x.date === date);
    const save = async () => {
      await sessionsApi.add({
        date,
        routineId: null,
        source: "sheets",
        durationMin: durationMin === "" ? "" : parseInt(durationMin),
        rpe: rpe === "" ? "" : parseFloat(rpe),
        notes: notes.trim(),
        pains: [],
        exercises: []
      });
      setDurationMin("");
      setRpe("");
      setNotes("");
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2600);
    };
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 20 } },
      /* @__PURE__ */ React.createElement(Card, null,
        /* @__PURE__ */ React.createElement(SectionTitle, null, "Ma s\xE9ance du jour"),
        /* @__PURE__ */ React.createElement("p", { style: { fontSize: 13, color: COLORS.textMuted, lineHeight: 1.55, margin: "10px 0 14px" } }, "Ton programme, tes charges et tes RPE se remplissent dans le Google Sheets pr\xE9par\xE9 par ton coach. Ici, tu pointes simplement la s\xE9ance pour qu'elle compte dans ton bilan hebdomadaire."),
        url ? /* @__PURE__ */ React.createElement(Btn, { icon: Dumbbell, style: { width: "100%" }, onClick: () => window.open(url, "_blank", "noopener") }, "Ouvrir mon programme") : /* @__PURE__ */ React.createElement("div", { style: { background: COLORS.bgAlt, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "12px 14px", fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5 } }, "Aucun lien enregistr\xE9. Ouvre ", /* @__PURE__ */ React.createElement("strong", { style: { color: COLORS.gold } }, "Mon profil & r\xE9glages"), " et colle le lien Google Sheets que ton coach t'a envoy\xE9.")
      ),
      /* @__PURE__ */ React.createElement(Card, null,
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 } },
          /* @__PURE__ */ React.createElement(SectionTitle, null, "Pointer une s\xE9ance"),
          target ? /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "IBM Plex Mono", fontSize: 12.5, color: weekSessions.length >= target ? COLORS.good : COLORS.textMuted } }, weekSessions.length, "/", target, " cette semaine") : null
        ),
        /* @__PURE__ */ React.createElement(Field, { label: "Date" }, /* @__PURE__ */ React.createElement(TextInput, { type: "date", value: date, onChange: (e) => setDate(e.target.value || todayISO()) })),
        /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
          /* @__PURE__ */ React.createElement(Field, { label: "Dur\xE9e (min)" }, /* @__PURE__ */ React.createElement(NumberInput, { value: durationMin, placeholder: "60", onChange: (e) => setDurationMin(e.target.value) })),
          /* @__PURE__ */ React.createElement(Field, { label: "RPE global (1-10)" }, /* @__PURE__ */ React.createElement(NumberInput, { step: "0.5", min: "1", max: "10", value: rpe, placeholder: "8", onChange: (e) => setRpe(e.target.value) }))
        ),
        /* @__PURE__ */ React.createElement(Field, { label: "Ressenti / note pour le coach" }, /* @__PURE__ */ React.createElement(TextArea, { rows: 2, value: notes, placeholder: "Ex : jambes lourdes, squat plus facile qu'en semaine 2...", onChange: (e) => setNotes(e.target.value) })),
        alreadyToday && /* @__PURE__ */ React.createElement("p", { style: { fontSize: 11.5, color: COLORS.warn, margin: "0 0 10px" } }, "Une s\xE9ance est d\xE9j\xE0 point\xE9e \xE0 cette date."),
        /* @__PURE__ */ React.createElement(Btn, { icon: Plus, style: { width: "100%" }, onClick: save }, "S\xE9ance faite"),
        saved && /* @__PURE__ */ React.createElement("p", { style: { fontSize: 12, color: COLORS.good, textAlign: "center", margin: "10px 0 0" } }, "S\xE9ance enregistr\xE9e.")
      ),
      /* @__PURE__ */ React.createElement(Card, null,
        /* @__PURE__ */ React.createElement(SectionTitle, null, "Cette semaine"),
        /* @__PURE__ */ React.createElement("div", { style: { marginTop: 14 } }, weekSessions.length === 0 ? /* @__PURE__ */ React.createElement("p", { style: { fontSize: 13, color: COLORS.textMuted, margin: 0 } }, "Aucune s\xE9ance point\xE9e pour l'instant.") : /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } }, weekSessions.map((x) => /* @__PURE__ */ React.createElement("div", { key: x.id, style: { display: "flex", alignItems: "center", gap: 10, background: COLORS.bgAlt, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 12px" } },
          /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } },
            /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13.5, color: COLORS.text, fontWeight: 600 } }, fmtDateShort(x.date)),
            /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11.5, color: COLORS.textFaint, fontFamily: "IBM Plex Mono", marginTop: 2 } }, [x.durationMin ? x.durationMin + " min" : null, x.rpe ? "RPE " + x.rpe : null].filter(Boolean).join(" \xB7 ") || "\u2014"),
            x.notes ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: COLORS.textMuted, marginTop: 4, lineHeight: 1.45 } }, x.notes) : null
          ),
          /* @__PURE__ */ React.createElement(IconBtn, { danger: true, onClick: () => sessionsApi.remove(x.id) }, /* @__PURE__ */ React.createElement(Trash2, { size: 15 }))
        )))
        )
      )
    );
  }
  function EntrainementsTab({ routinesApi, sessionsApi, profile }) {
    const pl1rm = usePowerlifting1RM();
    const plOn = (profile == null ? void 0 : profile.goal) === "performance";
    if ((profile == null ? void 0 : profile.trainingMode) === "sheets") {
      return /* @__PURE__ */ React.createElement(SeancesSheetsTab, { sessionsApi, profile });
    }
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(TrainingPerformanceCard, { sessions: sessionsApi.items }), /* @__PURE__ */ React.createElement(RecordsCard, { sessions: sessionsApi.items }), /* @__PURE__ */ React.createElement(EntrainementsTabLegacy, { routinesApi, sessionsApi, plOn, pl1rm }));
  }
'''
s = s.replace(old_tab, new_tab, 1)

# ---------------------------------------------------------------- PATCH 5
# Version de l'app (invalide le cache du service worker / PWA)
import re
s2, n = re.subn(r'(meta-app-version|name="app-version" content=)', r'\1', s)
s = s.replace('2026-08-27.17-grammes-partout', '2026-08-28.01-sheets-seances', 1)

io.open(P, 'w', encoding='utf-8').write(s)
print("patched, delta bytes:", len(s) - len(orig))
