from pathlib import Path

from PIL import Image
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_AUTO_SHAPE_TYPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Inches, Pt


ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / "assets"
OUT = ROOT / "MediMatch_Conference_Deck.pptx"

W = Inches(13.333)
H = Inches(7.5)

BG = RGBColor(7, 12, 24)
PANEL = RGBColor(18, 29, 49)
PANEL_2 = RGBColor(26, 38, 59)
CREAM = RGBColor(248, 243, 231)
MUTED = RGBColor(174, 186, 204)
GOLD = RGBColor(246, 190, 76)
ORANGE = RGBColor(255, 119, 68)
MINT = RGBColor(67, 213, 174)
RED = RGBColor(255, 91, 102)
BLUE = RGBColor(82, 155, 255)

FONT = "Noto Sans"


def rect(slide, x, y, w, h, fill, radius=True, line=None, transparency=0):
    kind = MSO_AUTO_SHAPE_TYPE.ROUNDED_RECTANGLE if radius else MSO_AUTO_SHAPE_TYPE.RECTANGLE
    shape = slide.shapes.add_shape(kind, x, y, w, h)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill
    shape.fill.transparency = transparency
    shape.line.color.rgb = line or fill
    return shape


def textbox(slide, text, x, y, w, h, size=18, color=CREAM, bold=False,
            align=PP_ALIGN.LEFT, valign=MSO_ANCHOR.TOP, margin=0,
            font=FONT, line_spacing=1.0):
    box = slide.shapes.add_textbox(x, y, w, h)
    tf = box.text_frame
    tf.clear()
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = margin
    tf.vertical_anchor = valign
    p = tf.paragraphs[0]
    p.alignment = align
    p.line_spacing = line_spacing
    r = p.add_run()
    r.text = text
    r.font.name = font
    r.font.size = Pt(size)
    r.font.bold = bold
    r.font.color.rgb = color
    return box


def rich_text(slide, runs, x, y, w, h, size=18, align=PP_ALIGN.LEFT,
              valign=MSO_ANCHOR.TOP, margin=0):
    box = slide.shapes.add_textbox(x, y, w, h)
    tf = box.text_frame
    tf.clear()
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = margin
    tf.vertical_anchor = valign
    p = tf.paragraphs[0]
    p.alignment = align
    for text, color, bold, run_size in runs:
        r = p.add_run()
        r.text = text
        r.font.name = FONT
        r.font.size = Pt(run_size or size)
        r.font.bold = bold
        r.font.color.rgb = color
    return box


def bullet_list(slide, items, x, y, w, h, size=17, color=MUTED, accent=MINT,
                gap=7, bullet="•"):
    box = slide.shapes.add_textbox(x, y, w, h)
    tf = box.text_frame
    tf.clear()
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    for i, item in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = f"{bullet}  {item}"
        p.font.name = FONT
        p.font.size = Pt(size)
        p.font.color.rgb = color
        p.space_after = Pt(gap)
        p.line_spacing = 1.08
    return box


def add_cover_image(slide, path, x, y, w, h):
    with Image.open(path) as img:
        iw, ih = img.size
    target = w / h
    source = iw / ih
    pic = slide.shapes.add_picture(str(path), x, y, width=w, height=h)
    if source > target:
        visible = target / source
        crop = (1 - visible) / 2
        pic.crop_left = crop
        pic.crop_right = crop
    elif source < target:
        visible = source / target
        crop = (1 - visible) / 2
        pic.crop_top = crop
        pic.crop_bottom = crop
    return pic


def add_contain_image(slide, path, x, y, w, h):
    with Image.open(path) as img:
        iw, ih = img.size
    scale = min(w / iw, h / ih)
    pw, ph = int(iw * scale), int(ih * scale)
    return slide.shapes.add_picture(str(path), x + (w - pw) / 2, y + (h - ph) / 2,
                                    width=pw, height=ph)


def bg(slide):
    rect(slide, 0, 0, W, H, BG, radius=False)


def kicker(slide, text, x=Inches(.55), y=Inches(.35), color=GOLD):
    textbox(slide, text.upper(), x, y, Inches(7.0), Inches(.28), 10, color, True)


def title(slide, text, y=Inches(.67), size=30, color=CREAM):
    textbox(slide, text, Inches(.55), y, Inches(12.2), Inches(.65), size, color, True)


