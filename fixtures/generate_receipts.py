"""
Generate realistic Indian grocery receipt images for the Carbon Receipt demo/tests.

Renders clean, receipt-style PNGs with Pillow (no external assets required — falls
back to the default bitmap font if a TTF isn't found). Each receipt has a merchant
header, a date, ~8-12 line items with qty/price, and a total.

Run:
    python fixtures/generate_receipts.py

Outputs (next to this script):
    receipt_bigbazaar.png
    receipt_dmart.png
    receipt_reliance.png
"""
from __future__ import annotations

import os
from datetime import date

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))

# ---- layout constants -------------------------------------------------------
WIDTH = 520
MARGIN = 28
LINE_H = 30
BG = (255, 255, 255)
INK = (20, 20, 20)
FAINT = (120, 120, 120)


def _load_font(size: int, bold: bool = False):
    """Try a few common Windows/Mac/Linux TTFs; fall back to default."""
    candidates = (
        ["arialbd.ttf", "Arialbd.ttf", "DejaVuSans-Bold.ttf"]
        if bold
        else ["arial.ttf", "Arial.ttf", "DejaVuSans.ttf"]
    )
    search_dirs = [
        "",
        r"C:\Windows\Fonts",
        "/usr/share/fonts/truetype/dejavu",
        "/Library/Fonts",
    ]
    for d in search_dirs:
        for name in candidates:
            try:
                return ImageFont.truetype(os.path.join(d, name) if d else name, size)
            except (OSError, IOError):
                continue
    return ImageFont.load_default()


FONT_TITLE = _load_font(30, bold=True)
FONT_SUB = _load_font(16)
FONT_BODY = _load_font(18)
FONT_BODY_B = _load_font(18, bold=True)
FONT_SMALL = _load_font(14)


def _text(draw, x, y, s, font, fill=INK, right=None):
    """Draw left- or right-aligned text. If `right` set, right-align to that x."""
    if right is not None:
        try:
            w = draw.textlength(s, font=font)
        except AttributeError:
            w = font.getsize(s)[0]
        x = right - w
    draw.text((x, y), s, font=font, fill=fill)


def render_receipt(filename, merchant, address, dt, items, gst_pct=5.0):
    """items: list of (label, qty_str, price_float)."""
    n_lines = len(items)
    height = (
        MARGIN
        + 90               # header block
        + 50               # column header + rule
        + n_lines * LINE_H
        + 40               # subtotal rule
        + 4 * LINE_H       # subtotal/gst/total/footer spacing
        + 70               # footer
    )
    img = Image.new("RGB", (WIDTH, int(height)), BG)
    d = ImageDraw.Draw(img)

    y = MARGIN
    # Header (centered merchant name)
    try:
        tw = d.textlength(merchant, font=FONT_TITLE)
    except AttributeError:
        tw = FONT_TITLE.getsize(merchant)[0]
    _text(d, (WIDTH - tw) / 2, y, merchant, FONT_TITLE)
    y += 38
    _text(d, MARGIN, y, address, FONT_SMALL, fill=FAINT)
    y += 22
    _text(d, MARGIN, y, f"Date: {dt.isoformat()}    Bill: #{abs(hash(filename)) % 90000 + 10000}", FONT_SMALL, fill=FAINT)
    y += 30

    # column header
    d.line([(MARGIN, y), (WIDTH - MARGIN, y)], fill=INK, width=2)
    y += 8
    _text(d, MARGIN, y, "ITEM", FONT_BODY_B)
    _text(d, 0, y, "QTY", FONT_BODY_B, right=WIDTH - 130)
    _text(d, 0, y, "AMOUNT", FONT_BODY_B, right=WIDTH - MARGIN)
    y += LINE_H
    d.line([(MARGIN, y - 6), (WIDTH - MARGIN, y - 6)], fill=FAINT, width=1)

    subtotal = 0.0
    for label, qty, price in items:
        subtotal += price
        _text(d, MARGIN, y, label, FONT_BODY)
        _text(d, 0, y, qty, FONT_SMALL, right=WIDTH - 130, fill=FAINT)
        _text(d, 0, y, f"{price:7.2f}", FONT_BODY, right=WIDTH - MARGIN)
        y += LINE_H

    y += 6
    d.line([(MARGIN, y), (WIDTH - MARGIN, y)], fill=INK, width=2)
    y += 12

    gst = round(subtotal * gst_pct / 100.0, 2)
    total = round(subtotal + gst, 2)
    _text(d, 0, y, "Subtotal", FONT_BODY, right=WIDTH - 120)
    _text(d, 0, y, f"{subtotal:8.2f}", FONT_BODY, right=WIDTH - MARGIN)
    y += LINE_H
    _text(d, 0, y, f"GST {gst_pct:.0f}%", FONT_BODY, right=WIDTH - 120)
    _text(d, 0, y, f"{gst:8.2f}", FONT_BODY, right=WIDTH - MARGIN)
    y += LINE_H
    _text(d, 0, y, "TOTAL (Rs.)", FONT_BODY_B, right=WIDTH - 120)
    _text(d, 0, y, f"{total:8.2f}", FONT_BODY_B, right=WIDTH - MARGIN)
    y += LINE_H + 10

    d.line([(MARGIN, y), (WIDTH - MARGIN, y)], fill=FAINT, width=1)
    y += 10
    foot = "Thank you for shopping! Items: %d" % n_lines
    try:
        fw = d.textlength(foot, font=FONT_SMALL)
    except AttributeError:
        fw = FONT_SMALL.getsize(foot)[0]
    _text(d, (WIDTH - fw) / 2, y, foot, FONT_SMALL, fill=FAINT)

    out = os.path.join(HERE, filename)
    img.save(out, "PNG")
    print(f"wrote {out}  ({total:.2f} INR, {n_lines} items)")
    return out


