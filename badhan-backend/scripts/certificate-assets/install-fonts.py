#!/usr/bin/env python3
"""Make the artwork's own fonts available to the rasteriser, under the names the SVG asks for.

The Illustrator SVG names six font families and embeds none of them — that gap is exactly why the
certificate never rendered like the designer's PDF. Two of the six, Futura and Palatino, are
commercial faces that cannot be downloaded and have no close free equivalent. The PDF, exported
from the same document, does embed them, so the type the artwork was actually drawn with is
recoverable from the PDF itself rather than guessed at or substituted.

Two details make that recovery work:

  * A PDF embeds a *subset* and renames it with a six-letter tag — 'SAXQRO+FuturaBT-HeavyItalic'.
    Fontconfig sees the tagged name, the SVG asks for the untagged one, so this writes an alias per
    font rather than hardcoding tags that change with every re-export.
  * Subsets of CID-keyed fonts come out with no usable character map. They are skipped: such a font
    renders text as blanks, silently, which on a certificate is worse than failing. Everything that
    lands there is a face the image already carries a real file for (see the Dockerfile), and the
    image's copy wins because the aliases only ever point at what survived this filter.

Nothing extracted here is committed or redistributed. It is used at prep time to bake one PNG, the
same way the designer's own export used it, and only the PNG is checked in.
"""

import os
import re
import shutil
import subprocess
import sys

FONT_DIR = '/tmp/certificate-fonts'
FONTCONFIG_PATH = '/etc/fonts/conf.d/99-certificate-artwork.conf'

ALIAS_TEMPLATE = """  <match target="pattern">
    <test name="family"><string>{asked}</string></test>
    <edit name="family" mode="assign" binding="strong"><string>{actual}</string></edit>
  </match>
"""


def family_of(path: str) -> str:
    result = subprocess.run(['fc-query', '-f', '%{family}', path],
                            capture_output=True, text=True)
    return result.stdout.strip() if result.returncode == 0 else ''


def has_characters(path: str) -> bool:
    result = subprocess.run(['fc-query', '-f', '%{charset}', path],
                            capture_output=True, text=True)
    return bool(result.stdout.strip())


def main(pdf_path: str) -> int:
    shutil.rmtree(FONT_DIR, ignore_errors=True)
    os.makedirs(FONT_DIR)

    # mutool writes into the working directory, so it is run from the font directory — which means
    # the PDF has to be named absolutely, not relative to wherever the caller stood.
    subprocess.run(['mutool', 'extract', os.path.abspath(pdf_path)], cwd=FONT_DIR,
                   check=True, capture_output=True)

    aliases = []
    installed = []

    for name in sorted(os.listdir(FONT_DIR)):
        path = os.path.join(FONT_DIR, name)
        if not name.lower().endswith(('.ttf', '.otf', '.cff')):
            os.remove(path)
            continue

        family = family_of(path)
        subset = re.match(r'^[A-Z]{6}\+(.+)$', family)

        if not has_characters(path):
            print(f'skipping {family or name}: subset has no character map')
            os.remove(path)
            continue

        installed.append(family)
        if subset:
            aliases.append(ALIAS_TEMPLATE.format(asked=subset.group(1), actual=family))

    with open(FONTCONFIG_PATH, 'w', encoding='utf-8') as handle:
        handle.write('<?xml version="1.0"?>\n<!DOCTYPE fontconfig SYSTEM "fonts.dtd">\n'
                     '<fontconfig>\n'
                     f'  <dir>{FONT_DIR}</dir>\n'
                     + ''.join(aliases) +
                     '</fontconfig>\n')

    subprocess.run(['fc-cache', '-f'], check=True, capture_output=True)
    print('installed: ' + ', '.join(sorted(installed)))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1]))