def footer(slide, n, source=None):
    textbox(slide, f"MEDIMATCH  /  {n:02d}", Inches(.55), Inches(7.13), Inches(2.0), Inches(.18), 8, MUTED, True)
    if source:
        textbox(slide, source, Inches(2.6), Inches(7.08), Inches(10.15), Inches(.28), 7.5, MUTED, False, PP_ALIGN.RIGHT)


def metric(slide, value, label, x, y, w, color=GOLD):
    rect(slide, x, y, w, Inches(1.1), PANEL, True, PANEL_2)
    textbox(slide, value, x + Inches(.18), y + Inches(.12), w - Inches(.36), Inches(.48), 25, color, True)
    textbox(slide, label, x + Inches(.18), y + Inches(.68), w - Inches(.36), Inches(.25), 10, MUTED, False)


prs = Presentation()
prs.slide_width = W
prs.slide_height = H
blank = prs.slide_layouts[6]


# 1 — Opening
s = prs.slides.add_slide(blank)
add_cover_image(s, ASSETS / "title.png", 0, 0, W, H)
rect(s, 0, 0, W, H, BG, radius=False, transparency=72)
rect(s, Inches(.58), Inches(.65), Inches(8.2), Inches(5.7), BG, True, BG, transparency=18)
textbox(s, "MEDIMATCH  ·  NATIONAL REDISTRIBUTION COMMAND", Inches(.86), Inches(1.0), Inches(7.5), Inches(.3), 11, GOLD, True)
rich_text(s, [
    ("See surplus.\nDetect need.\n", CREAM, True, 38),
    ("Coordinate impact.", MINT, True, 38),
], Inches(.84), Inches(1.48), Inches(7.65), Inches(2.45), 38)
textbox(s, "Leveraging geospatial intelligence\nfor equitable medical-supply redistribution", Inches(.88), Inches(4.08), Inches(6.9), Inches(.9), 18, MUTED)
rect(s, Inches(.88), Inches(5.18), Inches(5.7), Inches(.03), GOLD, radius=False)
textbox(s, "Lesnar Gitonga  ·  USIU–Africa  ·  23 June 2026", Inches(.88), Inches(5.43), Inches(6.6), Inches(.32), 12, CREAM, True)
textbox(s, "Conference demo · synthetic inventory · no patient records", Inches(.88), Inches(5.85), Inches(6.8), Inches(.28), 10, MUTED)


# 2 — Problem and evidence
s = prs.slides.add_slide(blank); bg(s)
kicker(s, "01  /  The coordination gap")
textbox(s, "The problem is not only scarcity.\nIt is disconnected visibility.", Inches(.55), Inches(.67), Inches(12.2), Inches(.9), 26, CREAM, True)
textbox(s, "Facilities can hold usable surplus while others face urgent shortfalls. MediMatch makes both sides visible in one operating picture.", Inches(.58), Inches(1.62), Inches(12.0), Inches(.4), 14, MUTED)
metric(s, "56.3%", "face weekly or monthly stockouts", Inches(.58), Inches(2.25), Inches(2.85), ORANGE)
metric(s, "82.8%", "rate manual methods ineffective or slow", Inches(3.56), Inches(2.25), Inches(2.85), GOLD)
metric(s, "57.8%", "report wastage of valid supplies", Inches(6.54), Inches(2.25), Inches(2.85), RED)
metric(s, "89.1%", "willing to pilot the system", Inches(9.52), Inches(2.25), Inches(2.85), MINT)
rect(s, Inches(.58), Inches(3.72), Inches(12.0), Inches(2.25), PANEL, True, PANEL_2)
textbox(s, "A supply gap becomes\na coordination question", Inches(.88), Inches(4.0), Inches(5.3), Inches(.72), 19, CREAM, True)
textbox(s, "Which available source is close enough, sufficiently stocked, verified, product-compatible—and practical to move now?", Inches(.88), Inches(4.82), Inches(5.25), Inches(.78), 15, MUTED)
rect(s, Inches(6.65), Inches(4.08), Inches(.04), Inches(1.35), GOLD, radius=False)
textbox(s, "57%", Inches(7.02), Inches(4.02), Inches(1.65), Inches(.62), 34, GOLD, True)
textbox(s, "KEMSA national order-fill rate,\nas of mid-2025 (per the abstract)", Inches(8.35), Inches(4.13), Inches(3.55), Inches(.65), 13, MUTED)
textbox(s, "The baseline is historical; the deck does not present it as the current 2026 rate.", Inches(7.02), Inches(5.08), Inches(4.8), Inches(.45), 10, MUTED)
footer(s, 2, "Sources: MediMatch Nairobi County field study (n=64 healthcare professionals, 80% response, 2025); KEMSA order-fill rate 57%, mid-2025")