RECEIPTS = [
    dict(
        filename="receipt_bigbazaar.png",
        merchant="BIG BAZAAR",
        address="Inorbit Mall, Malad West, Mumbai 400064",
        dt=date(2026, 6, 7),
        items=[
            ("AMUL TONED MILK 1L", "2 PC", 116.00),
            ("AASHIRVAAD ATTA 5KG", "1 PC", 285.00),
            ("BROILER CHICKEN 1KG", "1 KG", 220.00),
            ("TATA SALT 1KG", "1 PC", 28.00),
            ("BRITANNIA BISCUITS 250G", "2 PC", 70.00),
            ("ONION 2KG", "2 KG", 64.00),
            ("POTATO 1KG", "1 KG", 30.00),
            ("FORTUNE SUNFLOWER OIL 1L", "1 PC", 155.00),
            ("AMUL BUTTER 100G", "1 PC", 56.00),
            ("TOOR DAL 1KG", "1 KG", 140.00),
        ],
    ),
    dict(
        filename="receipt_dmart.png",
        merchant="D-MART",
        address="Phoenix Marketcity, Pune 411014",
        dt=date(2026, 6, 5),
        items=[
            ("MOTHER DAIRY CURD 400G", "1 PC", 45.00),
            ("INDIA GATE BASMATI RICE 5KG", "1 PC", 540.00),
            ("FARM EGGS 12PC", "1 PACK", 84.00),
            ("AMUL PANEER 200G", "1 PC", 95.00),
            ("TOMATO 1KG", "1 KG", 40.00),
            ("BANANA 1 DOZEN", "12 PC", 60.00),
            ("MAGGI NOODLES 4PACK", "1 PACK", 56.00),
            ("SURF EXCEL DETERGENT 1KG", "1 PC", 130.00),
            ("COLGATE TOOTHPASTE 200G", "1 PC", 99.00),
        ],
    ),
    dict(
        filename="receipt_reliance.png",
        merchant="RELIANCE FRESH",
        address="MG Road, Bengaluru 560001",
        dt=date(2026, 6, 8),
        items=[
            ("NANDINI MILK 500ML", "3 PC", 75.00),
            ("MUTTON CURRY CUT 1KG", "1 KG", 780.00),
            ("AASHIRVAAD ATTA 10KG", "1 PC", 540.00),
            ("TATA TEA GOLD 500G", "1 PC", 295.00),
            ("SUGAR 1KG", "1 KG", 45.00),
            ("SPINACH BUNCH", "2 PC", 40.00),
            ("APPLE 1KG", "1 KG", 180.00),
            ("DARK CHOCOLATE 100G", "1 PC", 120.00),
        ],
    ),
]


def main():
    for r in RECEIPTS:
        render_receipt(**r)


if __name__ == "__main__":
    main()
