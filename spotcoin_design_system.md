# SPOTCOIN — DESIGN SYSTEM
# Based on the Cafe Cursor (cafe.cursornigeria.com) design language.
# Paste this into every Cursor prompt that involves building UI.
# ================================================================


## DESIGN LANGUAGE SUMMARY

The aesthetic is: dark-mode native, brutally minimal, high contrast,
warm black backgrounds, thin rounded cards, muted icon containers,
green as the ONLY accent colour, small sparing typography.

Think: a well-built mobile app. Clean. Confident. No decoration.
Every pixel earns its place. Nothing is colourful for the sake of it.


## COLOUR TOKENS
Define these as CSS variables in globals.css or tailwind.config.ts.
Use NOTHING else for colour — no hardcoded hex anywhere in components.

```css
:root {
  /* Backgrounds — layered warm blacks, NOT pure #000 */
  --bg-base:    #0a0a0a;   /* page / body */
  --bg-card:    #141414;   /* cards, list rows */
  --bg-card-2:  #1c1c1c;   /* icon containers, inner wells */
  --bg-input:   #1c1c1c;   /* inputs, textareas */
  --bg-overlay: #242424;   /* modals, bottom sheets */

  /* Borders — very subtle, 1px only */
  --border:     rgba(255,255,255,0.07);
  --border-mid: rgba(255,255,255,0.12);

  /* Text */
  --text-primary:   #f5f5f5;  /* headings, bold labels */
  --text-secondary: #8a8a8a;  /* subtitles, meta */
  --text-tertiary:  #555555;  /* placeholders, disabled */

  /* Accent — green only, used sparingly */
  --accent:         #22c55e;  /* active states, badges, CTAs */
  --accent-bg:      rgba(34,197,94,0.15); /* green badge background */
  --accent-border:  rgba(34,197,94,0.3);  /* green badge border */

  /* Status */
  --success:  #22c55e;
  --warning:  #f59e0b;
  --error:    #ef4444;

  /* Nav */
  --nav-bg:     #0f0f0f;
  --nav-border: rgba(255,255,255,0.06);
  --nav-active: #f5f5f5;   /* active icon/label is white */
  --nav-inactive: #4a4a4a; /* inactive is dark grey */
}
```


## TYPOGRAPHY

Font: Geist (available from vercel/geist — install via npm i geist)
Import in layout.tsx:
  import { GeistSans } from 'geist/font/sans'
  import { GeistMono } from 'geist/font/mono'

```
Display / Hero:    GeistSans, 32–40px, weight 700, color --text-primary
Section heading:   GeistSans, 20px, weight 600, color --text-primary
Card title:        GeistSans, 16px, weight 600, color --text-primary
Card subtitle:     GeistSans, 13px, weight 400, color --text-secondary
Meta / label:      GeistSans, 11px, weight 500, letter-spacing 0.08em,
                   UPPERCASE, color --text-secondary
Body:              GeistSans, 14px, weight 400, color --text-primary
  line-height 1.6
Mono (amounts):    GeistMono, 14px, color --text-primary
```

The hero greeting pattern (home page):
```
LOCATION · DATE          ← 11px uppercase, --text-secondary, letter-spacing 0.08em
Hey [Name].              ← 36px, weight 700, --text-primary
[Tagline]. [Tagline].    ← 36px, weight 700, --text-secondary (muted)
```


## SPACING SCALE
Use only these values. No arbitrary numbers.
```
4px   xs
8px   sm
12px  md
16px  base
20px  lg
24px  xl
32px  2xl
40px  3xl
```
Page horizontal padding: 20px on mobile, 24px on desktop.
Card internal padding: 16px all sides.
Gap between cards in a grid: 12px.
Gap between list rows: 8px.


## COMPONENT PATTERNS

### Page layout
```tsx
<main className="min-h-screen bg-[--bg-base] pb-24">
  {/* pb-24 = space for fixed bottom nav */}
  <div className="max-w-lg mx-auto px-5">
    {/* content */}
  </div>
</main>
```

