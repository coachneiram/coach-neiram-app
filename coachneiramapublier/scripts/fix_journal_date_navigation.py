from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')

old = '''  const addDays = (dateStr, n) => {
    const d = parseISO(dateStr);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };'''

new = '''  // Keep calendar dates in local time. Using toISOString() here shifts dates
  // to the previous day in France/Europe because local midnight is still the
  // previous UTC day during DST, which caused Journal navigation to jump by 2
  // days backwards and made the next-day button appear stuck.
  const toLocalISODate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const addDays = (dateStr, n) => {
    const d = parseISO(dateStr);
    d.setDate(d.getDate() + n);
    return toLocalISODate(d);
  };'''

if old not in text:
    raise SystemExit('Expected addDays implementation not found; aborting without changes')

text = text.replace(old, new, 1)

old_monday = '''    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  }'''
new_monday = '''    d.setDate(d.getDate() + diff);
    return toLocalISODate(d);
  }'''
if old_monday not in text:
    raise SystemExit('Expected getMonday implementation not found; aborting without changes')
text = text.replace(old_monday, new_monday, 1)

path.write_text(text, encoding='utf-8')
print('Fixed local calendar date arithmetic in Journal navigation')
