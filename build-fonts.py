#!/usr/bin/env python3

import re
import json
import base64
import sys

__field_def_pattern__ = r'^([a-z-]+):\s*(.*);$'

def read_file(file_path):
    with open(file_path, 'r') as f:
        return f.readlines()


def font_format(ext):
    if ext == 'ttf':
        return 'truetype'
    return ext

def convert_font_url(font_path_prefix, text):
    if not text.startswith('url('):
        return text

    bracket_idx = text.index(')')
    sub_path = text[4:bracket_idx]
    if sub_path[0] == '\'' or sub_path[0] == '"':
        sub_path = sub_path[1:]

    if sub_path[-1] == '\'' or sub_path[-1] == '"':
        sub_path = sub_path[0:len(sub_path)-1]

    font_path = font_path_prefix + sub_path

    ext = font_path[font_path.rfind('.')+1:]
    font_path = font_path[:font_path.rfind('.')] + '.' + ext

    with open(font_path, 'rb') as f:
        data = f.read()
        encoded = base64.b64encode(data).decode("utf-8")
        return f'url(\'data:font/{ext};base64,{encoded}\') format(\'{font_format(ext)}\')'


def extract_font_name(font_family):
    return re.sub('[\'\"]', '', font_family['font-family'])



def convert_font_awesome_src(src_text):
    url_part = src_text.split(",")[1]
    return convert_font_url('assets/css/', url_part)


def process_fontawesome_styling():
    text = ''.join(read_file('assets/css/all.min.css'))

    idx = text.find('src:')
    with open('assets/css/all.min.embedded.css', 'w+') as f:
        while idx >= 0:
            f.write(text[0:idx])
            text = text[idx+4:]

            match = re.search(r"[;}]", text)
            src_text_idx = match.start()
            src_text = text[0:src_text_idx]
            text = text[src_text_idx:]
            f.write('src:')
            f.write(convert_font_awesome_src(src_text))
            idx = text.find('src:')
        f.write(text)


if __name__ == '__main__':
    process_fontawesome_styling()
    sys.exit(0)

    font_files = [
        'assets/custom-fonts/fonts.css',
        'assets/katex/katex.css'
    ]

    font_families = []

    next_family = None

    for font_file_path in font_files:
        font_css_lines = read_file(font_file_path)

        font_path_prefix = font_file_path[0:font_file_path.rfind('/')+1]

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
                        next_family[field] = convert_font_url(font_path_prefix, value)
                    else:
                        next_family[field] = value


            elif line == '}':
                next_family = None

    font_mapping = dict()

    for font_family in font_families:
        font_name = extract_font_name(font_family)
        font_file_name = re.sub('[^0-9a-zA-Z]+', '_', font_name.lower().strip()) + '.css'
        file_path = 'assets/custom-fonts/embedded/' + font_file_name

        font_mapping[font_name] = '/' + file_path
        with open(file_path, 'w+') as f:
            f.write('@font-face {\n')
            for k, v in font_family.items():
                f.write(f'    {k}: {v};\n')
            f.write('}\n\n')

    s = json.dumps(font_mapping, indent=4)
    with open('src/ui/scheme/FontMapping.js', 'w+') as f:
        f.write('export const fontMapping = ')
        f.write(s)
        f.write(';\n')
