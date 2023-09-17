#!/usr/bin/env python3

import json
import os
import urllib.request


def load_json_from_file(file_path):
    with open(file_path) as f:
        return json.loads(f.read())


def index_template_item(index, file_path):
    if not os.path.isfile(file_path) or not file_path.endswith('.json'):
        return
    template = load_json_from_file(file_path)

    entry = {
        'name': template['name'],
        'path' : urllib.request.pathname2url('/' + file_path),
        'preview': template['preview'] if 'preview' in template else None,
        'description': template['description'] if 'description' in template else ''
    }
    index.append(entry)



def scan_all_templates():
    root_folder = 'assets/templates'

    template_index = []

    for f in os.listdir(root_folder):
        template_folder = os.path.join(root_folder, f)
        if os.path.isdir(template_folder):
            for f in os.listdir(template_folder):
                full_path = os.path.join(template_folder, f)
                index_template_item(template_index, full_path)




    with open(os.path.join(root_folder, 'index.json'), 'w') as f:
        f.write(json.dumps(sorted(template_index, key=lambda x: x['name'])))


if __name__ == '__main__':
    scan_all_templates()
