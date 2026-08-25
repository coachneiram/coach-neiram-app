from pathlib import Path
import re

path = Path('index.html')
text = path.read_text(encoding='utf-8')

# Idempotent patch: make Android camera access explicit while preserving a
# separate gallery/file picker. Regex is used because the generated React
# bundle can change whitespace/escaping between builds.
if 'photoGalleryInput' not in text:
    text, n = re.subn(
        r'(const photoInput = useRef\(null\);\s*)(const scanInput = useRef\(null\);)',
        r'\1const photoGalleryInput = useRef(null);\n    \2\n    const scanGalleryInput = useRef(null);',
        text,
        count=1,
    )
    if n != 1:
        raise SystemExit('Could not locate FoodFinder refs')

photo_input_old = r'''<input", \{ type: "file", accept: "image/\*", ref: photoInput, style: \{ display: "none" \}, onChange: \(e\) => \{\s*runPhoto\(e\.target\.files\[0\]\);\s*e\.target\.value = "";\s*\} \}\)'''
photo_input_new = '''<input", { type: "file", accept: "image/*", capture: "environment", ref: photoInput, style: { display: "none" }, onChange: (e) => {\n      runPhoto(e.target.files[0]);\n      e.target.value = "";\n    } })'''
text, n = re.subn(photo_input_old, photo_input_new, text, count=1)
if n != 1 and 'capture: "environment", ref: photoInput' not in text:
    raise SystemExit('Could not patch meal camera input')

# Add an explicit gallery input and split the single combined button into
# camera + gallery buttons. This is deliberately scoped to the photo-mode
# block only.
if 'ref: photoGalleryInput' not in text:
    marker = 'ref: photoInput, style: { display: "none" }, onChange:'
    idx = text.find(marker)
    if idx == -1:
        raise SystemExit('Meal photo input marker missing')
    # Find the end of this React input element.
    end = text.find('}), !photoResult', idx)
    if end == -1:
        raise SystemExit('Meal photo input end missing')
    gallery = ''', /* @__PURE__ */ React.createElement("input", { type: "file", accept: "image/*", ref: photoGalleryInput, style: { display: "none" }, onChange: (e) => {\n      runPhoto(e.target.files[0]);\n      e.target.value = "";\n    } })'''
    text = text[:end] + gallery + text[end:]

# If the old combined label is still present, replace only that button.
text = text.replace(
    'busy ? "Analyse de la photo en cours..." : "Prendre / choisir une photo du repas"',
    'busy ? "Analyse..." : "Prendre une photo"',
    1,
)
if '"Galerie / fichiers"' not in text:
    needle = '}, disabled: busy, style: { width: "100%" } }, busy ? "Analyse..." : "Prendre une photo"), photoPreview'
    if needle in text:
        replacement = '''}, disabled: busy, style: { width: "100%" } }, busy ? "Analyse..." : "Prendre une photo"), /* @__PURE__ */ React.createElement(Btn, { variant: "ghost", icon: Upload, onClick: () => {\n      var _a;\n      return (_a = photoGalleryInput.current) == null ? void 0 : _a.click();\n    }, disabled: busy, style: { width: "100%", marginTop: 8 } }, "Galerie / fichiers"), photoPreview'''
        text = text.replace(needle, replacement, 1)

# Barcode camera input.
if 'capture: "environment", ref: scanInput' not in text:
    text, n = re.subn(
        r'(<input", \{ type: "file", accept: "image/\*", )ref: scanInput,',
        r'\1capture: "environment", ref: scanInput,',
        text,
        count=1,
    )
    if n != 1:
        raise SystemExit('Could not patch barcode camera input')

# Add gallery input for barcode and a separate button.
if 'ref: scanGalleryInput' not in text:
    idx = text.find('ref: scanInput, style: { display: "none" }')
    if idx == -1:
        raise SystemExit('Barcode input marker missing')
    end = text.find('}), (hasAI(apiKey)', idx)
    if end == -1:
        raise SystemExit('Barcode input end missing')
    gallery = ''', /* @__PURE__ */ React.createElement("input", { type: "file", accept: "image/*", ref: scanGalleryInput, style: { display: "none" }, onChange: (e) => {\n      runScanPhoto(e.target.files[0]);\n      e.target.value = "";\n    } })'''
    text = text[:end] + gallery + text[end:]

text = text.replace(
    'busy ? "Lecture en cours..." : "Photographier le code-barres"',
    'busy ? "Lecture..." : "Photographier"',
    1,
)
if 'Galerie / fichiers' in text and 'scanGalleryInput.current' not in text:
    needle = '}, disabled: busy, style: { width: "100%" } }, busy ? "Lecture..." : "Photographier"), /* @__PURE__ */ React.createElement("div"'
    if needle in text:
        replacement = '''}, disabled: busy, style: { width: "100%" } }, busy ? "Lecture..." : "Photographier"), /* @__PURE__ */ React.createElement(Btn, { variant: "ghost", icon: Upload, onClick: () => {\n      var _a;\n      return (_a = scanGalleryInput.current) == null ? void 0 : _a.click();\n    }, disabled: busy, style: { width: "100%", marginTop: 8 } }, "Galerie / fichiers"), /* @__PURE__ */ React.createElement("div"'''
        text = text.replace(needle, replacement, 1)

# Progression photos: capture the rear camera on Android.
text = text.replace(
    '{ type: "file", accept: "image/*", ref: slot.ref,',
    '{ type: "file", accept: "image/*", capture: "environment", ref: slot.ref,',
)

path.write_text(text, encoding='utf-8')
print('Android camera support patched')
