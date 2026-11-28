import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  IoAdd,
  IoArrowBack,
  IoArrowForward,
  IoArrowUp,
  IoBagHandleOutline,
  IoCalendarOutline,
  IoCashOutline,
  IoChatbubbleOutline,
  IoChevronDown,
  IoClose,
  IoFilmOutline,
  IoFlaskOutline,
  IoGiftOutline,
  IoHandLeftOutline,
  IoHeartOutline,
  IoHomeOutline,
  IoImagesOutline,
  IoKeyOutline,
  IoLeafOutline,
  IoLocationOutline,
  IoLogoApple,
  IoLogoGooglePlaystore,
  IoMailOutline,
  IoMenu,
  IoNotificationsOutline,
  IoOpenOutline,
  IoPawOutline,
  IoPersonOutline,
  IoPlayCircleOutline,
  IoRibbonOutline,
  IoSchoolOutline,
  IoSearchOutline,
  IoSend,
  IoShieldCheckmarkOutline,
  IoSparklesOutline,
  IoStatsChartOutline,
  IoTimeOutline,
  IoWalletOutline,
  IoWaterOutline,
} from 'react-icons/io5';
import { CANCELLATION_POLICY, HOME_CATEGORY_CARDS } from '@/config/constants';
import { ENV } from '@/config/env';
import './landing.css';

// Public landing page at "/" for signed-out visitors.
// Every claim is either something the product does (README "What's on the
// site") or published by the source it links to (annalia.beauty, press).
// No invented ratings, counts or testimonials.

// ─── Content ────────────────────────────────────────────────────────────────
const IMG = {
  hero: '/assets/images/mock/6.png',
  bridal: '/assets/images/categories/indian-bridal.jpg',
  annalia: '/assets/images/1000128638-removebg-preview.png',
  party: '/assets/images/categories/party-makeup.jpg',
  editorial: '/assets/images/categories/editorial.jpg',
};
const SUPPORT_EMAIL = 'support@juviapp.com';
const SHOP = 'https://annalia.beauty';
const ANNALIA_CLASS_URL = `${SHOP}/pages/annalia-zhimomi`;
const ANNALIA_ABOUT_URL = `${SHOP}/pages/about-us`;
const PRESS_URL =
  'https://www.easternmirrornagaland.com/nagalands-first-homegrown-beauty-brand-annalia-beauty-launches-two-products';
const CITIES = ['Dimapur', 'Kohima', 'Guwahati', 'Shillong', 'Imphal'];

const NAV = [
  { href: '#services', label: 'Services' },
  { href: '#annalia', label: 'Annalia' },
  { href: '#shop', label: 'Shop' },
  { href: '#app', label: 'App' },
  { href: '#artists', label: 'For artists' },
];

const STEPS = [
  { icon: IoSearchOutline, title: 'Discover', body: 'Browse artists by service, watch their reels and read reviews from past clients.' },
  { icon: IoCalendarOutline, title: 'Pick a time', body: "Choose a date and a slot from the artist's live availability — no back-and-forth." },
  { icon: IoHomeOutline, title: 'Home or studio', body: 'Have your artist come to you, or visit their studio. Add your address and notes.' },
  { icon: IoKeyOutline, title: 'Relax & glow', body: 'Pay an advance to confirm. A start and finish code keeps every appointment accountable.' },
];

