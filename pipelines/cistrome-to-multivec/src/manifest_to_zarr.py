import zarr
from numcodecs import Zlib
import bbi
import negspy.coordinates as nc
import numpy as np
import math
import argparse
import json
from tqdm import tqdm
import resource

from utils import metadata_json_to_row_info, name_to_coordsystem, get_manifest_to_outfile_parser

def bigwigs_to_zarr(
    input_bigwig_files,
    input_metadata_files,
    output_file,
    starting_resolution,
    name
):

    # Short-hand for creating a DirectoryStore with a root group.
    f = zarr.open(output_file, mode='w')
    compressor = Zlib(level=1)

    num_samples = len(input_bigwig_files)

    # Zip the input to create (bw, metadata) tuples
    zipped_input = zip(input_bigwig_files, input_metadata_files)

    # Create level zero groups
    chromosomes_group = f.create_group("chromosomes")


    # Prepare to fill in chroms dataset
    chromosomes = nc.get_chromorder('hg38')
    chromosomes = chromosomes[:25] # TODO: should more than chr1-chrM be used?
    num_chromosomes = len(chromosomes)
    chroms_length_arr = np.array([ nc.get_chrominfo('hg38').chrom_lengths[x] for x in chromosomes ], dtype="i8")
    chroms_name_arr = np.array(chromosomes, dtype="S23")

    chromosomes_set = set(chromosomes)
    chrom_name_to_length = dict(zip(chromosomes, chroms_length_arr))

    
    # Prepare to fill in resolutions dataset
    resolutions = [ starting_resolution*(2**x) for x in range(16)]
        
    # Create each chromosome dataset.
    for chr_name, chr_len in chrom_name_to_length.items():
        chr_group = chromosomes_group.create_group(chr_name)
        # Create each resolution group.
        for resolution in resolutions:
            chr_shape = (num_samples, math.ceil(chr_len / resolution))
            chr_group.create_dataset(str(resolution), shape=chr_shape, dtype="f4", fill_value=np.nan, compressor=compressor)
    
    # Fill in data for each bigwig file.
    for bw_index, bw_file in tqdm(list(enumerate(input_bigwig_files)), desc='bigwigs'):
        if bbi.is_bigwig(bw_file):
            chromsizes = bbi.chromsizes(bw_file)
            matching_chromosomes = set(chromsizes.keys()).intersection(chromosomes_set)

            # Fill in data for each resolution of a bigwig file.
            for resolution in resolutions:
                # Fill in data for each chromosome of a resolution of a bigwig file.
                for chr_name in matching_chromosomes:
                    chr_len = chrom_name_to_length[chr_name]
                    chr_shape = (num_samples, math.ceil(chr_len / resolution))
                    arr = bbi.fetch(bw_file, chr_name, 0, chr_len, chr_shape[1], summary="sum")
                    chromosomes_group[chr_name][str(resolution)][bw_index,:] = arr
        else:
            print(f"{bw_file} not is_bigwig")
    
    max_mem = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    print(max_mem)
    
    # Append metadata to the top resolution row_infos attribute.
    row_infos = []
    for metadata_index, metadata_file in enumerate(input_metadata_files):
        with open(metadata_file) as mf:
            metadata_json = json.load(mf)
        row_info = metadata_json_to_row_info(metadata_json)
        row_infos.append(row_info)
    
    # f.attrs should contain all tileset_info properties
    # For zarr, more attributes are used here to allow "serverless"
    f.attrs['row_infos'] = row_infos
    f.attrs['tile_size'] = 256
    f.attrs['resolutions'] = sorted(resolutions, reverse=True)
    f.attrs['min_pos'] = [ 0 ]
    f.attrs['max_pos'] = [ int(sum(chroms_length_arr)) ]
    f.attrs['shape'] = [ 256, num_samples ]
    f.attrs['name'] = name
    f.attrs['coordSystem'] = name_to_coordsystem(name)
    f.attrs['chromSizes'] = [
        [str(chr_name), int(chr_len)]
        for (chr_name, chr_len) in list(zip(chromosomes, chroms_length_arr))
    ]
    
    # 
    f.attrs['multiscales'] = [
        {
            "version": "0.1",
            "name": str(chr_name),
            "datasets": [
                { "path": f"chromosomes/{chr_name}/{resolution}" }
                for resolution in sorted(resolutions, reverse=True)
            ],
            "type": "zarr-multivec",
            "metadata": {
                "chromsize": int(chr_len),
            }
        }
        for (chr_name, chr_len) in list(zip(chromosomes, chroms_length_arr))
    ]


if __name__ == "__main__":
    parser = get_manifest_to_outfile_parser()
    args = parser.parse_args()

    with open(args.input) as f:
        manifest_json = json.load(f)
        input_bigwig_files = manifest_json['input_bigwig_files']
        input_metadata_files = manifest_json['input_metadata_files']

    bigwigs_to_zarr(
        input_bigwig_files,
        input_metadata_files,
        args.output,
        args.starting_resolution,
        args.name
    )