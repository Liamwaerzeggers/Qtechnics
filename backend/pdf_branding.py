"""
MaxQ / Q-Technics PDF branding helpers.
Shared building blocks for quote + invoice PDFs in a consistent bordeaux style
inspired by the modern minimalist quote layout (header banner, two-column info,
items table with room grouping, side-by-side totals, optional acceptance footer).
"""
from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Table, TableStyle, Paragraph, Spacer, Image as RLImage, HRFlowable,
)

# === Brand palette ===
BRAND = colors.HexColor("#500000")        # Bordeaux primary accent
BRAND_DARK = colors.HexColor("#3a0d0d")
BRAND_SOFT = colors.HexColor("#f5e6e6")   # Subtle bordeaux tint for backgrounds
INK = colors.HexColor("#1F2937")          # Primary text
INK_MUTED = colors.HexColor("#6B7280")    # Secondary text
LINE = colors.HexColor("#E5E7EB")
ROOM_FILL = colors.HexColor("#3a190b")    # Dark room band
SUBTOTAL_FILL = colors.HexColor("#FEF2F2")

# Default company info (override via env vars in deployment)
COMPANY = {
    "name": "MaxQ",
    "tagline": "Interieur · Technieken · Totaalprojecten",
    "office_label": "Kantoor",
    "office_line1": "Gerhees 118",
    "office_line2": "3945 Ham",
    "showroom_label": "Toonzaal",
    "showroom_line1": "Diamantstraat 8",
    "showroom_line2": "2200 Herentals",
    "phone": "0488 15 20 28",
    "email": "info@maxq.be",
    "vat": "BE 0XXX.XXX.XXX",
    "iban": "BE00 0000 0000 0000",
    "bank_name": "Bank",
}


def markdown_to_paragraph_html(text: str) -> str:
    """Convert lightweight markdown (** bold **, * italic *, lines starting with - or • for bullets,
    blank lines for paragraph breaks, ## for sub-headings) into ReportLab Paragraph-compatible HTML.

    Kept intentionally small: works inside a single Paragraph cell, so newlines become <br/>
    and bullets become "  •  text".

    A leading line wrapped entirely in **...** is rendered as a prominent heading
    (slightly larger, bordeaux color).
    """
    import re
    if not text:
        return ""
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    out_lines = []
    in_blank = False
    is_first_real_line = True
    for raw in text.split("\n"):
        line = raw.rstrip()
        if not line.strip():
            if not in_blank:
                out_lines.append("<br/>")
                in_blank = True
            continue
        in_blank = False
        stripped = line.strip()
        # Detect: first non-empty line wrapped entirely in **...**  → big heading
        full_bold = re.match(r"^\*\*(.+)\*\*\s*$", stripped)
        if is_first_real_line and full_bold:
            content = full_bold.group(1).strip()
            out_lines.append(f'<font size="11" color="#500000"><b>{content}</b></font>')
            is_first_real_line = False
            continue
        is_first_real_line = False
        # Sub-heading
        if stripped.startswith("## "):
            content = stripped[3:].strip()
            out_lines.append(f'<br/><font color="#500000"><b>{content}</b></font>')
            continue
        # Bullet (-, *, • at start, allowing leading whitespace)
        m = re.match(r"^\s*[-*•]\s+(.*)$", line)
        if m:
            out_lines.append(f"&nbsp;&nbsp;•&nbsp;{m.group(1).strip()}")
            continue
        out_lines.append(stripped)

    html = "<br/>".join(out_lines)
    # **bold** → <b>bold</b>  (remaining inline bolds)
    html = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", html)
    # *italic* → <i>italic</i>
    html = re.sub(r"(?<!\*)\*([^*\n]+)\*(?!\*)", r"<i>\1</i>", html)
    # Cleanup: collapse leading <br/> chains
    html = re.sub(r"^(<br/>\s*)+", "", html)
    return html


def render_description(text: str, base_style):
    """Build a single Paragraph from a markdown description (for use inside a table cell)."""
    return Paragraph(markdown_to_paragraph_html(text or ""), base_style)


