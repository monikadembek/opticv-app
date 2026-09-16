# A4 CV Template Preview

## Overview

The `CvA4Preview` component renders a multi-page A4 preview of a CV, splitting the content into page-sized cards that match the PDF export layout.

## How It Works

### The core problem

A CV can be any length, but a PDF has fixed A4 pages. The component needs to figure out how many pages the CV fills and display each one as a separate white card.

### Step 1 — Measure the full CV in a hidden area

The component renders the full CV template in a hidden `div` positioned off-screen (`left: -9999px`) so the user never sees it. This gives the browser a chance to lay out the real content and report its actual pixel height (`scrollHeight`).

### Step 2 — Calculate how many pages are needed

Once the hidden render is complete (fonts loaded, layout done), the component reads `scrollHeight` and divides it by the usable content height per page (`939px`). That gives the page count — e.g. if the CV is 1878px tall, that's 2 pages.

### Step 3 — Render one card per page using a CSS "window" trick

For each page, the component renders the *full* CV again inside a box that is only `939px` tall with `overflow: hidden`. Then it uses `translateY` to scroll the content up by `939px × page index`:

- Page 1: content starts at 0px → shows the top 939px
- Page 2: content shifted up by 939px → shows the next 939px
- And so on

Each page card is exactly A4 size (794×1123px) with whitespace margins that match the PDF export margins.

### Step 4 — Spinner while measuring

A loading spinner is shown while measurement is in progress, then replaced by the page cards once done. Any time the CV data, template, or accent color changes, the measurement reruns automatically.

## Key Constants

| Constant | Value | Meaning |
|---|---|---|
| `A4_HEIGHT_PX` | 1123px | Full A4 page height |
| `PAGE_MARGIN_PX` | 32px | Page shell padding (top + bottom) |
| `CONTENT_MARGIN_PX` | 60px | Inner content padding matching PDF export margins |
| `CLIP_HEIGHT_PX` | 1059px | A4 minus page shell padding (1123 − 32×2) |
| `CONTENT_HEIGHT_PX` | 939px | Usable content per page (1059 − 60×2) |

## Relevant Files

- `apps/opticv-web/src/app/features/cv-optimization/components/cv-a4-preview/cv-a4-preview.ts`
- `apps/opticv-web/src/app/features/cv-optimization/components/cv-a4-preview/cv-a4-preview.html`
- `apps/opticv-web/src/app/features/cv-optimization/components/cv-a4-preview/cv-a4-preview.css`