### Card
Dark rounded rectangle. 1px border. No shadow.
```tsx
<div className="
  bg-[--bg-card]
  border border-[--border]
  rounded-2xl
  p-4
">
```
Border radius: rounded-2xl (16px) for cards, rounded-xl (12px) for
inner elements, rounded-full for badges/pills.

### Icon container
Small square with rounded-xl, bg-[--bg-card-2], housing a Lucide icon.
Icon size: 18px. Container size: 36×36px.
```tsx
<div className="w-9 h-9 rounded-xl bg-[--bg-card-2] flex items-center justify-center">
  <Icon size={18} className="text-[--text-secondary]" />
</div>
```

### Feature card (2-column grid, home page)
Icon top-left, title + subtitle bottom-left. Tap the whole card.
```tsx
<button className="
  bg-[--bg-card] border border-[--border]
  rounded-2xl p-4 text-left w-full
  flex flex-col gap-8
  active:opacity-70 transition-opacity
">
  <div className="w-9 h-9 rounded-xl bg-[--bg-card-2]
       flex items-center justify-center">
    <Icon size={18} className="text-[--text-secondary]" />
  </div>
  <div>
    <p className="text-[--text-primary] font-semibold text-sm">{title}</p>
    <p className="text-[--text-secondary] text-xs mt-0.5">{subtitle}</p>
  </div>
</button>
```

### List row (full width)
Used for settings, notification items, community links.
```tsx
<div className="
  bg-[--bg-card] border border-[--border]
  rounded-2xl px-4 py-3.5
  flex items-center justify-between gap-3
">
  <div className="flex items-center gap-3">
    <Icon size={16} className="text-[--text-secondary]" />
    <div>
      <p className="text-[--text-primary] text-sm font-medium">{label}</p>
      <p className="text-[--text-secondary] text-xs">{description}</p>
    </div>
  </div>
  {/* right side: badge, toggle, chevron, or status pill */}
</div>
```
Stack these with gap-2 (8px) between them.

### Badge / pill
Two types only:

Green (active, live, checked-in):
```tsx
<span className="
  flex items-center gap-1.5 px-2.5 py-1
  rounded-full text-xs font-medium
  bg-[--accent-bg] border border-[--accent-border]
  text-[--accent]
">
  <span className="w-1.5 h-1.5 rounded-full bg-[--accent]" />
  Checked in
</span>
```

Neutral (tags, categories, statuses):
```tsx
<span className="
  px-2.5 py-1 rounded-full text-xs font-medium
  bg-[--bg-card-2] border border-[--border]
  text-[--text-secondary]
">
  general
</span>
```

NO coloured badges other than green. Status = green or neutral only.

### Button — primary
White fill, black text. Used for the single most important action.
```tsx
<button className="
  bg-[--text-primary] text-[--bg-base]
  px-5 py-2.5 rounded-full
  text-sm font-semibold
  active:opacity-80 transition-opacity
">
  Send Spotcoin
</button>
```

### Button — secondary / ghost
Outlined, no fill.
```tsx
<button className="
  border border-[--border-mid]
  text-[--text-primary]
  px-4 py-2 rounded-full
  text-sm font-medium
  active:opacity-70 transition-opacity
">
  View all
</button>
```

### Segmented control (tabs)
Used for Solo/Buddy toggle, Sent/Received filter, etc.
```tsx
<div className="
  bg-[--bg-card] border border-[--border]
  rounded-full p-1 flex
">
  {tabs.map(tab => (
    <button key={tab} className={`
      flex-1 py-2 rounded-full text-sm font-medium transition-all
      ${active === tab
        ? 'bg-[--bg-overlay] text-[--text-primary]'
        : 'text-[--text-secondary]'}
    `}>
      {tab}
    </button>
  ))}
</div>
```

