from pathlib import Path
import re

p = Path('index.html')
s = p.read_text(encoding='utf-8')

new_fn = r'''  function computeTargets(profile, currentWeightKg) {
    const weight = Number(currentWeightKg || profile.startWeightKg) || null;
    let maintenance;
    if (Number.isFinite(Number(profile.adaptiveMaintenanceKcal)) && Number(profile.adaptiveMaintenanceKcal) > 0) {
      maintenance = Number(profile.adaptiveMaintenanceKcal);
    } else if (Number.isFinite(Number(profile.calibratedMaintenanceKcal)) && Number(profile.calibratedMaintenanceKcal) > 0) {
      maintenance = Number(profile.calibratedMaintenanceKcal);
    } else {
      const bmr = computeBMR({ sex: profile.sex, weightKg: weight, heightCm: profile.heightCm, age: profile.age });
      const activity = ACTIVITY_LEVELS.find((a) => a.id === profile.activityLevel) || ACTIVITY_LEVELS[1];
      const jobMult = { sedentaire: 0, actif: 0.05, "tres-actif": 0.12 }[profile.jobType] || 0;
      maintenance = bmr ? bmr * activity.mult * (1 + jobMult) : null;
    }
    if (!maintenance) return { calories: null, protein: null, carbs: null, fat: null };
    const goalAdjust = { perte: -0.18, prise: 0.10, maintien: 0, performance: 0.05 };
    const adjust = Object.prototype.hasOwnProperty.call(goalAdjust, profile.goal) ? goalAdjust[profile.goal] : 0;
    const calories = Math.round((maintenance * (1 + adjust)) / 10) * 10;
    let proteinPerKg = 1.8;
    if (profile.goal === "perte") proteinPerKg = 2.0;
    const protein = weight ? Math.round(weight * proteinPerKg) : null;
    const fatPerKg = profile.goal === "perte" ? 0.7 : 0.9;
    const fat = weight ? Math.round(weight * fatPerKg) : null;
    const remainingKcal = calories != null && protein != null && fat != null ? Math.max(0, calories - protein * 4 - fat * 9) : null;
    const carbs = remainingKcal != null ? Math.round(remainingKcal / 4) : null;
    return { calories, protein, carbs, fat };
  }
'''

pattern = re.compile(r'  function computeTargets\(profile, currentWeightKg\) \{.*?\n  \}\n  function computeCalibration', re.S)
replacement = new_fn + '  function computeCalibration'
s2, n = pattern.subn(replacement, s, count=1)
if n != 1:
    raise SystemExit('computeTargets block not found; refusing to modify index.html')
p.write_text(s2, encoding='utf-8')
print('Adaptive nutrition target engine applied')