def base_styles():
    """Returns a dict of named ParagraphStyles used throughout the PDF."""
    base = getSampleStyleSheet()
    return {
        "logo": ParagraphStyle(
            "Logo", parent=base["Heading1"], fontName="Helvetica-Bold",
            fontSize=24, textColor=BRAND, leading=26, spaceAfter=0,
        ),
        "tagline": ParagraphStyle(
            "Tagline", parent=base["Normal"], fontName="Helvetica",
            fontSize=8, textColor=INK_MUTED, leading=10,
        ),
        "company_meta": ParagraphStyle(
            "CompanyMeta", parent=base["Normal"], fontName="Helvetica",
            fontSize=8, textColor=INK_MUTED, leading=11,
        ),
        "doc_title": ParagraphStyle(
            "DocTitle", parent=base["Heading1"], fontName="Helvetica-Bold",
            fontSize=18, textColor=BRAND, leading=22, alignment=2,  # right
        ),
        "meta_label": ParagraphStyle(
            "MetaLabel", parent=base["Normal"], fontName="Helvetica",
            fontSize=8, textColor=INK_MUTED, leading=10, alignment=2,
        ),
        "meta_value": ParagraphStyle(
            "MetaValue", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=9, textColor=INK, leading=11, alignment=2,
        ),
        "section_label": ParagraphStyle(
            "SectionLabel", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=9, textColor=BRAND, leading=11, spaceAfter=2,
        ),
        "body": ParagraphStyle(
            "Body", parent=base["Normal"], fontName="Helvetica",
            fontSize=9.5, textColor=INK, leading=12,
        ),
        "body_muted": ParagraphStyle(
            "BodyMuted", parent=base["Normal"], fontName="Helvetica",
            fontSize=9, textColor=INK_MUTED, leading=11,
        ),
        "table_header": ParagraphStyle(
            "TblHeader", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=8.5, textColor=colors.white, leading=11,
        ),
        "table_cell": ParagraphStyle(
            "TblCell", parent=base["Normal"], fontName="Helvetica",
            fontSize=8.5, textColor=INK, leading=11,
        ),
        "room_header": ParagraphStyle(
            "RoomHeader", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=10, textColor=colors.white, leading=12,
        ),
        "subtotal_label": ParagraphStyle(
            "SubtotalLabel", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=9, textColor=BRAND_DARK, leading=11,
        ),
        "totals_label": ParagraphStyle(
            "TotalsLabel", parent=base["Normal"], fontName="Helvetica",
            fontSize=9.5, textColor=INK_MUTED, leading=12, alignment=2,
        ),
        "totals_value": ParagraphStyle(
            "TotalsValue", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=10, textColor=INK, leading=12, alignment=2,
        ),
        "totals_grand_label": ParagraphStyle(
            "GrandLabel", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=11, textColor=colors.white, leading=14, alignment=2,
        ),
        "totals_grand_value": ParagraphStyle(
            "GrandValue", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=12, textColor=colors.white, leading=14, alignment=2,
        ),
        "terms_title": ParagraphStyle(
            "TermsTitle", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=9, textColor=BRAND, leading=12, spaceAfter=4,
        ),
        "terms_body": ParagraphStyle(
            "TermsBody", parent=base["Normal"], fontName="Helvetica",
            fontSize=8, textColor=INK_MUTED, leading=11,
        ),
        "footer_caption": ParagraphStyle(
            "FooterCaption", parent=base["Normal"], fontName="Helvetica-Oblique",
            fontSize=8, textColor=INK_MUTED, leading=10, alignment=1,
        ),
    }


