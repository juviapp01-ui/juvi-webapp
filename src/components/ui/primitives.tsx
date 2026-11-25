import React, { forwardRef, type CSSProperties, type ReactNode } from 'react';
import { expandFlex } from '@/lib/rn';

// RN-shaped building blocks so ported screens read like the app's.
//
// View  — a flex column, position relative, no shrinking (RN's defaults).
// Text  — a block of text; nested <Text> renders inline, as in RN.
// Pressable / PressableScale — a reset <button>; PressableScale shrinks a
//   touch on press, like the app's PressableScale.

const VIEW_BASE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  minWidth: 0,
  flexShrink: 0,
  boxSizing: 'border-box',
};

type DivProps = React.HTMLAttributes<HTMLDivElement> & { style?: CSSProperties };

export const View = forwardRef<HTMLDivElement, DivProps>(function View({ style, ...rest }, ref) {
  return <div ref={ref} style={{ ...VIEW_BASE, ...expandFlex(style) }} {...rest} />;
});

const InsideText = React.createContext(false);

export function Text({
  style,
  numberOfLines,
  children,
  onClick,
  title,
}: {
  style?: CSSProperties;
  numberOfLines?: number;
  children?: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
}) {
  const nested = React.useContext(InsideText);
  const clamp: CSSProperties =
    numberOfLines === 1
      ? { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
      : numberOfLines
        ? { display: '-webkit-box', WebkitLineClamp: numberOfLines, WebkitBoxOrient: 'vertical', overflow: 'hidden' }
        : {};
  const base: CSSProperties = nested ? {} : { display: 'block', whiteSpace: 'pre-line', margin: 0, minWidth: 0 };
  return (
    <InsideText.Provider value>
      <span
        style={{ ...base, ...clamp, ...style, ...(onClick ? { cursor: 'pointer' } : {}) }}
        onClick={onClick}
        title={title}
      >
        {children}
      </span>
    </InsideText.Provider>
  );
}

type PressableProps = {
  onPress?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  style?: CSSProperties;
  children?: ReactNode;
  ariaLabel?: string;
  type?: 'button' | 'submit';
  scaleTo?: number;
  className?: string;
  // A card that holds its own buttons (save, heart…) can't be a <button>
  // itself — buttons can't nest. This renders a <div role="button"> that
  // still works with Enter / Space.
  asDiv?: boolean;
};

export function Pressable({ onPress, disabled, style, children, ariaLabel, type = 'button', scaleTo, className, asDiv }: PressableProps) {
  const classes = `rn-press${scaleTo ? ' rn-scale' : ''}${className ? ` ${className}` : ''}`;
  const merged = { ...VIEW_BASE, ...(scaleTo ? ({ '--press-scale': scaleTo } as CSSProperties) : {}), ...expandFlex(style) };
  if (asDiv) {
    return (
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        aria-label={ariaLabel}
        className={classes}
        style={merged}
        onClick={(e) => !disabled && onPress?.(e)}
        onKeyDown={(e) => {
          if (disabled || e.target !== e.currentTarget) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onPress?.(e as unknown as React.MouseEvent);
          }
        }}
      >
        {children}
      </div>
    );
  }
  return (
    <button
      type={type}
      className={`rn-press${scaleTo ? ' rn-scale' : ''}${className ? ` ${className}` : ''}`}
      style={{ ...VIEW_BASE, ...(scaleTo ? ({ '--press-scale': scaleTo } as CSSProperties) : {}), ...expandFlex(style) }}
      onClick={(e) => {
        if (disabled) return;
        onPress?.(e);
      }}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

// Same default press-in scale as the app (0.96).
export function PressableScale(props: PressableProps) {
  return <Pressable scaleTo={props.scaleTo ?? 0.96} {...props} />;
}

// <Image contentFit="cover" /> → <img style object-fit>.
export function Img({
  src,
  style,
  fit = 'cover',
  alt = '',
  position,
  lazy = true,
}: {
  src?: string | null;
  style?: CSSProperties;
  fit?: 'cover' | 'contain';
  alt?: string;
  position?: string;
  lazy?: boolean;
}) {
  if (!src) return <div style={{ ...style, backgroundColor: (style?.backgroundColor as string) ?? '#efe6e2' }} />;
  return (
    <img
      src={src}
      alt={alt}
      loading={lazy ? 'lazy' : 'eager'}
      decoding="async"
      draggable={false}
      style={{ display: 'block', objectFit: fit, objectPosition: position, ...style }}
    />
  );
}

// A horizontal ScrollView: one row, scrolls sideways, no visible scrollbar.
export function HScroll({ contentStyle, style, children }: { contentStyle?: CSSProperties; style?: CSSProperties; children: ReactNode }) {
  return (
    <div className="rn-hscroll" style={{ overflowX: 'auto', overflowY: 'hidden', ...style }}>
      <div style={{ display: 'flex', flexDirection: 'row', width: 'max-content', alignItems: 'flex-start', ...contentStyle }}>
        {children}
      </div>
    </div>
  );
}

export function Spinner({ size = 'small', color = '#884952' }: { size?: 'small' | 'large'; color?: string }) {
  const d = size === 'large' ? 36 : 20;
  return (
    <span
      className="rn-spinner"
      role="progressbar"
      aria-label="Loading"
      style={{ width: d, height: d, borderColor: `${color}33`, borderTopColor: color }}
    />
  );
}
