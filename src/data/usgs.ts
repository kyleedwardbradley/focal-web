/**
 * USGS (ComCat) moment-tensor data source. Fetches an event's detail GeoJSON and
 * extracts the preferred moment tensor. Impure (network) — deliberately outside
 * `core/`. The components are the standard Harvard (r,t,p)=(Up,South,East)
 * convention in N·m, identical to our MomentTensor, so they map 1:1.
 *
 * USGS sets `Access-Control-Allow-Origin: *`, so this works from the static site
 * with no proxy. The detail feed 302-redirects; fetch follows it automatically.
 */
import type { MomentTensor } from '../core/types';

export interface UsgsEvent {
  id: string;
  /** Normalized so the largest |component| = 1 (orientation/shape are scale-free). */
  tensor: MomentTensor;
  meta: {
    place: string;
    mag: number | null;
    magType: string | null;
    time: number | null; // epoch ms
    depthKm: number | null;
  };
  /** Source of the chosen moment-tensor product (e.g. 'us', 'gcmt'). */
  source: string;
}

interface MtProduct {
  source?: string;
  preferredWeight?: number;
  properties?: Record<string, string>;
}

interface DetailResponse {
  geometry?: { coordinates?: number[] };
  properties?: {
    place?: string;
    mag?: number;
    magType?: string;
    time?: number;
    products?: { 'moment-tensor'?: MtProduct[] };
  };
}

const detailUrl = (id: string): string =>
  `https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/${encodeURIComponent(id)}.geojson`;

/** Accept a raw event id or a USGS event-page / detail URL and pull out the id. */
export function parseEventId(input: string): string {
  const s = input.trim();
  const m = /eventpage\/([^/?#]+)/.exec(s) ?? /detail\/([^/?#.]+)/.exec(s);
  return m ? m[1]! : s;
}

export async function fetchEvent(rawId: string): Promise<UsgsEvent> {
  const id = parseEventId(rawId);
  if (!id) throw new Error('Enter a USGS event id');

  const res = await fetch(detailUrl(id));
  if (!res.ok) throw new Error(`Event "${id}" not found (HTTP ${res.status})`);
  const data = (await res.json()) as DetailResponse;

  const props = data.properties ?? {};
  const products = props.products?.['moment-tensor'];
  if (!products || products.length === 0) throw new Error(`No moment tensor for "${id}"`);

  // Preferred = highest preferredWeight (ComCat usually pre-sorts; be explicit).
  const product = [...products].sort((a, b) => (b.preferredWeight ?? 0) - (a.preferredWeight ?? 0))[0]!;
  const mt = product.properties ?? {};
  const num = (k: string): number => Number.parseFloat(mt[k] ?? '');
  const raw: MomentTensor = {
    mrr: num('tensor-mrr'),
    mtt: num('tensor-mtt'),
    mpp: num('tensor-mpp'),
    mrt: num('tensor-mrt'),
    mrp: num('tensor-mrp'),
    mtp: num('tensor-mtp'),
  };
  if (Object.values(raw).some((v) => Number.isNaN(v))) {
    throw new Error(`Moment tensor for "${id}" is incomplete`);
  }

  // Normalize to unit scale so the component sliders stay in range; shape is unchanged.
  const max = Math.max(...Object.values(raw).map(Math.abs)) || 1;
  const tensor: MomentTensor = {
    mrr: raw.mrr / max,
    mtt: raw.mtt / max,
    mpp: raw.mpp / max,
    mrt: raw.mrt / max,
    mrp: raw.mrp / max,
    mtp: raw.mtp / max,
  };

  return {
    id,
    tensor,
    meta: {
      place: props.place ?? id,
      mag: props.mag ?? null,
      magType: props.magType ?? null,
      time: props.time ?? null,
      depthKm: data.geometry?.coordinates?.[2] ?? null,
    },
    source: product.source ?? mt['beachball-source'] ?? 'usgs',
  };
}
