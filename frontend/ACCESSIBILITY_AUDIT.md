# Accessibility Audit (Page-wise)

Date: 2026-04-01
Scope: Accessibility only.

## About Page (/about)

### Contrast issues fixed
- Issue: Low contrast in founder text areas.
- Updates:
  - `p.founder-title` color changed from `#667eea` to `#1e3a8a`.
  - `.about-main-subtitle` color changed from `#64748b` to `#334155`.
  - `.founder-description p` color changed from `#4a5568` to `#334155`.
- File:
  - `src/pages/About/About.css`

### Heading hierarchy fixed
- Issue: Heading order skipped from `h1` to `h3`.
- Update:
  - Founder name heading changed from `h3` to `h2`.
- File:
  - `src/pages/About/About.jsx`

## Shared Components Used On About Page

### Navbar button contrast fixed
- Issue: Lighthouse flagged low contrast on `a.btn.btn-secondary` and `a.btn.btn-primary`.
- Updates:
  - `.btn-primary` darkened to `linear-gradient(45deg, #1e40af, #1e3a8a)`.
  - `.btn-secondary` set to white background with darker text (`#1f2937`) and stronger border (`#cbd5e1`).
- File:
  - `src/components/Navbar/Navbar.css`

### Redundant image alternative text fixed
- Issue: Brand logo image alt text duplicated adjacent visible text.
- Updates:
  - Navbar logo image set to `alt=""` with `aria-hidden="true"`.
  - Footer logo image set to `alt=""` with `aria-hidden="true"`.
- Files:
  - `src/components/Navbar/Navbar.jsx`
  - `src/components/Footer/Footer.jsx`

### Keyboard navigation order fix for external widget
- Issue: External accessibility widget controls had positive `tabindex` values.
- Updates:
  - Added runtime normalization that converts known widget control `tabindex` values greater than `0` to `0`.
  - Added `MutationObserver` to keep values normalized when widget DOM updates.
- File:
  - `src/App.jsx`

## Subscribe Page (/subscribe)

### Contrast issues fixed
- Issue: Low contrast reported for `a.free-button`.
- Update:
  - `.free-button` text color changed from `#667eea` to `#1e3a8a`.
- File:
  - `src/pages/Subscribe/Subscribe.css`

### List structure fixed in mobile navigation
- Issue: Lighthouse reported `ul.nav-menu` containing non-`li` direct child (`button.menu-close-btn`).
- Updates:
  - Wrapped close button inside `<li className="menu-close-item">`.
  - Added accessible label: `aria-label="Close navigation menu"`.
  - Added `.menu-close-item` style reset to preserve layout.
- Files:
  - `src/components/Navbar/Navbar.jsx`
  - `src/components/Navbar/Navbar.css`

### Link purpose clarity improved
- Issue: Multiple identical action texts can reduce clarity in screen reader link lists.
- Updates:
  - Replaced generic plan link text with plan-specific labels:
    - Momentum Rider
    - Strategic Alpha
    - Levered Risk FnO
    - IK15 Momentum Buys
- File:
  - `src/pages/Subscribe/Subscribe.jsx`

## Contact Page (/contact)

### Contrast issues fixed
- Issue: Lighthouse reported low contrast in registration banner content, contact card links, WhatsApp link, and office hours time text.
- Updates:
  - `.contact-main-subtitle` changed to `#334155`.
  - `.registration-info p` now uses near-white chip background with dark text (`#0f172a`).
  - `.contact-tagline` set to solid light text color for stable contrast.
  - `.contact-info-text` changed to `#334155`.
  - `.contact-info-text a` changed to `#1e3a8a` (hover `#1e40af`).
  - `.whatsapp-link` changed to darker green `#0f8a42`.
  - `.time` changed to `#1e40af`.
  - `.appointment-info p` changed to `#334155`.
- File:
  - `src/pages/Contact/Contact.css`

### Shared navbar CTA contrast hardening
- Issue: Desktop run still flagged `a.btn.btn-secondary` and `a.btn.btn-primary` on this route.
- Updates:
  - `.btn-primary` moved to darker blue gradient.
  - `.btn-secondary` moved to lighter background with darker text and stronger border.
- File:
  - `src/components/Navbar/Navbar.css`

### Identical link purpose improvement
- Issue: Same visible phone number appeared in two links (WhatsApp and tel), which can be ambiguous in assistive link lists.
- Updates:
  - Added explicit purpose labels:
    - WhatsApp link: `aria-label="Chat on WhatsApp at +91-8076283540"`
    - Phone link: `aria-label="Call +91-8076283540"`
- File:
  - `src/pages/Contact/Contact.jsx`

## Validation Checklist
- [ ] Re-run Lighthouse Accessibility on `/about`.
- [ ] Re-run Lighthouse Accessibility on `/subscribe` (mobile and desktop).
- [ ] Re-run Lighthouse Accessibility on `/contact` (mobile and desktop).
- [ ] Confirm no widget controls have `tabindex` greater than `0`.
- [ ] Verify heading order in DOM: `h1` then `h2`.
- [ ] Re-check these selectors in Lighthouse:
  - `a.btn.btn-secondary`
  - `a.btn.btn-primary`
  - `p.founder-title`
  - `div.founder-content`
  - `a.free-button`
  - `ul.nav-menu`
  - `button.menu-close-btn`
  - `a.whatsapp-link`
  - `div.registration-info`
  - `div.time`
