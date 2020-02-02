import React from 'react';

import TrackRowInfo from './TrackRowInfo.js';


export default function TrackWrapper(props) {
    const { x0, y0, options, track } = props;

    if(!track || !track.tilesetInfo) {
        // The track or track tileset info has not yet loaded.
        return null;
    }

    const x1 = track.position[0];
    const y1 = track.position[1];
    const height = track.dimensions[1];
    let rowInfo = [];
    try {
        rowInfo = track.tilesetInfo.row_infos.map(JSON.parse);
    } catch(e) {
        // TODO: Remove this catch block. This is only being used for the resgen.io cistrome demo data, 
        //       since its metadata is stored in tab-separated strings rather than JSON objects.
        rowInfo = track.tilesetInfo.row_infos.map(d => d.split("\t"));
    }

    // TODO: Obtain infoAttr keys from `options`.

    console.log("TrackWrapper.render");
    return (
        <div className="cistrome-hgw-track-wrapper">
            {options.rowInfoPosition !== "hidden" ? 
                (<TrackRowInfo 
                    rowInfo={rowInfo}
                    x0={x0}
                    x1={x1}
                    y1={y1}
                    height={height}
                    infoAttrPrimary={5}
                    infoAttrSecondary={6}
                    rowInfoPosition={options.rowInfoPosition}
                />) : null}
        </div>
    );
}