// Collection photos are annalia.beauty's own, served from its Shopify CDN
// (from its public /collections.json). `width` asks Shopify for a resized copy.
const SHOPIFY = 'https://cdn.shopify.com/s/files/1/0796/1310/0353/collections';
const SHOP_FEATURED = [
  { name: 'Brushes & Kits', tag: 'Brushes — new in', path: '/collections/brushes-kits', image: `${SHOPIFY}/FullBrushKit2.jpg?v=1777972726&width=800`, alt: 'Annalia Beauty brush kit' },
  { name: 'Kohl Drama', tag: 'It’s eye-conic', path: '/collections/kajal', image: `${SHOPIFY}/WhatsAppImage2025-11-05at14.51.07.jpg?v=1777135189&width=800`, alt: 'Annalia Beauty Kohl Drama kajal' },
  { name: 'Eyelashes', tag: 'Eye lashes — new in', path: '/collections/eyelashes', image: `${SHOPIFY}/annaliabeauty_flirty_eyelashes-2.jpg?v=1778086722&width=800`, alt: 'Annalia Beauty eyelashes' },
  { name: 'Sponges', tag: 'Soft. Bouncy. Precision.', path: '/collections/sponges', image: `${SHOPIFY}/5-1.jpg?v=1779178532&width=800`, alt: 'Annalia Beauty Velvet Sponge' },
];
// Best sellers as listed on annalia.beauty's home page. Images are the
// products' own Shopify photos (filled in from the shop's public product feed).
const SHOPIFY_FILES = 'https://cdn.shopify.com/s/files/1/0796/1310/0353/files';
const bs = (handle: string, title: string, file: string) => ({ handle, title, image: `${SHOPIFY_FILES}/${file}&width=720` });
const BEST_SELLERS = [
  bs('after-dark-kohl-set', 'After-Dark Kohl Drama Set', 'WhatsApp_Image_2026-05-04_at_7.11.02_PM.jpg?v=1777969561'),
  bs('babydoll-lashes', 'Babydoll Eyelashes', 'WhatsAppImage2026-04-29at10.22.06PM.jpg?v=1777663679'),
  bs('blush-powder-brush', 'Blush Powder Brush #03', 'WhatsApp_Image_2026-05-06_at_12.49.32_PM_1.jpg?v=1778086195'),
  bs('annalia-beauty-pro-sculpt-contour-stick', 'Pro Sculpt', 'WhatsApp_Image_2026-04-25_at_5.32.32_PM.jpg?v=1777134162'),
  bs('instant-nose-job-duo', 'Instant Nose Job Duo', 'WhatsAppImage2026-05-02at12.00.33AM_1.jpg?v=1777665478'),
  bs('kohl-drama', 'Kohl Drama Rotating Pencil', 'WhatsApp_Image_2026-04-25_at_5.33.54_PM.jpg?v=1777134162'),
  bs('velvet-sponges', 'Velvet Sponge', 'WhatsApp_Image_2026-04-28_at_12.00.35_PM.jpg?v=1777428518'),
  bs('eye-brush-kit', 'Eye Brush Kit', 'WhatsAppImage2026-05-01at11.52.15PM_1.jpg?v=1777663917'),
  bs('face-brush-kit', 'Face Brush Kit', 'WhatsAppImage2026-05-01at11.55.03PM_2.jpg?v=1777664113'),
];
const SHOP_MORE = [
  { name: 'Pro Sculpt', path: '/collections/sculpt' },
  { name: 'Lash Glue', path: '/collections/lash-glue' },
  { name: 'Combo Offers', path: '/collections/combo-offer' },
  { name: 'New launches', path: '/collections/newly-launched' },
];
const SHOP_VALUES = [
  { icon: IoWaterOutline, label: 'Dermatologically tested' },
  { icon: IoHeartOutline, label: 'Cruelty free' },
  { icon: IoLeafOutline, label: '100% vegan' },
  { icon: IoFlaskOutline, label: 'Paraben free' },
  { icon: IoHandLeftOutline, label: 'Safe on skin' },
  { icon: IoPawOutline, label: 'Not tested on animals' },
];

const APP_FEATURES = [
  { icon: IoCalendarOutline, title: 'Book in a few taps', body: 'Live slots, saved addresses and a clear price breakdown.' },
  { icon: IoFilmOutline, title: 'Reels from artists', body: 'Swipe through real work before you choose.' },
  { icon: IoNotificationsOutline, title: 'Updates & chat', body: 'Booking alerts and live chat with the JUVI team.' },
  { icon: IoGiftOutline, title: 'Rewards & referrals', body: 'Earn JUVI Rewards and invite friends.' },
];

const ARTIST_FEATURES = [
  { icon: IoCalendarOutline, label: 'Schedule & bookings' },
  { icon: IoTimeOutline, label: 'Working hours & time off' },
  { icon: IoWalletOutline, label: 'Earnings & payouts' },
  { icon: IoImagesOutline, label: 'Portfolio & services' },
  { icon: IoFilmOutline, label: 'Reels to get discovered' },
  { icon: IoStatsChartOutline, label: 'Reviews & analytics' },
];

const { fullRefundHours, partialRefundHours } = CANCELLATION_POLICY;
const FAQ = [
  {
    q: 'How do I book an artist?',
    a: 'Sign in with your phone number, pick a service and an artist, choose a slot from their live availability, confirm home or studio, and pay the advance. That’s it.',
  },
  { q: 'Which cities is JUVI in?', a: `${CITIES.join(', ')} and more across North-East India.` },
  {
    q: 'What if I need to cancel?',
    a: `Cancel more than ${fullRefundHours} hours before your appointment for a full refund, or between ${partialRefundHours} and ${fullRefundHours} hours for 50%. You can also reschedule from My Bookings.`,
  },
  {
    q: 'Will the artist come to my home?',
    a: 'You choose home or studio when you confirm, depending on what your artist offers. Add your address and any notes for the day.',
  },
  {
    q: 'How do I become a JUVI artist?',
    a: 'Sign in and open the artist area to apply. You can track your application’s status there and finish four short onboarding steps once you’re in.',
  },
  { q: 'Can I use JUVI on the web?', a: 'Yes — this website uses the same account as the app, so your bookings, saved artists and messages are in both.' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.lp-reveal');
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        }),
      { rootMargin: '0px 0px -8% 0px', threshold: 0.1 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setY(window.scrollY));
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', on);
    };
  }, []);
  return y;
}

