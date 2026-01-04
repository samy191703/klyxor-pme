// server/services/insee/bdmProvider.ts

import * as bdmMock from "./bdmMock.ts";
import { getInseeAccessToken } from "../inseeAuth.ts";

type IndexPoint = { period: string; value: number };

const BDM_BASE_URL =
  process.env.INSEE_BDM_BASE_URL?.trim() ||
  "https://api.insee.fr/series/BDM/V1";

/**
 * Wrappers “tolérants” : on ne dépend plus d’un nom d’export précis côté bdmMock.ts
 * (utile si le fichier réel exporte getMockLatest / getMockLatestIndexPoint / autre).
 */
function mockLatest(code: string): IndexPoint {
  const anyMock = bdmMock as any;
  const fn =
    anyMock.getMockLatest ??
    anyMock.getMockLatestIndexPoint ??
    anyMock.getMockLatestIndex ??
    anyMock.getLatestMock ??
    anyMock.latest;

  if (typeof fn !== "function") {
    throw new Error(
      `bdmMock.ts: aucun export de mock "latest" trouvé. Exports disponibles: ${Object.keys(
        anyMock,
      ).join(", ")}`
    );
  }
  return fn(code) as IndexPoint;
}

function mockSeries(code: string): IndexPoint[] {
  const anyMock = bdmMock as any;
  const fn =
    anyMock.getMockSeries ??
    anyMock.getMockSeriesIndexPoints ??
    anyMock.getMockHistory ??
    anyMock.series ??
    anyMock.history;

  if (typeof fn !== "function") {
    throw new Error(
      `bdmMock.ts: aucun export de mock "series" trouvé. Exports disponibles: ${Object.keys(
        anyMock,
      ).join(", ")}`
    );
  }
  return fn(code) as IndexPoint[];
}

/**
 * Récupère la dernière valeur (période + valeur) d'une série BDM.
 * Si DISABLE est défini (ou en cas d'erreur), bascule sur le mock.
 */
export async function getLatestIndexPoint(code: string): Promise<IndexPoint> {
  if (process.env.DISABLE) {
    return mockLatest(code);
  }

  try {
    const token = await getInseeAccessToken();
    const url = `${BDM_BASE_URL}/series/${encodeURIComponent(code)}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return mockLatest(code);
    }

    const data: any = await res.json();

    const values =
      data?.Series?.Obs ||
      data?.Series?.observation ||
      data?.Series?.Observations ||
      data?.series?.observations ||
      data?.observations ||
      [];

    const obsArray: any[] = Array.isArray(values) ? values : [];

    const points: IndexPoint[] = obsArray
      .map((o: any) => {
        const period =
          o?.["@TIME_PERIOD"] ??
          o?.timePeriod ??
          o?.period ??
          o?.date ??
          o?.TIME_PERIOD;

        const raw =
          o?.["@OBS_VALUE"] ??
          o?.obsValue ??
          o?.value ??
          o?.OBS_VALUE ??
          o?.OBS_VALUE?.value;

        const value = typeof raw === "number" ? raw : Number(raw);

        if (!period || Number.isNaN(value)) return null;
        return { period: String(period), value };
      })
      .filter(Boolean) as IndexPoint[];

    if (!points.length) {
      return mockLatest(code);
    }

    points.sort((a, b) =>
      a.period > b.period ? 1 : a.period < b.period ? -1 : 0
    );
    return points[points.length - 1];
  } catch {
    return mockLatest(code);
  }
}

/**
 * Récupère l'historique (points) d'une série BDM.
 * Si DISABLE est défini (ou en cas d'erreur), bascule sur le mock.
 */
export async function getSeriesIndexPoints(code: string): Promise<IndexPoint[]> {
  if (process.env.DISABLE) {
    return mockSeries(code);
  }

  try {
    const token = await getInseeAccessToken();
    const url = `${BDM_BASE_URL}/series/${encodeURIComponent(code)}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return mockSeries(code);
    }

    const data: any = await res.json();

    const values =
      data?.Series?.Obs ||
      data?.Series?.observation ||
      data?.Series?.Observations ||
      data?.series?.observations ||
      data?.observations ||
      [];

    const obsArray: any[] = Array.isArray(values) ? values : [];

    const points: IndexPoint[] = obsArray
      .map((o: any) => {
        const period =
          o?.["@TIME_PERIOD"] ??
          o?.timePeriod ??
          o?.period ??
          o?.date ??
          o?.TIME_PERIOD;

        const raw =
          o?.["@OBS_VALUE"] ??
          o?.obsValue ??
          o?.value ??
          o?.OBS_VALUE ??
          o?.OBS_VALUE?.value;

        const value = typeof raw === "number" ? raw : Number(raw);

        if (!period || Number.isNaN(value)) return null;
        return { period: String(period), value };
      })
      .filter(Boolean) as IndexPoint[];

    if (!points.length) {
      return mockSeries(code);
    }

    points.sort((a, b) =>
      a.period > b.period ? 1 : a.period < b.period ? -1 : 0
    );
    return points;
  } catch {
    return mockSeries(code);
  }
}