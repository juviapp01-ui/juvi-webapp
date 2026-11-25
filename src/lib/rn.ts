import type { CSSProperties } from 'react';

// ─── React Native styles → CSS ───────────────────────────────────────────────
// The website copies the app's look by reusing its StyleSheet objects almost
// verbatim. `sheet()` turns each RN style into a React CSSProperties object:
//
//   paddingHorizontal/Vertical, marginHorizontal/Vertical → the two sides
//   fontFamily 'HankenGrotesk_600SemiBold'              → family + weight (+ italic)
//   lineHeight 22                                        → '22px' (RN is px, CSS unitless is ×)
//   borderWidth                                          → plus borderStyle: solid
//   shadow*                                              → box-shadow
//   textTransform/letterSpacing/aspectRatio/...          → unchanged
//
// Screens keep the app's numbers, so spacing and type match the app exactly.

type Num = number | string;
export type RNStyle = Record<string, any>;

const FAMILIES: Record<string, string> = {
  BodoniModa: "'Bodoni Moda', 'Playfair Display', Georgia, serif",
  PlayfairDisplay: "'Playfair Display', Georgia, serif",
  HankenGrotesk: "'Hanken Grotesk', system-ui, -apple-system, 'Segoe UI', sans-serif",
  Inter: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
};

// 'PlayfairDisplay_500Medium_Italic' → family, weight 500, italic.
function font(name: string): CSSProperties {
  const [family, weightPart = '400Regular', style] = name.split('_');
  const weight = parseInt(weightPart, 10) || 400;
  return {
    fontFamily: FAMILIES[family] ?? FAMILIES.HankenGrotesk,
    fontWeight: weight,
    ...(style === 'Italic' ? { fontStyle: 'italic' } : {}),
  };
}

const px = (v: Num) => (typeof v === 'number' ? `${v}px` : v);

function hexToRgba(color: string, opacity: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(color);
  if (!m) return color;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${opacity})`;
}

// RN's `flex: n` written out as longhands, the way RN defines it:
// n > 0 → grow n, shrink 1, basis 0; 0 → neither; -1 → shrink only.
// Longhands only, so it never clashes with a flexShrink set elsewhere
// (React warns when shorthand and longhand meet on the same element).
export function expandFlex<T extends Record<string, any>>(style: T | undefined): T | undefined {
  if (!style || typeof style.flex !== 'number') return style;
  const { flex, ...rest } = style as Record<string, any>;
  const longhands =
    flex > 0 ? { flexGrow: flex, flexShrink: 1, flexBasis: 0 } : flex === 0 ? { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' } : { flexGrow: 0, flexShrink: 1, flexBasis: 'auto' };
  // Anything set explicitly next to `flex` still wins, as in RN.
  return { ...longhands, ...rest } as unknown as T;
}

export function rn(style: RNStyle | null | undefined | false): CSSProperties {
  if (!style) return {};
  const out: Record<string, any> = {};
  let shadow: { color?: string; x?: number; y?: number; opacity?: number; radius?: number } | null = null;

  for (const [key, value] of Object.entries(expandFlex(style) as RNStyle)) {
    if (value === undefined) continue;
    switch (key) {
      case 'paddingHorizontal':
        out.paddingLeft = value;
        out.paddingRight = value;
        break;
      case 'paddingVertical':
        out.paddingTop = value;
        out.paddingBottom = value;
        break;
      case 'marginHorizontal':
        out.marginLeft = value;
        out.marginRight = value;
        break;
      case 'marginVertical':
        out.marginTop = value;
        out.marginBottom = value;
        break;
      case 'fontFamily':
        Object.assign(out, font(value));
        break;
      case 'lineHeight':
        out.lineHeight = px(value);
        break;
      case 'borderWidth':
        out.borderWidth = value;
        out.borderStyle = 'solid';
        if (out.borderColor === undefined) out.borderColor = 'transparent';
        break;
      case 'borderTopWidth':
      case 'borderBottomWidth':
      case 'borderLeftWidth':
      case 'borderRightWidth': {
        const side = key.replace('border', '').replace('Width', '');
        out[key] = value;
        out[`border${side}Style`] = 'solid';
        break;
      }
      case 'shadowColor':
        shadow = { ...(shadow ?? {}), color: value };
        break;
      case 'shadowOffset':
        shadow = { ...(shadow ?? {}), x: value?.width ?? 0, y: value?.height ?? 0 };
        break;
      case 'shadowOpacity':
        shadow = { ...(shadow ?? {}), opacity: value };
        break;
      case 'shadowRadius':
        shadow = { ...(shadow ?? {}), radius: value };
        break;
      case 'elevation':
      case 'textShadowColor':
      case 'textShadowOffset':
      case 'textShadowRadius':
        break;
      case 'tintColor':
        break;
      default:
        out[key] = value;
    }
  }

  if (shadow && (shadow.opacity ?? 0) > 0) {
    out.boxShadow = `${shadow.x ?? 0}px ${shadow.y ?? 0}px ${shadow.radius ?? 0}px ${hexToRgba(
      shadow.color ?? '#000000',
      shadow.opacity ?? 0
    )}`;
  }
  return out as CSSProperties;
}

// StyleSheet.create look-alike: same keys in, CSS-ready styles out.
export function sheet<T extends Record<string, RNStyle>>(styles: T): { [K in keyof T]: CSSProperties } {
  const out = {} as { [K in keyof T]: CSSProperties };
  for (const key of Object.keys(styles) as (keyof T)[]) out[key] = rn(styles[key]);
  return out;
}

// RN-style array merge: [a, cond && b]. Takes converted styles only — wrap a
// raw RN object in rn() first.
export function cx(...styles: (CSSProperties | false | null | undefined | '' | 0)[]): CSSProperties {
  const out: CSSProperties = {};
  for (const s of styles) if (s) Object.assign(out, s);
  return out;
}

export const absoluteFill: CSSProperties = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 };