function Reveal({ children, delay = 0, className = '', as: Tag = 'div' }: { children: ReactNode; delay?: number; className?: string; as?: 'div' | 'li' }) {
  return (
    <Tag className={`lp-reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </Tag>
  );
}

function External({ href, className, children, label }: { href: string; className?: string; children: ReactNode; label?: string }) {
  return (
    <a href={href} className={className} target="_blank" rel="noopener noreferrer" aria-label={label}>
      {children}
    </a>
  );
}

function SectionHead({ eyebrow, title, sub, center }: { eyebrow: string; title: ReactNode; sub?: ReactNode; center?: boolean }) {
  return (
    <Reveal className={`lp-section-head ${center ? 'lp-center-text' : ''}`}>
      <p className="lp-eyebrow">{eyebrow}</p>
      <h2 className="lp-h2">{title}</h2>
      {sub && <p className="lp-sub">{sub}</p>}
    </Reveal>
  );
}

function StoreButtons({ light }: { light?: boolean }) {
  const stores = [
    { url: ENV.APP_STORE_URL, icon: IoLogoApple, top: 'Download on the', name: 'App Store' },
    { url: ENV.PLAY_STORE_URL, icon: IoLogoGooglePlaystore, top: 'Get it on', name: 'Google Play' },
  ];
  return (
    <div className="lp-stores">
      {stores.map((s) => {
        const inner = (
          <>
            <s.icon aria-hidden />
            <span>
              <small>{s.url ? s.top : 'Coming soon to'}</small>
              <strong>{s.name}</strong>
            </span>
          </>
        );
        const cls = `lp-store ${light ? 'lp-store-light' : ''} ${s.url ? '' : 'is-soon'}`;
        return s.url ? (
          <External key={s.name} href={s.url} className={cls}>
            {inner}
          </External>
        ) : (
          <span key={s.name} className={cls} aria-label={`${s.name} — coming soon`}>
            {inner}
          </span>
        );
      })}
    </div>
  );
}

// ─── Header ─────────────────────────────────────────────────────────────────
function Header({ scrolled }: { scrolled: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <div className="lp-announce">
        <div className="lp-container lp-announce-inner">
          <span className="lp-announce-text">
            <IoSparklesOutline aria-hidden /> Shop Annalia Beauty
            <span className="lp-hide-sm"> — kohl, lashes, sculpt & pro brushes</span>
          </span>
          <External href={SHOP} className="lp-announce-link">
            Shop now <IoArrowForward aria-hidden />
          </External>
        </div>
      </div>

      <header className={`lp-nav ${scrolled ? 'is-scrolled' : ''} ${open ? 'is-open' : ''}`}>
        <div className="lp-container lp-nav-inner">
          <a href="#top" className="lp-wordmark" aria-label="JUVI — back to top" onClick={close}>
            JUVI
          </a>
          <nav className="lp-nav-links" aria-label="Sections">
            {NAV.map((n) => (
              <a key={n.href} href={n.href}>
                {n.label}
              </a>
            ))}
          </nav>
          <div className="lp-nav-actions">
            <Link to="/login" className="lp-link-quiet lp-hide-sm">
              Sign in
            </Link>
            <Link to="/login" className="lp-btn lp-btn-dark lp-btn-sm">
              Book now
            </Link>
            <button
              type="button"
              className="lp-burger"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="lp-menu"
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <IoClose /> : <IoMenu />}
            </button>
          </div>
        </div>
      </header>

      <div id="lp-menu" className={`lp-menu ${open ? 'is-open' : ''}`} aria-hidden={!open}>
        <nav className="lp-menu-links" aria-label="Menu">
          {[...NAV, { href: '#faq', label: 'FAQ' }, { href: '#contact', label: 'Contact' }].map((n, i) => (
            <a key={n.href} href={n.href} onClick={close} style={{ transitionDelay: open ? `${80 + i * 45}ms` : '0ms' }} tabIndex={open ? 0 : -1}>
              <span>0{i + 1}</span>
              {n.label}
            </a>
          ))}
        </nav>
        <div className="lp-menu-foot">
          <Link to="/login" className="lp-btn lp-btn-dark" onClick={close} tabIndex={open ? 0 : -1}>
            Sign in / Book <IoArrowForward aria-hidden />
          </Link>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="lp-menu-mail" tabIndex={open ? 0 : -1}>
            <IoMailOutline aria-hidden /> {SUPPORT_EMAIL}
          </a>
        </div>
      </div>
    </>
  );
}

// ─── Sections ───────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="lp-hero" id="top">
      <div className="lp-hero-glow" aria-hidden />
      <div className="lp-container lp-hero-grid">
        <div className="lp-hero-copy">
          <p className="lp-eyebrow lp-in" style={{ animationDelay: '60ms' }}>
            <span className="lp-dot" /> Beauty booking · North-East India
          </p>
          <h1 className="lp-display lp-in" style={{ animationDelay: '140ms' }}>
            Luxury beauty,
            <br />
            <em>on demand.</em>
          </h1>
          <p className="lp-lede lp-in" style={{ animationDelay: '220ms' }}>
            Find the region’s most sought-after makeup and beauty artists, see their work, and book a time that suits you
            — at home or in their studio.
          </p>
          <div className="lp-hero-ctas lp-in" style={{ animationDelay: '300ms' }}>
            <Link to="/login" className="lp-btn lp-btn-dark">
              Book an artist <IoArrowForward aria-hidden />
            </Link>
            <a href="#app" className="lp-btn lp-btn-ghost">
              Get the app
            </a>
          </div>
          <ul className="lp-hero-proof lp-in" style={{ animationDelay: '380ms' }}>
            <li>
              <IoHomeOutline aria-hidden /> Home or studio
            </li>
            <li>
              <IoCalendarOutline aria-hidden /> Live time slots
            </li>
            <li>
              <IoShieldCheckmarkOutline aria-hidden /> Clear refund policy
            </li>
          </ul>
        </div>

        <div className="lp-hero-visual lp-in" style={{ animationDelay: '200ms' }}>
          <div className="lp-arch">
            <img src={IMG.hero} alt="Soft, glowing skin makeup look" {...{ fetchpriority: 'high' }} />
          </div>
          <div className="lp-hero-ring" aria-hidden>
            <svg viewBox="0 0 120 120">
              <defs>
                <path id="lp-circle" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" />
              </defs>
              <text>
                <textPath href="#lp-circle">LUXURY BEAUTY · ON DEMAND · JUVI · </textPath>
              </text>
            </svg>
            <span>✦</span>
          </div>
          <div className="lp-float lp-float-a">
            <span className="lp-float-icon">
              <IoSparklesOutline aria-hidden />
            </span>
            <span>
              <strong>8 specialities</strong>
              <small>Bridal to skin & facials</small>
            </span>
          </div>
          <div className="lp-float lp-float-b">
            <span className="lp-float-icon">
              <IoPlayCircleOutline aria-hidden />
            </span>
            <span>
              <strong>See before you book</strong>
              <small>Reels & portfolios</small>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function CityMarquee() {
  const row = [...CITIES, ...CITIES];
  return (
    <div className="lp-marquee" role="note" aria-label={`Live in ${CITIES.join(', ')} and more`}>
      <div className="lp-marquee-track" aria-hidden>
        {[0, 1].map((k) => (
          <div className="lp-marquee-group" key={k}>
            {row.map((c, i) => (
              <span key={`${k}-${i}`}>
                {c} <i>✦</i>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Services() {
  return (
    <section className="lp-section" id="services">
      <div className="lp-container">
        <div className="lp-head-row">
          <SectionHead
            eyebrow="The services"
            title={
              <>
                Every occasion, <em>one artist away.</em>
              </>
            }
            sub="From your wedding morning to a Friday night out — book a specialist for exactly what you need."
          />
          <Reveal className="lp-head-aside">
            <Link to="/login" className="lp-text-link">
              Explore all artists <IoArrowForward aria-hidden />
            </Link>
          </Reveal>
        </div>
        <div className="lp-bento">
          {HOME_CATEGORY_CARDS.map((c, i) => (
            <Reveal key={c.title} delay={(i % 4) * 70} className={`lp-tile lp-tile-${i}`}>
              <Link to="/login" className="lp-tile-link" aria-label={`Book ${c.title}`}>
                <img src={c.image} alt="" loading="lazy" />
                <span className="lp-tile-shade" />
                <span className="lp-tile-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="lp-tile-label">
                  {c.title}
                  <IoArrowForward aria-hidden />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="lp-section lp-how" id="how">
      <div className="lp-container">
        <SectionHead
          eyebrow="How it works"
          title={
            <>
              Booked in minutes, <em>not messages.</em>
            </>
          }
        />
        <ol className="lp-steps">
          {STEPS.map((s, i) => (
            <Reveal as="li" key={s.title} delay={i * 90} className="lp-step">
              <span className="lp-step-num">0{i + 1}</span>
              <span className="lp-step-icon">
                <s.icon aria-hidden />
              </span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

function WhyJuvi() {
  const items = [
    { icon: IoLocationOutline, title: 'Made for the North-East', body: `Artists across ${CITIES.slice(0, 4).join(', ')} and beyond — people who know your occasions.` },
    { icon: IoCashOutline, title: 'Transparent pricing', body: 'A full price breakdown at checkout. Pay an advance to confirm, the rest after your service.' },
    {
      icon: IoShieldCheckmarkOutline,
      title: 'Fair cancellations',
      body: `Full refund more than ${fullRefundHours} hours ahead, 50% between ${partialRefundHours}–${fullRefundHours} hours. Or simply reschedule.`,
    },
    { icon: IoChatbubbleOutline, title: 'A team on chat', body: 'Message the JUVI team live from your booking — before, during or after.' },
  ];
  return (
    <section className="lp-section">
      <div className="lp-container lp-promise">
        <Reveal className="lp-promise-visual">
          <img src={IMG.bridal} alt="Indian bridal makeup with veil and jewellery" loading="lazy" />
          <span className="lp-promise-tag">The bridal edit</span>
        </Reveal>
        <div className="lp-promise-copy">
          <SectionHead
            eyebrow="Why JUVI"
            title={
              <>
                Your big day deserves <em>zero guesswork.</em>
              </>
            }
            sub="Know the price before you pay, know the policy before you book, and talk to us whenever you need."
          />
          <div className="lp-promise-list">
            {items.map((it, i) => (
              <Reveal key={it.title} delay={60 * (i + 1)} className="lp-promise-item">
                <it.icon aria-hidden />
                <div>
                  <h3>{it.title}</h3>
                  <p>{it.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MeetAnnalia() {
  return (
    <section className="lp-annalia" id="annalia">
      <div className="lp-annalia-bg" aria-hidden>
        ANNALIA
      </div>
      <div className="lp-container lp-annalia-grid">
        <Reveal className="lp-annalia-visual">
          <div className="lp-annalia-arch" aria-hidden />
          <img src={IMG.annalia} alt="Annalia Zhimomi holding a makeup brush" loading="lazy" />
          <span className="lp-signature" aria-hidden>
            Annalia
          </span>
          <span className="lp-sparkle lp-an-s1" aria-hidden>
            ✦
          </span>
          <span className="lp-sparkle lp-an-s2" aria-hidden>
            ✦
          </span>
        </Reveal>

        <div className="lp-annalia-copy">
          <Reveal>
            <p className="lp-eyebrow lp-eyebrow-light">Meet the artist</p>
            <h2 className="lp-h2 lp-h2-light">
              Annalia <em>Zhimomi</em>
            </h2>
            <p className="lp-sub lp-sub-light">
              A makeup artist from Dimapur, Nagaland, with over 11 years in the industry. Annalia is the face behind{' '}
              <External href={ANNALIA_ABOUT_URL} className="lp-inline-link">
                Annalia Beauty
              </External>{' '}
              — named by the press as{' '}
              <External href={PRESS_URL} className="lp-inline-link">
                Nagaland’s first homegrown beauty brand
              </External>{' '}
              — and she teaches the pro courses on JUVI.
            </p>
          </Reveal>

          <Reveal delay={80} className="lp-stats">
            <div>
              <strong>11+</strong>
              <span>years in makeup artistry</span>
            </div>
            <div>
              <strong>Own</strong>
              <span>makeup line, Annalia Beauty</span>
            </div>
            <div>
              <strong>Pro</strong>
              <span>bridal makeup & hair classes</span>
            </div>
          </Reveal>

          <div className="lp-annalia-cards">
            <Reveal delay={140} className="lp-an-card">
              <IoSchoolOutline aria-hidden />
              <h3>Learn with Annalia</h3>
              <p>Bridal, hair and business courses on JUVI — video lessons and PDF guides at your own pace.</p>
              <Link to="/login" className="lp-text-link lp-text-link-light">
                Explore courses <IoArrowForward aria-hidden />
              </Link>
            </Reveal>
            <Reveal delay={200} className="lp-an-card">
              <IoRibbonOutline aria-hidden />
              <h3>Pro Bridal Makeup & Hair class</h3>
              <p>Hands-on, in-person batches in Nagaland. Details, dates and seats on annalia.beauty.</p>
              <External href={ANNALIA_CLASS_URL} className="lp-text-link lp-text-link-light">
                See the class <IoOpenOutline aria-hidden />
              </External>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

// Swipeable best-seller row in annalia.beauty's style. Prices are left to
// the shop (they change with sales); each card opens the product page.
function BestSellers() {
  const rail = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false, progress: 0 });

  const update = () => {
    const el = rail.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdge({ start: el.scrollLeft < 4, end: el.scrollLeft > max - 4, progress: max > 0 ? el.scrollLeft / max : 1 });
  };
  useEffect(update, []);

  const page = (dir: 1 | -1) => {
    const el = rail.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <div className="lp-bs">
      <Reveal className="lp-bs-head">
        <h3>
          Our <em>best sellers</em>
        </h3>
        <div className="lp-bs-arrows">
          <button type="button" onClick={() => page(-1)} disabled={edge.start} aria-label="Previous products">
            <IoArrowBack />
          </button>
          <button type="button" onClick={() => page(1)} disabled={edge.end} aria-label="More products">
            <IoArrowForward />
          </button>
        </div>
      </Reveal>
      <div className="lp-bs-rail" ref={rail} onScroll={update}>
        {BEST_SELLERS.map((p) => (
          <External key={p.handle} href={`${SHOP}/products/${p.handle}`} className="lp-bs-card" label={`${p.title} on annalia.beauty`}>
            <span className="lp-bs-img">
              <img src={p.image} alt={p.title} loading="lazy" />
              <span className="lp-bs-cta">
                <IoBagHandleOutline aria-hidden /> Shop now
              </span>
            </span>
            <small>Annalia Beauty</small>
            <strong>{p.title}</strong>
          </External>
        ))}
      </div>
      <div className="lp-bs-progress" aria-hidden>
        <span style={{ width: `${Math.max(18, edge.progress * 100)}%` }} />
      </div>
    </div>
  );
}

function Shop() {
  return (
    <section className="lp-section lp-ab" id="shop">
      <div className="lp-container">
        <div className="lp-head-row">
          <SectionHead
            eyebrow="Annalia Beauty"
            title={
              <>
                The artist’s kit, <em>now yours.</em>
              </>
            }
            sub="Shop Annalia’s own makeup line — the brushes, kohl, lashes and sponges she works with, for your vanity."
          />
          <Reveal className="lp-head-aside">
            <External href={SHOP} className="lp-btn lp-ab-btn">
              <IoBagHandleOutline aria-hidden /> Shop all
            </External>
          </Reveal>
        </div>

        <div className="lp-ab-grid">
          {SHOP_FEATURED.map((c, i) => (
            <Reveal key={c.name} delay={i * 70} className="lp-ab-tile">
              <External href={`${SHOP}${c.path}`} className="lp-ab-link" label={`Shop ${c.name} on annalia.beauty`}>
                <span className="lp-ab-img">
                  <img src={c.image} alt={c.alt} loading="lazy" />
                </span>
                <strong>{c.name}</strong>
                <span className="lp-ab-tag">{c.tag}</span>
                <span className="lp-ab-check">Check now</span>
              </External>
            </Reveal>
          ))}
        </div>

        <BestSellers />

        <Reveal className="lp-ab-more">
          <span>Also in the line</span>
          {SHOP_MORE.map((c) => (
            <External key={c.name} href={`${SHOP}${c.path}`} className="lp-ab-pill">
              {c.name}
            </External>
          ))}
        </Reveal>

        <Reveal className="lp-ab-values">
          {SHOP_VALUES.map((v) => (
            <span key={v.label}>
              <i>
                <v.icon aria-hidden />
              </i>
              {v.label}
            </span>
          ))}
        </Reveal>
        <p className="lp-ab-note">Product claims as stated by Annalia Beauty. Orders, prices and delivery are handled on annalia.beauty.</p>
      </div>
    </section>
  );
}

// Real App Store screenshots (public/assets/images/app), cropped below the
// app's greeting; the header here re-creates it without the tester's name.
const APP_SHOTS = { front: '/assets/images/app/home-annalia.jpg', back: '/assets/images/app/home-bridal.jpg' };
const APP_ICON = '/assets/images/app/icon.jpg';

function PhoneShot({ src, label, className = '' }: { src: string; label: string; className?: string }) {
  return (
    <div className={`lp-phone ${className}`} role={label ? 'img' : undefined} aria-label={label || undefined} aria-hidden={!label}>
      <div className="lp-phone-notch" />
      <div className="lp-phone-screen">
        <div className="lp-ps-head">
          <span>
            <small>Good afternoon</small>
            <strong>
              Near You <IoChevronDown />
            </strong>
          </span>
          <span className="lp-ps-avatar">
            <IoPersonOutline />
          </span>
        </div>
        <img src={src} alt="" loading="lazy" />
      </div>
    </div>
  );
}

function AppSection() {
  return (
    <section className="lp-section lp-app" id="app">
      <div className="lp-container lp-app-grid">
        <div className="lp-app-copy">
          <SectionHead
            eyebrow="The JUVI app"
            title={
              <>
                Your beauty diary, <em>in your pocket.</em>
              </>
            }
            sub="Everything on this website and more — booking alerts, reels and rewards, all in one beautifully simple app."
          />
          <div className="lp-app-features">
            {APP_FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 60} className="lp-app-feature">
                <span className="lp-step-icon">
                  <f.icon aria-hidden />
                </span>
                <div>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={120} className="lp-app-get">
            <div className="lp-app-tile">
              <img src={APP_ICON} alt="JUVI app icon" width={64} height={64} loading="lazy" />
              <span>
                <strong>JUVI</strong>
                <small>Free · iPhone & Android</small>
              </span>
            </div>
            <StoreButtons />
          </Reveal>
        </div>

        <Reveal className="lp-phone-wrap">
          <div className="lp-phone-glow" aria-hidden />
          <PhoneShot src={APP_SHOTS.back} className="lp-phone-back" label="" />
          <PhoneShot src={APP_SHOTS.front} label="The JUVI app home screen: Most Booked — Annalia Zhimomi's Bridal Makeup Package" />
          <div className="lp-float lp-float-c">
            <span className="lp-float-icon">
              <IoCalendarOutline aria-hidden />
            </span>
            <span>
              <strong>Booking confirmed</strong>
              <small>Bridal makeup · Sat, 9:00 AM</small>
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function ForArtists() {
  return (
    <section className="lp-section lp-artists" id="artists">
      <div className="lp-container lp-artists-grid">
        <Reveal className="lp-artists-visual">
          <img src={IMG.editorial} alt="Editorial makeup look" loading="lazy" />
          <div className="lp-artists-badge">
            <IoSparklesOutline aria-hidden />
            <span>
              <strong>Join JUVI</strong>
              <small>Apply in the artist area</small>
            </span>
          </div>
        </Reveal>
        <div>
          <SectionHead
            eyebrow="For artists"
            title={
              <>
                Your craft. <em>Your business.</em>
              </>
            }
            sub="Everything you need to run your bookings in one place — and to be found by clients across the region."
          />
          <div className="lp-feature-grid">
            {ARTIST_FEATURES.map((f, i) => (
              <Reveal key={f.label} delay={i * 50} className="lp-feature">
                <f.icon aria-hidden />
                <span>{f.label}</span>
              </Reveal>
            ))}
          </div>
          <Reveal delay={100} className="lp-artists-cta">
            <Link to="/partner" className="lp-btn lp-btn-dark">
              Apply as an artist <IoArrowForward aria-hidden />
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section className="lp-section lp-faq-section" id="faq">
      <div className="lp-container lp-faq-grid">
        <SectionHead
          eyebrow="FAQ"
          title={
            <>
              Questions, <em>answered.</em>
            </>
          }
          sub={
            <>
              Can’t find what you need? Write to us at{' '}
              <a className="lp-inline-link lp-inline-dark" href={`mailto:${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </a>
              .
            </>
          }
        />
        <div className="lp-faq">
          {FAQ.map((f, i) => (
            <Reveal key={f.q} delay={i * 40}>
              <details className="lp-faq-item" open={i === 0}>
                <summary>
                  {f.q}
                  <span className="lp-faq-icon" aria-hidden>
                    <IoAdd />
                  </span>
                </summary>
                <p>{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact() {
  const [form, setForm] = useState({ name: '', topic: 'Booking help', message: '' });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // No backend endpoint for this yet: hand the message to the visitor's own
  // mail app, addressed to support.
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const subject = `[${form.topic}] ${form.name ? `from ${form.name}` : 'Website enquiry'}`;
    const body = `${form.message}\n\n— ${form.name || 'Sent from the JUVI website'}`;
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <section className="lp-section" id="contact">
      <div className="lp-container">
        <Reveal className="lp-contact">
          <div className="lp-contact-copy">
            <p className="lp-eyebrow lp-eyebrow-light">Get in touch</p>
            <h2 className="lp-h2 lp-h2-light">
              Let’s make it <em>beautiful.</em>
            </h2>
            <p className="lp-sub lp-sub-light">
              Booking help, artist partnerships, press or anything else — we read every message.
            </p>
            <a className="lp-contact-mail" href={`mailto:${SUPPORT_EMAIL}`}>
              <IoMailOutline aria-hidden />
              {SUPPORT_EMAIL}
            </a>
            <p className="lp-contact-cities">
              <IoLocationOutline aria-hidden /> {CITIES.join(' · ')}
            </p>
          </div>
          <form className="lp-form" onSubmit={submit}>
            <label>
              <span>Your name</span>
              <input value={form.name} onChange={set('name')} autoComplete="name" placeholder="Full name" />
            </label>
            <label>
              <span>Topic</span>
              <select value={form.topic} onChange={set('topic')}>
                <option>Booking help</option>
                <option>Becoming a JUVI artist</option>
                <option>Courses</option>
                <option>Partnerships & press</option>
                <option>Something else</option>
              </select>
            </label>
            <label>
              <span>Message</span>
              <textarea value={form.message} onChange={set('message')} rows={4} required placeholder="How can we help?" />
            </label>
            <button type="submit" className="lp-btn lp-btn-light lp-btn-block">
              Send message <IoSend aria-hidden />
            </button>
            <small className="lp-form-note">Opens your email app with the message ready to send.</small>
          </form>
        </Reveal>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="lp-section lp-final-section">
      <div className="lp-container">
        <Reveal className="lp-final">
          <img className="lp-final-img lp-final-img-l" src={IMG.party} alt="" loading="lazy" />
          <img className="lp-final-img lp-final-img-r" src={IMG.hero} alt="" loading="lazy" />
          <p className="lp-eyebrow">Your next look</p>
          <h2 className="lp-final-title">
            Ready to <em>glow?</em>
          </h2>
          <p className="lp-sub">Sign in with your phone number and book your first artist today.</p>
          <div className="lp-hero-ctas lp-center">
            <Link to="/login" className="lp-btn lp-btn-dark">
              Get started <IoArrowForward aria-hidden />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="lp-footer">
      <div className="lp-container">
        <div className="lp-footer-top">
          <div className="lp-footer-brand">
            <span className="lp-wordmark lp-wordmark-lg">JUVI</span>
            <p className="lp-footer-tag">Luxury beauty on demand, across North-East India.</p>
            <StoreButtons light />
          </div>
          <div className="lp-footer-cols">
            <div>
              <h4>Explore</h4>
              <a href="#services">Services</a>
              <a href="#how">How it works</a>
              <a href="#app">The app</a>
              <a href="#faq">FAQ</a>
              <Link to="/login">Sign in</Link>
            </div>
            <div>
              <h4>Annalia</h4>
              <a href="#annalia">Meet Annalia</a>
              <External href={ANNALIA_CLASS_URL}>Pro classes</External>
              <External href={SHOP}>Annalia Beauty shop</External>
              <External href={`${SHOP}/collections/newly-launched`}>New launches</External>
            </div>
            <div>
              <h4>Company</h4>
              <a href="#artists">For artists</a>
              <a href="#contact">Contact</a>
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
              <Link to="/legal">Terms & privacy</Link>
            </div>
          </div>
        </div>

        <div className="lp-footer-cities">
          <span>Live in</span>
          {CITIES.map((c) => (
            <em key={c}>{c}</em>
          ))}
          <span>& more</span>
        </div>

        <div className="lp-footer-giant" aria-hidden>
          JUVI
        </div>

        <div className="lp-footer-base">
          <span>© {year} JUVI Beauty Boutique. All rights reserved.</span>
          <span className="lp-credit">
            Designed & developed by{' '}
            <External href="https://innspiremedia.com">Innspire Media</External>
          </span>
          <a href="#top" className="lp-to-top">
            Back to top <IoArrowUp aria-hidden />
          </a>
        </div>
      </div>
    </footer>
  );
}

// Phone-width only: a booking bar once the hero's buttons are off screen.
function MobileBar({ show }: { show: boolean }) {
  return (
    <div className={`lp-mobilebar ${show ? 'is-shown' : ''}`} aria-hidden={!show}>
      <a href={`mailto:${SUPPORT_EMAIL}`} className="lp-mobilebar-icon" aria-label="Email JUVI" tabIndex={show ? 0 : -1}>
        <IoMailOutline />
      </a>
      <Link to="/login" className="lp-btn lp-btn-dark lp-btn-block" tabIndex={show ? 0 : -1}>
        Book an artist <IoArrowForward aria-hidden />
      </Link>
    </div>
  );
}

export default function LandingPage() {
  useReveal();
  const y = useScrollY();
  useEffect(() => {
    document.title = 'JUVI — Luxury Beauty on Demand';
  }, []);

  const nearBottom = typeof document !== 'undefined' && y + window.innerHeight > document.documentElement.scrollHeight - 400;

  return (
    <div className="lp">
      <a className="lp-skip" href="#services">
        Skip to content
      </a>
      <Header scrolled={y > 40} />
      <main>
        <Hero />
        <CityMarquee />
        <Services />
        <HowItWorks />
        <WhyJuvi />
        <MeetAnnalia />
        <Shop />
        <AppSection />
        <ForArtists />
        <Faq />
        <Contact />
        <FinalCta />
      </main>
      <Footer />
      <MobileBar show={y > 640 && !nearBottom} />
    </div>
  );
}