# 3 — The field evidence (survey response data)
s = prs.slides.add_slide(blank); bg(s)
kicker(s, "02  /  The field evidence")
title(s, "We asked the people who run the supply rooms", size=28)
textbox(s, "64 healthcare professionals across Nairobi County   ·   80% response rate   ·   2025 field study",
        Inches(.58), Inches(1.32), Inches(12.0), Inches(.35), 14, GOLD, True)

findings = [
    ("56.3%", "experience stockouts of essential items on a weekly or monthly basis", ORANGE),
    ("82.8%", "rate current manual, ad-hoc redistribution as “ineffective” or “slow”", GOLD),
    ("57.8%", "identify the wastage of valid medical supplies as a primary operational challenge", RED),
    ("89.1%", "are willing to pilot the MediMatch platform", MINT),
]
for i, (v, t, c) in enumerate(findings):
    yy = 1.95 + i * 1.02
    rect(s, Inches(.58), Inches(yy), Inches(12.0), Inches(.9), PANEL, True, PANEL_2)
    rect(s, Inches(.58), Inches(yy), Inches(.08), Inches(.9), c, False)
    textbox(s, v, Inches(.82), Inches(yy + .15), Inches(2.05), Inches(.62), 30, c, True)
    textbox(s, t, Inches(3.0), Inches(yy), Inches(9.4), Inches(.9), 15, CREAM, False, PP_ALIGN.LEFT, MSO_ANCHOR.MIDDLE)

yy = 1.95 + 4 * 1.02 + .04
rect(s, Inches(.58), Inches(yy), Inches(12.0), Inches(.6), PANEL_2, True, PANEL_2)
textbox(s, "Respondents span clinical staff (nurses & pharmacists), facility administrators, and pharmacy/inventory & technical personnel — a predominantly young, digitally-literate workforce.",
        Inches(.85), Inches(yy + .13), Inches(11.5), Inches(.4), 11.5, MUTED, False)
footer(s, 3, "MediMatch Nairobi County field study · 64 healthcare professionals · 80% response rate (2025) · figures per the published GPH2026 abstract")


# 4 — National operating picture
s = prs.slides.add_slide(blank); bg(s)
kicker(s, "03  /  National command floor")
title(s, "From isolated reports to one national operating picture")
add_cover_image(s, ASSETS / "demand-signal.png", Inches(.55), Inches(1.45), Inches(12.23), Inches(5.35))
rect(s, Inches(.68), Inches(5.77), Inches(11.95), Inches(.78), BG, True, BG, transparency=8)
rich_text(s, [
    ("DETECT", ORANGE, True, 11), ("  →  ", MUTED, True, 11),
    ("RANK", GOLD, True, 11), ("  →  ", MUTED, True, 11),
    ("ROUTE", MINT, True, 11), ("  →  ", MUTED, True, 11),
    ("VERIFY", CREAM, True, 11),
], Inches(.95), Inches(5.99), Inches(5.6), Inches(.25), 11)
textbox(s, "Real Kenyan facility geocodes · road-routed flows · live operational brief", Inches(6.3), Inches(5.95), Inches(5.8), Inches(.33), 10, MUTED, False, PP_ALIGN.RIGHT)
footer(s, 4, "Current app: Savannah Command · MapLibre + CARTO + OSRM")


# 4 — Heatmap
s = prs.slides.add_slide(blank); bg(s)
kicker(s, "04  /  Geospatial triage")
title(s, "See demand concentration before routing", size=29)
add_cover_image(s, ASSETS / "heatmap.png", Inches(4.5), Inches(1.45), Inches(8.28), Inches(5.55))
rect(s, Inches(.58), Inches(1.55), Inches(3.55), Inches(5.12), PANEL, True, PANEL_2)
textbox(s, "What geography adds", Inches(.88), Inches(1.88), Inches(2.95), Inches(.38), 21, CREAM, True)
bullet_list(s, [
    "Reveal where shortfall clusters—not just where the loudest request originated.",
    "Compare demand against available hubs and connected road corridors.",
    "Use distance as one signal alongside urgency, product fit and verification.",
    "Move from ‘nearest’ to ‘best feasible match’."
], Inches(.86), Inches(2.5), Inches(3.02), Inches(3.2), 13, MUTED, GOLD, 10)
textbox(s, "Geography supports triage; it does not authorize a transfer.", Inches(.88), Inches(5.95), Inches(2.92), Inches(.48), 11, GOLD, True)
footer(s, 5, "Demand heatmap shown from the live build")


