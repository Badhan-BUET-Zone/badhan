#!/usr/bin/env python3
"""Turn the supplied Illustrator SVG into a fixed background: no sample data, and type that
renders the way the designer's PDF does.

Baked twice, from this one artwork, into the two backgrounds the renderer chooses between — see
--without-signature-block below.

Both halves matter. The supplied artwork has sample values typed into it, and it also has three
export defects that make it render unlike the PDF exported from the same document — the defects
being, between them, the whole of the "the font style doesn't match" report this work started from.
Each is fixed here rather than by hand-editing 4 MB of Illustrator output, so re-exporting the
artwork does not mean re-doing the fixes.

REMOVED — the per-donor values, drawn live by the render pipeline instead:

  * Every <text> in GreatVibes (class st12). The designer used that script face for exactly the six
    blanks and nothing else, checked against the file, so the face identifies them without pinning
    down coordinates that a re-export would move.
  * The QR placeholder: the grey "QR Code" label and the rounded box (class st31) around it.

The ruled blanks stay. They are printed form, not data — the values are written onto them.

REMOVED ONLY WITH --without-signature-block — the three signature lines at the foot of the page,
for the background served to someone who is not signed in:

  * Every <text> carrying class st21, the 12 pt italic the signature block is set in. Note st21 is
    on the child <tspan>s rather than on the <text> tag, which classes_of() handles because it
    matches the first class attribute anywhere in the element — the same reason it finds st12.
    Each of the three elements holds its ruled line and its caption together, so one removal takes
    both; the third also holds the "____ Unit" blank, which is why the renderer must not draw UNIT
    onto this background.

A verifier who scanned a printed certificate is holding the signed paper already. Showing them a
fresh copy with three empty signature lines invites exactly the comparison that should never have
to be made, so the block is not on the background they are served.

FIXED — three things Illustrator's SVG exporter got wrong, all confirmed against the PDF:

  1. Four text classes carry a font-size and no font-family, so they fell back to whatever the
     viewer happened to default to. The PDF shows what they were drawn in: Playfair Display, roman
     for the heading and the organisation line, italic for the body and the signature block.
  2. The Bangla slogans exported as unshaped garbage — 'এককর রক অননর জজবন' where the document says
     'একের রক্ত অন্যের জীবন'. Every vowel sign and conjunct was dropped on the way out, so the text
     is not recoverable from the file; it is restored from the PDF, which renders correctly.
  3. The page keeps the artwork's own 841.89 x 595.28 pt viewBox — A4 landscape at trim. The PDF is
     bigger only because it carries a 3 mm print bleed, which a screen-and-download certificate has
     no use for.
"""

import re
import sys

VALUE_FONT_CLASS = 'st12'
EXPECTED_VALUE_FIELDS = 6
QR_LABEL_TEXT = 'QR Code'
QR_BOX_CLASS = 'st31'

# The signature block: three <text> elements, one per signature line, each holding its rule and its
# caption. Removed only for the public background.
SIGNATURE_BLOCK_CLASS = 'st21'
EXPECTED_SIGNATURE_LINES = 3

# class -> the declaration Illustrator should have written. Sizes are what identify these classes:
# st6 is the 32 pt heading, st10 the 15.9 pt organisation line, st17 the 13 pt body, st21 the 12 pt
# signature block.
MISSING_FONT_FAMILIES = {
    'st6': "font-family:'Playfair Display';",
    'st10': "font-family:'Playfair Display';",
    'st17': "font-family:'Playfair Display';font-style:italic;",
    'st21': "font-family:'Playfair Display';font-style:italic;",
}

# The exported bytes -> what the slogan actually reads. Keyed on the broken string so that an
# artwork re-export that fixes the encoding falls through untouched instead of being overwritten.
BANGLA_SLOGANS = {
    'এককর রক অনননর জজবন': 'একের রক্ত অন্যের জীবন',
    'রকই হহহক আততর বববধন': 'রক্তই হোক আত্মার বাঁধন',
}


def classes_of(element: str) -> list:
    match = re.search(r'class="([^"]*)"', element)
    return match.group(1).split() if match else []


