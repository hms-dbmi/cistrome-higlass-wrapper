import requests
import yaml
import urllib
import itertools
from tqdm import tqdm
from pprint import pprint

initial_params = {
    'allqc': False,
    'cellinfos': 'all',
    "completed": False,
    "curated": False,
    "factors": "all",
    "keyword": "",
    "page": 1,
    "peakqc": False,
    "run": False,
    "species": "all"
}

CISTROME_DB_BASE_URL = "http://dc2.cistrome.org/api/main_filter_ng?"

DENYLIST = {
    6413,
    51200,
    94002,
    43368,
}

def get_cids(specie, factor, bio_source_type, bio_source_id):
    params = initial_params.copy()
    params['species'] = specie
    params['factors'] = factor

    url = CISTROME_DB_BASE_URL + urllib.parse.urlencode(params)

    cids = []

    r = requests.get(url)
    if r.ok:
        response_json = r.json()
        cids += [ d["id"] for d in response_json["datasets"] ]
        num_pages = response_json['num_pages']

        for page in range(2, num_pages + 1):
            page_params = params.copy()
            page_params["page"] = page
            page_url = CISTROME_DB_BASE_URL + urllib.parse.urlencode(page_params)
            page_r = requests.get(page_url)
            if page_r.ok:
                page_response_json = page_r.json()
                cids += [ d["id"] for d in page_response_json["datasets"] ]
    # Use a set to eliminate duplicates
    return list(set(cids) - DENYLIST)

def get_factors_by_species(specie):
    params = initial_params.copy()
    params['species'] = specie

    url = CISTROME_DB_BASE_URL + urllib.parse.urlencode(params)

    r = requests.get(url)
    if r.ok:
        response_json = r.json()
        return response_json["factors"]
    else:
        print(f"Error: get_factors_by_species({specie})")
        return []

def get_bio_sources_by_species_and_factor(specie, factor):
    params = initial_params.copy()
    params['species'] = specie
    params['factors'] = factor

    url = CISTROME_DB_BASE_URL + urllib.parse.urlencode(params)

    r = requests.get(url)
    if r.ok:
        response_json = r.json()
        return response_json["cellinfos"]
    else:
        print(f"Error: get_bio_sources_by_species_and_factor({specie}, {factor})")
        return []

def generate_config():

    config = {
        "groups": {}
    }

    initial_url = CISTROME_DB_BASE_URL + urllib.parse.urlencode(initial_params)

    r = requests.get(initial_url)
    if r.ok:
        index_json = r.json()
        
    all_species = index_json['species']

    for specie in all_species:
        print(specie)
        specie_factors = get_factors_by_species(specie)
        for factor in tqdm(specie_factors):
            name = f"{specie}__{factor}__all".replace(" ", "_")
            cids = get_cids(specie, factor, None, None)
                
            config["groups"][name] = cids
    return config


if __name__ == "__main__":

    config = generate_config()

    with open('config.yml', 'w') as f:
        yaml.dump(config, f, default_flow_style=False)