# 5 — Nairobi research base
s = prs.slides.add_slide(blank); bg(s)
kicker(s, "05  /  Research base")
title(s, "Nairobi turns the national concept into a street-scale workflow")
add_cover_image(s, ASSETS / "nairobi-research.png", Inches(.55), Inches(1.43), Inches(12.23), Inches(5.62))
rect(s, Inches(.78), Inches(6.22), Inches(11.8), Inches(.58), BG, True, BG, transparency=8)
textbox(s, "50 facilities  ·  43 in shortfall  ·  43 transfers  ·  2,236 units moved", Inches(1.0), Inches(6.37), Inches(11.2), Inches(.25), 12, CREAM, True, PP_ALIGN.CENTER)
footer(s, 6, "Nairobi County research view · demonstration inventory")


# 6 — Explainable matching
s = prs.slides.add_slide(blank); bg(s)
kicker(s, "06  /  Explainable matching")
title(s, "The system shows why a source was selected")
add_cover_image(s, ASSETS / "selected-route.png", Inches(4.7), Inches(1.43), Inches(8.08), Inches(5.65))
rect(s, Inches(.58), Inches(1.55), Inches(3.72), Inches(5.1), PANEL, True, PANEL_2)
textbox(s, "Decision signals", Inches(.9), Inches(1.88), Inches(3.1), Inches(.38), 21, CREAM, True)
for i, (name, desc, c) in enumerate([
    ("Proximity", "direct and routed distance", MINT),
    ("Urgency", "clinical supply priority", RED),
    ("Product fit", "category and cold-chain needs", GOLD),
    ("Quantity", "full or partial coverage", BLUE),
    ("Verification", "trusted source and ownership", ORANGE),
]):
    yy = 2.48 + i * .64
    rect(s, Inches(.9), Inches(yy), Inches(.09), Inches(.36), c, False)
    textbox(s, name, Inches(1.18), Inches(yy-.02), Inches(1.1), Inches(.25), 12, CREAM, True)
    textbox(s, desc, Inches(2.25), Inches(yy-.02), Inches(1.62), Inches(.3), 10, MUTED)
textbox(s, "Curated situation briefs explain the route in plain operational language.", Inches(.9), Inches(5.88), Inches(3.1), Inches(.55), 11, GOLD, True)
footer(s, 7, "Briefs use a deterministic fallback for demo reliability; Claude is optional")


# 7 — Projection
s = prs.slides.add_slide(blank); bg(s)
kicker(s, "07  /  Impact projection")
title(s, "What the current throughput could unlock over one year")
add_contain_image(s, ASSETS / "impact-projection.png", Inches(.55), Inches(1.38), Inches(12.23), Inches(5.72))
rect(s, Inches(.7), Inches(6.55), Inches(11.93), Inches(.38), BG, True, BG, transparency=5)
textbox(s, "MODEL — NOT A GUARANTEE. Weekly cycles, 42% near-expiry recovery, coverage saturates as facilities onboard.", Inches(.9), Inches(6.65), Inches(11.5), Inches(.18), 8.5, GOLD, True, PP_ALIGN.CENTER)
footer(s, 8, "Projection baseline: KEMSA 57% order-fill rate (mid-2025) + MediMatch field study (n=64)")


# 8 — Copilot
s = prs.slides.add_slide(blank); bg(s)
kicker(s, "08  /  Live coordination intelligence")
title(s, "Copilot answers from the current operational state")
add_cover_image(s, ASSETS / "copilot.png", Inches(5.1), Inches(1.43), Inches(7.68), Inches(5.62))
rect(s, Inches(.58), Inches(1.55), Inches(4.12), Inches(5.12), PANEL, True, PANEL_2)
textbox(s, "Ask operational questions", Inches(.9), Inches(1.88), Inches(3.45), Inches(.38), 21, CREAM, True)
bullet_list(s, [
    "Which facilities need urgent approval?",
    "What is in transit right now?",
    "Where are the shortfalls in Mandera?",
    "Who has surplus oxygen?",
    "Summarise the national situation."
], Inches(.9), Inches(2.5), Inches(3.4), Inches(2.7), 15, CREAM, GOLD, 10, "→")
textbox(s, "Presentation-safe mode is grounded in live plan data and works without an API key. An Anthropic key can enable Claude-written briefs.", Inches(.9), Inches(5.48), Inches(3.35), Inches(.75), 11, MUTED)
footer(s, 9, "Copilot is advisory; coordinator verification remains mandatory")