### Bottom navigation
Fixed, full width, sits on top of --bg-base with a top border.
6 items max. Active = white icon + white label. Inactive = dark grey.
```tsx
<nav className="
  fixed bottom-0 left-0 right-0
  bg-[--nav-bg] border-t border-[--nav-border]
  flex items-center justify-around
  px-2 py-3 pb-safe
">
  {items.map(item => (
    <Link key={item.href} href={item.href} className="
      flex flex-col items-center gap-1
    ">
      <item.icon size={22} className={
        pathname === item.href
          ? 'text-[--nav-active]'
          : 'text-[--nav-inactive]'
      } />
      <span className={`text-[10px] font-medium ${
        pathname === item.href
          ? 'text-[--nav-active]'
          : 'text-[--nav-inactive]'
      }`}>{item.label}</span>
    </Link>
  ))}
</nav>
```

### Page header (inner pages)
Back arrow + page title. No background — just sits on --bg-base.
```tsx
<header className="flex items-center gap-3 px-5 py-4">
  <Link href="..">
    <ChevronLeft size={20} className="text-[--text-primary]" />
  </Link>
  <h1 className="text-lg font-semibold text-[--text-primary]">{title}</h1>
</header>
```

### Top bar (home page only)
App name centered, no background, just a thin bottom border.
```tsx
<div className="
  flex items-center justify-center
  px-5 py-4
  border-b border-[--border]
">
  <span className="text-sm font-medium text-[--text-primary]">Spotcoin</span>
</div>
```

### Input / textarea
```tsx
<input className="
  w-full bg-[--bg-input] border border-[--border]
  rounded-xl px-4 py-3
  text-sm text-[--text-primary]
  placeholder:text-[--text-tertiary]
  focus:outline-none focus:border-[--border-mid]
  transition-colors
" />
```

### Amount / balance display
Large mono number for coin balances and Naira values.
```tsx
<div>
  <p className="text-xs uppercase tracking-widest text-[--text-secondary] mb-1">
    Spotcoins to give
  </p>
  <p className="text-4xl font-bold text-[--text-primary] font-mono">5</p>
  <p className="text-xs text-[--text-secondary] mt-1">Resets 1st of month</p>
</div>
```

### Recognition card (feed)
```tsx
<div className="bg-[--bg-card] border border-[--border] rounded-2xl p-4">
  <div className="flex items-start justify-between gap-3">
    <div className="flex items-center gap-2">
      <Avatar name={sender.name} size="sm" />
      <div>
        <p className="text-xs text-[--text-secondary]">
          <span className="text-[--text-primary] font-medium">{sender.name}</span>
          {' → '}
          <span className="text-[--text-primary] font-medium">{recipient.name}</span>
        </p>
        <p className="text-[10px] text-[--text-tertiary] mt-0.5">{timeAgo}</p>
      </div>
    </div>
    <div className="flex items-center gap-1.5 shrink-0">
      <span className="font-mono text-sm font-semibold text-[--text-primary]">
        🪙 {coinAmount}
      </span>
    </div>
  </div>
  <p className="text-sm text-[--text-primary] mt-3 leading-relaxed">
    "{message}"
  </p>
  <div className="mt-3">
    <span className="
      px-2 py-0.5 rounded-full text-[10px] font-medium
      bg-[--bg-card-2] border border-[--border]
      text-[--text-secondary]
    ">{value.emoji} {value.name}</span>
  </div>
</div>
```

### Progress / stat block
```tsx
<div className="bg-[--bg-card] border border-[--border] rounded-2xl p-4">
  <p className="text-[10px] uppercase tracking-widest text-[--text-secondary]">
    PROGRESS
  </p>
  <p className="text-2xl font-bold text-[--text-primary] mt-1">
    {earned} / {total} complete
  </p>
</div>
```