def build_header(styles, doc_label: str, meta_pairs: list, logo_path: Path = None) -> list:
    """Two-column header: logo + company info on left, doc title + meta on right."""
    flows = []

    # Left column — logo image OR styled text
    left_cells = []
    if logo_path and Path(logo_path).exists():
        try:
            # MaxQ logo is roughly 3:1 aspect — keep proportions, fit nicely in left column
            img = RLImage(str(logo_path), width=2.0 * inch, height=0.65 * inch, kind="proportional")
            img.hAlign = "LEFT"
            left_cells.append([img])
        except Exception:
            pass
    if not left_cells:
        left_cells.append([Paragraph(COMPANY["name"], styles["logo"])])
    left_cells.append([Paragraph(COMPANY["tagline"], styles["tagline"])])
    left_cells.append([Spacer(1, 8)])
    left_cells.append([Paragraph(
        f"<b>{COMPANY['office_label']}:</b> {COMPANY['office_line1']}, {COMPANY['office_line2']}",
        styles["company_meta"],
    )])
    left_cells.append([Paragraph(
        f"<b>{COMPANY['showroom_label']}:</b> {COMPANY['showroom_line1']}, {COMPANY['showroom_line2']}",
        styles["company_meta"],
    )])
    left_cells.append([Paragraph(f"{COMPANY['phone']} · {COMPANY['email']}", styles["company_meta"])])

    # Right column — doc title + key meta
    right_cells = [[Paragraph(doc_label, styles["doc_title"])], [Spacer(1, 8)]]
    for label, value in meta_pairs:
        meta_row = Table(
            [[Paragraph(label, styles["meta_label"]), Paragraph(value, styles["meta_value"])]],
            colWidths=[1.6 * inch, 1.4 * inch],
        )
        meta_row.setStyle(TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 1),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ]))
        right_cells.append([meta_row])

    # Compose the two columns into one outer table
    left_inner = Table(left_cells, colWidths=[3.4 * inch])
    left_inner.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    right_inner = Table(right_cells, colWidths=[3.0 * inch])
    right_inner.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))

    outer = Table([[left_inner, right_inner]], colWidths=[3.5 * inch, 3.5 * inch])
    outer.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    flows.append(outer)
    flows.append(Spacer(1, 12))
    flows.append(HRFlowable(width="100%", thickness=2, color=BRAND, spaceBefore=0, spaceAfter=0))
    flows.append(Spacer(1, 14))
    return flows


def build_info_blocks(styles, customer_lines: list, project_lines: list) -> list:
    """Two-column block: KLANT (left) + PROJECT (right)."""
    left = [
        Paragraph("KLANT", styles["section_label"]),
        Spacer(1, 2),
    ] + [Paragraph(line, styles["body"]) for line in customer_lines]

    right = [
        Paragraph("PROJECT", styles["section_label"]),
        Spacer(1, 2),
    ] + [Paragraph(line, styles["body"]) for line in project_lines]

    inner = Table([[left, right]], colWidths=[3.5 * inch, 3.5 * inch])
    inner.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return [
        inner,
        Spacer(1, 12),
        HRFlowable(width="100%", thickness=0.6, color=LINE, spaceBefore=0, spaceAfter=0),
        Spacer(1, 14),
    ]


def section_heading(styles, label: str) -> Paragraph:
    return Paragraph(label.upper(), ParagraphStyle(
        "SectionH", parent=styles["section_label"],
        fontSize=10, textColor=BRAND, leading=12, spaceAfter=6, spaceBefore=4,
    ))


def grouped_items_table(headers: list, rows: list, col_widths: list) -> Table:
    """Build the items table with bordeaux header band.

    Each `row` is a tuple: (kind, cells)
    kind ∈ {"item", "room", "subtotal", "summary", "grand"}.
    """
    data = [headers]
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), BRAND),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("ALIGN", (0, 0), (0, -1), "LEFT"),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("FONTSIZE", (0, 1), (-1, -1), 8.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LINEBELOW", (0, 0), (-1, 0), 0.6, BRAND),
        ("LINEBELOW", (0, "*"), (-1, "*"), 0.4, LINE),  # placeholder, applied per row below
    ]
    # Remove placeholder; we'll add per-row dividers explicitly
    style = style[:-1]

    row_idx = 1
    for kind, cells in rows:
        data.append(cells)
        if kind == "room":
            style += [
                ("SPAN", (0, row_idx), (-1, row_idx)),
                ("BACKGROUND", (0, row_idx), (-1, row_idx), ROOM_FILL),
                ("TEXTCOLOR", (0, row_idx), (-1, row_idx), colors.white),
                ("FONTNAME", (0, row_idx), (-1, row_idx), "Helvetica-Bold"),
                ("LEFTPADDING", (0, row_idx), (-1, row_idx), 10),
                ("TOPPADDING", (0, row_idx), (-1, row_idx), 6),
                ("BOTTOMPADDING", (0, row_idx), (-1, row_idx), 6),
            ]
        elif kind == "subtotal":
            style += [
                ("BACKGROUND", (0, row_idx), (-1, row_idx), SUBTOTAL_FILL),
                ("FONTNAME", (0, row_idx), (-1, row_idx), "Helvetica-Bold"),
                ("TEXTCOLOR", (0, row_idx), (-1, row_idx), BRAND_DARK),
                ("LINEABOVE", (0, row_idx), (-1, row_idx), 0.4, LINE),
                ("LINEBELOW", (0, row_idx), (-1, row_idx), 0.4, LINE),
            ]
        elif kind == "summary":
            style += [
                ("BACKGROUND", (0, row_idx), (-1, row_idx), BRAND_SOFT),
                ("FONTNAME", (0, row_idx), (-1, row_idx), "Helvetica-Bold"),
                ("TEXTCOLOR", (0, row_idx), (-1, row_idx), BRAND_DARK),
            ]
        elif kind == "grand":
            style += [
                ("BACKGROUND", (0, row_idx), (-1, row_idx), BRAND),
                ("FONTNAME", (0, row_idx), (-1, row_idx), "Helvetica-Bold"),
                ("TEXTCOLOR", (0, row_idx), (-1, row_idx), colors.white),
            ]
        else:
            # Regular item — light divider below
            style += [
                ("LINEBELOW", (0, row_idx), (-1, row_idx), 0.3, LINE),
            ]
        row_idx += 1

    table = Table(data, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle(style))
    return table


