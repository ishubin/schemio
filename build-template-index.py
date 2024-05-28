#!/usr/bin/env python3

import json
import os
import urllib.request
import yaml


def load_json_from_file(file_path):
    with open(file_path) as f:
        return json.loads(f.read())


def load_yaml_from_file(file_path):
    with open(file_path) as f:
        return yaml.safe_load(f)


def write_json_to_file(data, file_path):
    with open(file_path, 'w') as f:
        json.dump(data, f)


def read_file(file_path):
    data = None
    with open(file_path, 'r') as file:
        data = file.read()
    return data



# Only used for yaml templates
def process_template(template, template_path):
    dir_name = os.path.dirname(template_path)
    if 'import' in template:
        init_script_prefix = ''
        for import_path in template['import']:
            imported_script = read_file(os.path.join(dir_name, import_path))
            init_script_prefix += imported_script + '\n\n'
        if 'init' in template:
            template['init'] = init_script_prefix + template['init']
        else:
            template['init'] = init_script_prefix




def index_template_item(index, file_path):
    if not os.path.isfile(file_path):
        return

    template = None
    resulting_file_path = file_path

    extension_idx = file_path.rfind('.')

    if file_path.endswith('.json'):
        yaml_alternative_path = file_path[0:extension_idx] + '.yaml'
        if not os.path.exists(yaml_alternative_path):
            template = load_json_from_file(file_path)
    elif file_path.endswith('.yaml'):
        template = load_yaml_from_file(file_path)
        resulting_file_path = file_path[0:extension_idx] + '.json'
        process_template(template, file_path)
        write_json_to_file(template, resulting_file_path)


    if template is not None:
        entry = {
            'name': template['name'],
            'path' : urllib.request.pathname2url('/' + resulting_file_path),
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