# 9 — Architecture
s = prs.slides.add_slide(blank); bg(s)
kicker(s, "09  /  Architecture and safeguards")
textbox(s, "A production-minded spatial stack\nwith a human decision boundary", Inches(.55), Inches(.66), Inches(12.2), Inches(1.05), 27, CREAM, True, PP_ALIGN.CENTER)

boxes = [
    ("Experience", "React · TypeScript\nMapLibre · three.js", Inches(.6), BLUE),
    ("Coordination API", "Node.js · Express\nmatching · auth · messages", Inches(3.72), ORANGE),
    ("Spatial + routing", "PostgreSQL · PostGIS\nOSRM · Nominatim · CARTO", Inches(6.84), MINT),
    ("Intelligence", "Curated fallback\noptional Claude briefs", Inches(9.96), GOLD),
]
for i, (head, body, xx, c) in enumerate(boxes):
    rect(s, xx, Inches(2.0), Inches(2.75), Inches(2.15), PANEL, True, c)
    rect(s, xx, Inches(2.0), Inches(2.75), Inches(.08), c, False)
    textbox(s, head, xx + Inches(.22), Inches(2.38), Inches(2.3), Inches(.34), 17, CREAM, True, PP_ALIGN.CENTER)
    textbox(s, body, xx + Inches(.22), Inches(2.98), Inches(2.3), Inches(.65), 12, MUTED, False, PP_ALIGN.CENTER)
    if i < len(boxes)-1:
        textbox(s, "→", xx + Inches(2.79), Inches(2.75), Inches(.3), Inches(.5), 22, GOLD, True, PP_ALIGN.CENTER)

rect(s, Inches(.6), Inches(4.65), Inches(12.1), Inches(1.4), PANEL, True, PANEL_2)
textbox(s, "Human verification is the final control", Inches(.9), Inches(4.9), Inches(11.5), Inches(.36), 20, CREAM, True, PP_ALIGN.CENTER)
textbox(s, "No diagnosis · no autonomous transfers · synthetic demo inventory · explicit assumptions · coordinator sign-off", Inches(.9), Inches(5.38), Inches(11.5), Inches(.32), 12, MUTED, False, PP_ALIGN.CENTER)
rect(s, Inches(.9), Inches(5.66), Inches(11.3), Inches(.04), GOLD, False)
footer(s, 10, "Production data layer: PostgreSQL 15 + PostGIS 3 · demo mode: in-memory mock DB")


# 10 — Close and live demo
s = prs.slides.add_slide(blank); bg(s)
kicker(s, "10  /  Closing")
rich_text(s, [
    ("Location is not just a field.\n", CREAM, True, 35),
    ("It is a coordination advantage.", MINT, True, 35),
], Inches(.6), Inches(1.05), Inches(8.0), Inches(1.55), 35)
textbox(s, "The live demo", Inches(.65), Inches(3.0), Inches(2.2), Inches(.4), 21, GOLD, True)
steps = [
    "01   Globe intro → Kenya command floor",
    "02   Toggle the demand heatmap",
    "03   Open the Nairobi research base",
    "04   Project impact over one year",
    "05   Ask Copilot for urgent approvals",
]
bullet_list(s, steps, Inches(.68), Inches(3.55), Inches(5.0), Inches(2.4), 16, CREAM, GOLD, 9, "")
rect(s, Inches(7.1), Inches(2.75), Inches(5.45), Inches(3.0), PANEL, True, GOLD)
textbox(s, "MEDIMATCH", Inches(7.55), Inches(3.22), Inches(4.5), Inches(.45), 27, CREAM, True, PP_ALIGN.CENTER)
textbox(s, "See surplus. Detect need.\nCoordinate impact.", Inches(7.55), Inches(3.95), Inches(4.5), Inches(.9), 20, GOLD, True, PP_ALIGN.CENTER)
textbox(s, "Questions?", Inches(7.55), Inches(5.05), Inches(4.5), Inches(.4), 18, MUTED, False, PP_ALIGN.CENTER)
footer(s, 11, "Live build: main@d7be7d4 · /home/lesnar/publish-stage/MediMatch")


prs.core_properties.title = "MediMatch — Geospatial Intelligence for Medical-Supply Redistribution"
prs.core_properties.subject = "Conference presentation"
prs.core_properties.author = "Lesnar Gitonga"
prs.core_properties.keywords = "MediMatch, geospatial, PostGIS, public health, Kenya, medical supplies"
prs.save(OUT)
print(OUT)