def build_totals_box(styles, lines: list, grand_label: str, grand_value: str) -> Table:
    """Right-aligned totals box: label + value pairs ending with a bordeaux grand-total band."""
    rows = []
    for label, value in lines:
        rows.append([
            Paragraph(label, styles["totals_label"]),
            Paragraph(value, styles["totals_value"]),
        ])
    # Grand total (bordeaux band)
    rows.append([
        Paragraph(grand_label, styles["totals_grand_label"]),
        Paragraph(grand_value, styles["totals_grand_value"]),
    ])

    t = Table(rows, colWidths=[1.7 * inch, 1.4 * inch])
    t.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LINEBELOW", (0, 0), (-1, -2), 0.3, LINE),
        ("BACKGROUND", (0, -1), (-1, -1), BRAND),
        ("TOPPADDING", (0, -1), (-1, -1), 9),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 9),
    ]))
    return t


def build_terms_and_totals(styles, terms_items: list, totals_table: Table) -> Table:
    """Left = bullet terms, right = totals_table."""
    if terms_items:
        bullets = "<br/>".join(f"• {t}" for t in terms_items)
    else:
        bullets = ""
    left_cells = [
        Paragraph("VOORWAARDEN", styles["terms_title"]),
        Paragraph(bullets, styles["terms_body"]) if bullets else Spacer(1, 1),
    ]
    outer = Table(
        [[left_cells, totals_table]],
        colWidths=[3.6 * inch, 3.4 * inch],
    )
    outer.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return outer


def build_signature_footer(styles) -> list:
    """Acceptance footer with two signature lines for quotes."""
    line = HRFlowable(width="100%", thickness=0.5, color=INK)
    sig_block = Table(
        [
            [Spacer(1, 28), Spacer(1, 28)],
            [line, line],
            [
                Paragraph("Naam &amp; handtekening klant", styles["footer_caption"]),
                Paragraph("Datum", styles["footer_caption"]),
            ],
        ],
        colWidths=[3.4 * inch, 3.4 * inch],
    )
    sig_block.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 16),
    ]))
    return [
        Spacer(1, 18),
        HRFlowable(width="100%", thickness=2, color=BRAND, spaceBefore=0, spaceAfter=10),
        Paragraph(
            "Door dit document te ondertekenen bevestigt de klant akkoord te gaan met de offerte en de bijhorende voorwaarden.",
            styles["footer_caption"],
        ),
        Spacer(1, 14),
        sig_block,
    ]


def build_payment_footer(styles, total_incl: float, due_days: int, ogm: str = None) -> list:
    """Payment instructions block for invoices."""
    lines = [
        Paragraph(
            f"Gelieve het bedrag van <b>€{total_incl:,.2f}</b> over te maken binnen <b>{due_days} dagen</b>.".replace(",", " "),
            styles["body"],
        ),
        Spacer(1, 6),
        Paragraph(f"<b>IBAN:</b> {COMPANY['iban']} ({COMPANY['bank_name']})", styles["body"]),
    ]
    if ogm:
        lines += [
            Spacer(1, 4),
            Paragraph(f"<b>Gestructureerde mededeling:</b> {ogm}", styles["body"]),
        ]
    lines += [
        Spacer(1, 8),
        Paragraph(f"BTW: {COMPANY['vat']}", styles["body_muted"]),
    ]
    return [
        Spacer(1, 14),
        HRFlowable(width="100%", thickness=2, color=BRAND, spaceBefore=0, spaceAfter=10),
        Paragraph("BETALINGSINFORMATIE", styles["section_label"]),
        Spacer(1, 4),
    ] + lines