### Info/tip banner
Slightly lighter card, used for tips and non-critical info.
```tsx
<div className="bg-[--bg-card] border border-[--border-mid] rounded-2xl p-4">
  <p className="text-sm font-semibold text-[--text-primary]">{title}</p>
  <p className="text-sm text-[--text-secondary] mt-1">{body}</p>
</div>
```


## HOME PAGE LAYOUT (Employee Dashboard)

Translating the Cafe Cursor home page pattern to Spotcoin:

```
[Top bar: "Spotcoin" centered]
─────────────────────────────
[Location · Date meta label]
Hey [Name].
[Tagline]
[Green badge: "5 coins to give"] [Green badge if month active]

[Full-width card: Wallet snapshot
  Left: Spotcoins to give  Right: Spot-tokens earned
  ₦ projected value below]

[Info banner if needed]

[2×2 grid of feature cards]
  Feed          Recognise
  My Wallet     Leaderboard

[Bottom nav: Home / Feed / Recognise / Wallet / Admin?]
```


## ADMIN PAGES

Same dark aesthetic. Tables replaced with card-based lists.
Each user row is a list row component (full width card).
No data tables with borders — use stacked cards with dividers instead.

Stats at the top use the "stat block" pattern in a 2-column grid.
Charts (leaderboard bar chart) use only white/grey fills — no colour
charts. A bar chart uses bg-[--bg-card-2] bars with
bg-[--text-primary] for the highest bar only.


## ANIMATION RULES

Keep it subtle. This is a utility app, not a marketing site.
- Page transitions: opacity 0→1, duration 150ms, ease-out
- Card tap: active:opacity-70, transition-opacity duration-100
- Bottom nav icon tap: scale 0.9→1, duration 100ms
- Loading skeleton: animate-pulse on bg-[--bg-card-2] blocks
- Toast notifications: slide up from bottom, fade out after 3s
- NO bounce, NO spring, NO parallax, NO scroll animations


## WHAT NOT TO DO

- No white or light backgrounds anywhere
- No purple, blue, orange, or pink accent colours
- No gradient backgrounds
- No card shadows (box-shadow: none)
- No large hero images or illustrations
- No coloured icon containers (always bg-[--bg-card-2] = dark grey)
- No rounded-3xl or higher radius (max is rounded-2xl = 16px)
- No Inter, Roboto, or system-ui fonts
- No borders thicker than 1px
- No colour other than green for status indicators
- No heavy animations or transitions over 200ms
- No more than 2 font sizes on any single screen
- Never use white text on green background (unreadable)
- Never show empty states with sad illustrations — use plain text


## ICONS

Use lucide-react exclusively. Size 18px in containers, 22px in nav,
16px inline in text. Stroke width 1.5 (default). Color always
text-[--text-secondary] unless it's a nav item or CTA.


## EMPTY STATES

Plain text, centered, no illustrations:
```tsx
<div className="py-16 text-center">
  <p className="text-[--text-secondary] text-sm">
    No recognitions yet.
  </p>
  <p className="text-[--text-tertiary] text-xs mt-1">
    Be the first to recognise someone.
  </p>
</div>
```


## TAILWIND CONFIG ADDITIONS

Add to tailwind.config.ts so CSS variables work with Tailwind:
```ts
theme: {
  extend: {
    colors: {
      'bg-base':    'var(--bg-base)',
      'bg-card':    'var(--bg-card)',
      'bg-card-2':  'var(--bg-card-2)',
      'bg-input':   'var(--bg-input)',
      'bg-overlay': 'var(--bg-overlay)',
      'accent':     'var(--accent)',
      't-primary':  'var(--text-primary)',
      't-secondary':'var(--text-secondary)',
      't-tertiary': 'var(--text-tertiary)',
    },
    fontFamily: {
      sans: ['GeistSans', 'sans-serif'],
      mono: ['GeistMono', 'monospace'],
    },
    borderColor: {
      DEFAULT: 'var(--border)',
    }
  }
}
```