def remove_dynamic_fields(svg: str, without_signature_block: bool = False) -> tuple:
    removed_values = []
    removed_qr = []
    removed_signature_lines = []

    def drop_text(match):
        element = match.group(0)
        if VALUE_FONT_CLASS in classes_of(element):
            removed_values.append(re.sub(r'<[^>]+>', '', element).strip())
            return ''
        if without_signature_block and SIGNATURE_BLOCK_CLASS in classes_of(element):
            removed_signature_lines.append(re.sub(r'<[^>]+>', '', element).strip())
            return ''
        if QR_LABEL_TEXT in element:
            removed_qr.append(QR_LABEL_TEXT)
            return ''
        return element

    svg = re.sub(r'<text\b.*?</text>', drop_text, svg, flags=re.S)

    def drop_qr_box(match):
        element = match.group(0)
        if QR_BOX_CLASS in classes_of(element):
            removed_qr.append('box')
            return ''
        return element

    svg = re.sub(r'<path\b[^>]*/>', drop_qr_box, svg, flags=re.S)
    return svg, removed_values, removed_qr, removed_signature_lines


def declare_missing_font_families(svg: str) -> tuple:
    declared = []

    for name, declaration in MISSING_FONT_FAMILIES.items():
        pattern = re.compile(r'\.' + name + r'\{([^}]*)\}')
        match = pattern.search(svg)
        if not match:
            continue
        if 'font-family' in match.group(1):
            continue
        svg = pattern.sub(lambda m: f'.{name}{{{m.group(1)}{declaration}}}', svg, count=1)
        declared.append(name)

    return svg, declared


def restore_bangla_slogans(svg: str) -> tuple:
    restored = []
    for broken, correct in BANGLA_SLOGANS.items():
        if broken in svg:
            svg = svg.replace(broken, correct)
            restored.append(correct)
    return svg, restored


def main(source_path: str, destination_path: str, without_signature_block: bool = False) -> int:
    svg = open(source_path, encoding='utf-8').read()

    svg, removed_values, removed_qr, removed_signature_lines = remove_dynamic_fields(
        svg, without_signature_block)
    svg, declared = declare_missing_font_families(svg)
    svg, restored = restore_bangla_slogans(svg)

    # Fail loudly rather than quietly baking a placeholder into the background. A background
    # shipping with "Rahim Karim" printed on it would put a stranger's name on every certificate.
    if len(removed_values) != EXPECTED_VALUE_FIELDS:
        print(f'expected {EXPECTED_VALUE_FIELDS} value fields, removed {len(removed_values)}: '
              f'{removed_values}', file=sys.stderr)
        return 1
    if len(removed_qr) != 2:
        print(f'expected the QR label and its box, removed {removed_qr}', file=sys.stderr)
        return 1
    # A background shipping with two of the three signature lines is the defect nobody notices
    # until it is printed, so an unexpected count fails the bake rather than producing it.
    if without_signature_block and len(removed_signature_lines) != EXPECTED_SIGNATURE_LINES:
        print(f'expected {EXPECTED_SIGNATURE_LINES} signature lines, removed '
              f'{len(removed_signature_lines)}: {removed_signature_lines}', file=sys.stderr)
        return 1
    if len(declared) != len(MISSING_FONT_FAMILIES):
        print(f'expected to name a font for {sorted(MISSING_FONT_FAMILIES)}, named {declared} — '
              'a re-export may have renamed the classes', file=sys.stderr)
        return 1
    if len(restored) != len(BANGLA_SLOGANS):
        print(f'restored {len(restored)} of {len(BANGLA_SLOGANS)} Bangla slogans — if the export '
              'now encodes them correctly, drop them from BANGLA_SLOGANS', file=sys.stderr)
        return 1

    open(destination_path, 'w', encoding='utf-8').write(svg)
    signature_note = (f'; removed {len(removed_signature_lines)} signature lines'
                      if without_signature_block else '')
    print(f'removed {removed_values} and the QR placeholder; '
          f'named fonts for {declared}; restored {restored}{signature_note}')
    return 0


if __name__ == '__main__':
    arguments = [a for a in sys.argv[1:] if a != '--without-signature-block']
    sys.exit(main(arguments[0], arguments[1],
                  '--without-signature-block' in sys.argv[1:]))
