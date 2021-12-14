#!/usr/bin/env python3

import os
import json
import urllib.request



def load_json_from_file(file_path):
    with open(file_path) as f:
        return json.loads(f.read())


def azure_icon_name(name):
    word = 'icon-service-'
    idx = name.find(word)
    if idx >= 0:
        return name[idx+len(word):].replace('-', ' ')
    return name

def scan_art(path, art):
    icons = []
    for f in os.listdir(path):
        full_path = os.path.join(path, f)

        if os.path.isdir(full_path):
            icons.extend(scan_art(full_path, art))
        elif os.path.isfile(full_path) and full_path.endswith('.svg'):
            name = f[:-4]
            if art['name'] == 'Azure':
                name = azure_icon_name(name)
            icons.append({
                'name': name,
                'url' : urllib.request.pathname2url('/' + full_path)
            })


    return icons


def scan_all_art():
    asset_art_path = 'assets/art'

    full_art_index = []
    for f in os.listdir(asset_art_path):
        art_folder = os.path.join(asset_art_path, f)
        if os.path.isdir(art_folder):
            art_json_path = os.path.join(art_folder, 'art.json')
            if os.path.exists(art_json_path):
                art_def = load_json_from_file(art_json_path)
                icons = scan_art(art_folder, art_def)
                if len(icons) > 0:
                    art_def['icons'] = icons
                    full_art_index.append(art_def)

    print(json.dumps(full_art_index))



if __name__ == '__main__':
    scan_all_art()