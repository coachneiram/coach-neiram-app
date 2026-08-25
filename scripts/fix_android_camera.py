from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')

# Explicit camera inputs make Android Chrome open the camera instead of only
# showing the generic file picker. Separate gallery inputs preserve selection.
text = text.replace(
'''    const photoInput = useRef(null);\n    const scanInput = useRef(null);''',
'''    const photoInput = useRef(null);\n    const photoGalleryInput = useRef(null);\n    const scanInput = useRef(null);\n    const scanGalleryInput = useRef(null);''', 1)

old = '''mode === "photo" && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("input", { type: "file", accept: "image/*", ref: photoInput, style: { display: "none" }, onChange: (e) => {\n      runPhoto(e.target.files[0]);\n      e.target.value = "";\n    } }), !photoResult && /* @__PURE__ */ React.createElement(Btn, { variant: "ghost", icon: busy ? Loader2 : Camera, onClick: () => {\n      var _a;\n      return (_a = photoInput.current) == null ? void 0 : _a.click();\n    }, disabled: busy, style: { width: "100%" } }, busy ? "Analyse de la photo en cours..." : "Prendre / choisir une photo du repas"),'''
new = '''mode === "photo" && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("input", { type: "file", accept: "image/*", capture: "environment", ref: photoInput, style: { display: "none" }, onChange: (e) => {\n      runPhoto(e.target.files[0]);\n      e.target.value = "";\n    } }), /* @__PURE__ */ React.createElement("input", { type: "file", accept: "image/*", ref: photoGalleryInput, style: { display: "none" }, onChange: (e) => {\n      runPhoto(e.target.files[0]);\n      e.target.value = "";\n    } }), !photoResult && /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 } }, /* @__PURE__ */ React.createElement(Btn, { variant: "ghost", icon: busy ? Loader2 : Camera, onClick: () => {\n      var _a;\n      return (_a = photoInput.current) == null ? void 0 : _a.click();\n    }, disabled: busy, style: { width: "100%" } }, busy ? "Analyse..." : "Prendre une photo"), /* @__PURE__ */ React.createElement(Btn, { variant: "ghost", icon: Upload, onClick: () => {\n      var _a;\n      return (_a = photoGalleryInput.current) == null ? void 0 : _a.click();\n    }, disabled: busy, style: { width: "100%" } }, "Galerie / fichiers")),'''
if old not in text:
    raise SystemExit('FoodFinder photo block not found')
text = text.replace(old, new, 1)

old = '''mode === "scan" && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("input", { type: "file", accept: "image/*", ref: scanInput, style: { display: "none" }, onChange: (e) => {\n      runScanPhoto(e.target.files[0]);\n      e.target.value = "";\n    } }), (hasAI(apiKey) || typeof window !== "undefined" && "BarcodeDetector" in window) && /* @__PURE__ */ React.createElement(Btn, { variant: "ghost", icon: busy ? Loader2 : Camera, onClick: () => {\n      var _a;\n      return (_a = scanInput.current) == null ? void 0 : _a.click();\n    }, disabled: busy, style: { width: "100%" } }, busy ? "Lecture en cours..." : "Photographier le code-barres"),'''
new = '''mode === "scan" && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("input", { type: "file", accept: "image/*", capture: "environment", ref: scanInput, style: { display: "none" }, onChange: (e) => {\n      runScanPhoto(e.target.files[0]);\n      e.target.value = "";\n    } }), /* @__PURE__ */ React.createElement("input", { type: "file", accept: "image/*", ref: scanGalleryInput, style: { display: "none" }, onChange: (e) => {\n      runScanPhoto(e.target.files[0]);\n      e.target.value = "";\n    } }), (hasAI(apiKey) || typeof window !== "undefined" && "BarcodeDetector" in window) && /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 } }, /* @__PURE__ */ React.createElement(Btn, { variant: "ghost", icon: busy ? Loader2 : Camera, onClick: () => {\n      var _a;\n      return (_a = scanInput.current) == null ? void 0 : _a.click();\n    }, disabled: busy, style: { width: "100%" } }, busy ? "Lecture..." : "Photographier"), /* @__PURE__ */ React.createElement(Btn, { variant: "ghost", icon: Upload, onClick: () => {\n      var _a;\n      return (_a = scanGalleryInput.current) == null ? void 0 : _a.click();\n    }, disabled: busy, style: { width: "100%" } }, "Galerie / fichiers")),'''
if old not in text:
    raise SystemExit('FoodFinder scan block not found')
text = text.replace(old, new, 1)

old = '''{ type: "file", accept: "image/*", ref: slot.ref, style: { display: "none" }, onChange: (e) => handleFile(slot.id, e.target.files[0]) }'''
new = '''{ type: "file", accept: "image/*", capture: "environment", ref: slot.ref, style: { display: "none" }, onChange: (e) => handleFile(slot.id, e.target.files[0]) }'''
if old not in text:
    raise SystemExit('Progress photo input block not found')
text = text.replace(old, new, 3)

path.write_text(text, encoding='utf-8')
print('Android camera support patched')
