/**
 * Graphiques d'evolution (SVG, sans bibliotheque).
 *
 * Portage fidele de LineChartSVG / ChartAxes de index.html (lignes 99-121).
 * Le SVG est genere a la main : aucune dependance de graphiques n'est
 * ajoutee, l'application doit rester chargeable hors ligne et legere.
 *
 * Les trous dans les donnees coupent le trace en segments plutot que de
 * relier deux points distants d'un mois : une ligne droite laisserait croire
 * a une progression reguliere qui n'a jamais ete mesuree.
 */

import { COLORS } from "../tokens.js";
import { chartScale, fmtTick } from "../lib/mensurations.js";

function Axes({ W, padL, padR, yAt, ticks, refY }) {
  return (
    <>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={yAt(t)} y2={yAt(t)} stroke={COLORS.border} strokeDasharray="3 3" />
          <text
            x={padL - 6}
            y={yAt(t) + 3.5}
            textAnchor="end"
            fontSize="10.5"
            fill={COLORS.textFaint}
            fontFamily="Inter"
          >
            {fmtTick(t)}
          </text>
        </g>
      ))}
      {refY != null && (
        <line x1={padL} x2={W - padR} y1={yAt(refY)} y2={yAt(refY)} stroke={COLORS.textFaint} strokeDasharray="5 4" />
      )}
    </>
  );
}

export function Courbe({ data, color, refY, height = 190 }) {
  const W = 620;
  const H = height;
  const padL = 46;
  const padR = 12;
  const padT = 12;
  const padB = 26;

  const vals = data.map((d) => d.value).filter((v) => v != null);
  if (vals.length < 2) {
    return (
      <p style={{ fontSize: 12, color: COLORS.textFaint, margin: "8px 0 0" }}>
        Pas encore assez de données pour tracer la courbe.
      </p>
    );
  }

  const { mn, mx } = chartScale(vals, refY);
  const pw = W - padL - padR;
  const ph = H - padT - padB;
  const xAt = (i) => padL + (data.length === 1 ? pw / 2 : (i / (data.length - 1)) * pw);
  const yAt = (v) => padT + (1 - (v - mn) / (mx - mn)) * ph;
  const ticks = [mn + (mx - mn) * 0.1, (mn + mx) / 2, mx - (mx - mn) * 0.1];

  const segments = [];
  let courant = [];
  data.forEach((d, i) => {
    if (d.value == null) {
      if (courant.length > 1) segments.push(courant);
      courant = [];
    } else courant.push([xAt(i), yAt(d.value)]);
  });
  if (courant.length > 1) segments.push(courant);

  const pasLibelle = Math.max(1, Math.ceil(data.length / 6));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img">
      <Axes W={W} padL={padL} padR={padR} yAt={yAt} ticks={ticks} refY={refY} />
      {segments.map((s, si) => (
        <polyline
          key={si}
          points={s.map((p) => p.join(",")).join(" ")}
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
      {data.map((d, i) => d.value != null && <circle key={i} cx={xAt(i)} cy={yAt(d.value)} r="3" fill={color} />)}
      {data.map(
        (d, i) =>
          (i % pasLibelle === 0 || i === data.length - 1) && (
            <text
              key={"l" + i}
              x={xAt(i)}
              y={H - 8}
              textAnchor="middle"
              fontSize="9.5"
              fill={COLORS.textFaint}
              fontFamily="Inter"
            >
              {d.label}
            </text>
          )
      )}
    </svg>
  );
}


/**
 * Histogramme.
 *
 * Portage fidele de BarChartSVG (index.html, ligne 123). Il sert aux
 * grandeurs qui se cumulent sur une periode — hydratation, pas, calories
 * moyennes — la ou la courbe sert aux grandeurs continues comme le poids.
 *
 * L'echelle descend toujours jusqu'a zero : des barres tronquees a mi-hauteur
 * exagereraient visuellement des ecarts minimes.
 *
 * Le message d'absence differe volontairement de celui de la courbe : une
 * barre isolee reste lisible, la ou une courbe a besoin d'au moins deux
 * points.
 */
export function Histogramme({ data, color, refY, height = 190 }) {
  const W = 620;
  const H = height;
  const padL = 46;
  const padR = 12;
  const padT = 12;
  const padB = 26;

  const vals = data.map((d) => d.value).filter((v) => v != null);
  if (!vals.length) {
    return (
      <p style={{ fontSize: 12, color: COLORS.textFaint, margin: "8px 0 0" }}>Pas encore de données.</p>
    );
  }

  const { mn: mnBrut, mx } = chartScale(vals, refY);
  const mn = Math.min(0, mnBrut);
  const pw = W - padL - padR;
  const ph = H - padT - padB;
  const emplacement = pw / data.length;
  const largeurBarre = emplacement * 0.55;
  const yAt = (v) => padT + (1 - (v - mn) / (mx - mn)) * ph;
  const ticks = [(mn + mx) / 2, mx - (mx - mn) * 0.1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img">
      <Axes W={W} padL={padL} padR={padR} yAt={yAt} ticks={ticks} refY={refY} />
      {data.map(
        (d, i) =>
          d.value != null && (
            <rect
              key={i}
              x={padL + i * emplacement + (emplacement - largeurBarre) / 2}
              y={yAt(d.value)}
              width={largeurBarre}
              height={Math.max(0, yAt(mn) - yAt(d.value))}
              rx="3"
              fill={color}
            />
          )
      )}
      {data.map((d, i) => (
        <text
          key={"l" + i}
          x={padL + i * emplacement + emplacement / 2}
          y={H - 8}
          textAnchor="middle"
          fontSize="9.5"
          fill={COLORS.textFaint}
          fontFamily="Inter"
        >
          {d.label}
        </text>
      ))}
    </svg>
  );
}
