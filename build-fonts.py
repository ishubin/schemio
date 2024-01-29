#!/usr/bin/env python3

import re
import base64

__field_def_pattern__ = r'^([a-z-]+):\s*(.*);$'

def read_file(file_path):
    with open(file_path, 'r') as f:
        return f.readlines()


def font_format(ext):
    if ext == 'ttf':
        return 'truetype'
    return ext

def convert_font_url(text):
    if not text.startswith('url('):
        return text

    bracket_idx = text.index(')')
    font_path = 'assets/custom-fonts/' + text[5:bracket_idx-1]

    ext = font_path[font_path.rfind('.')+1:]
    font_path = font_path[:font_path.rfind('.')] + '.' + ext

    with open(font_path, 'rb') as f:
        data = f.read()
        encoded = base64.b64encode(data).decode("utf-8")
        return f'url(\'data:font/{ext};base64,{encoded}\') format(\'{font_format(ext)}\')'


if __name__ == '__main__':
    font_css_lines = read_file('assets/custom-fonts/fonts.css')

    font_families = []

    next_family = None

    for raw_line in font_css_lines:
        line = raw_line.strip()

        if line == '@font-face {':
            next_family = {}
            font_families.append(next_family)
        elif not next_family is None:
            match = re.search(__field_def_pattern__, line)
            if not match is None:
                field = match.group(1)
                value = match.group(2)

                if field == 'src':
                    next_family[field] = convert_font_url(value)
                else:
                    next_family[field] = value


        elif line == '}':
            next_family = None


    with open('assets/custom-fonts/all-fonts-embedded.css', 'w') as f:
        for font_family in font_families:
            f.write('@font-face {\n')
            for k, v in font_family.items():
                f.write(f'    {k}: {v};\n')
            f.write('}\n\n')