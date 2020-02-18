import React, { useRef, createRef, useState, useEffect} from 'react';
import d3 from './utils/d3.js';
import { modifyItemInArray } from './utils/array.js';
import TrackRowInfoVisBar from './TrackRowInfoVisBar.js';
import TrackRowInfoVisLink from './TrackRowInfoVisLink.js';
import TrackRowInfoVisDendrogram from './TrackRowInfoVisDendrogram.js';
import './TrackResizer.scss';

const fieldTypeToVisComponent = {
    "nominal": TrackRowInfoVisBar,
    "quantitative": TrackRowInfoVisBar,
    "url": TrackRowInfoVisLink,
    "tree": TrackRowInfoVisDendrogram
};

/**
 * Parent component for visualization of row info attribute values.
 * @prop {string} viewId The viewId for the horizontal-multivec track.
 * @prop {string} trackId The trackId for the horizontal-multivec track.
 * @prop {number} trackX The track horizontal offset.
 * @prop {number} trackY The track vertical offset.
 * @prop {number} trackWidth The track width.
 * @prop {number} trackHeight The track height.
 * @prop {array} rowInfo Array of JSON objects, one object for each row.
 * @prop {array} rowInfoAttributes Array of JSON object, one object for the names and types of each attribute.
 * @prop {string} rowInfoPosition The value of the `rowInfoPosition` option.
 * @prop {function} onSortRows The function to call upon a sort interaction.
 * @prop {function} onSearchRows The function to call upon a search interaction.
 * @prop {function} drawRegister The function for child components to call to register their draw functions.
 */
export default function TrackRowInfo(props) {

    const {
        viewId, trackId,
        trackX, trackY,
        trackWidth, trackHeight, 
        rowInfo, 
        rowInfoAttributes,
        rowInfoPosition,
        onSortRows,
        onSearchRows,
        drawRegister
    } = props;

    // Dimensions
    const defaultUnitWidth = 100;
    const marginForMouseEvent = 20;
    const isLeft = rowInfoPosition === "left";
    const top = trackY;
    const height = trackHeight;
    let unitWidths = [];    // Store default unit width for each vertical tracks
    rowInfoAttributes.forEach((fieldInfo) => {
        unitWidths.push({
            field: fieldInfo.field,
            type: fieldInfo.type,
            width: defaultUnitWidth
        });
    });
    const [widths, setWidths] = useState(unitWidths);
    const width = d3.sum(widths.map(d => d.width));
    const left = isLeft ? trackX - width : trackX + trackWidth;

    const divRef = useRef();
    const resizerRef = useRef([...Array(rowInfoAttributes.length)].map(() => createRef()));
    const [resizingIndex, setResizingIndex] = useState(-1);
    
    // Determine position of each dimension.
    let trackProps = [];
    let currentLeft = 0;
    rowInfoAttributes.forEach((attribute, i) => {
        const fieldInfo = isLeft ? rowInfoAttributes[rowInfoAttributes.length - i - 1] : attribute;
        const width = widths.find(d => d.field === fieldInfo.field && d.type === fieldInfo.type).width;

        trackProps.push({
            left: currentLeft, top: 0, width, height,
            fieldInfo,
            isLeft
        });
        currentLeft += width;
    });
    
    let resizers = trackProps.map((d, i) => {
        const resizerWidth = 4, resizerHeight = 10, margin = 2;
        return (
            <div
                ref={resizerRef.current[i]}
                key={i}
                className="visualization-resizer"
                style={{
                    top: `${d.top + (d.height + resizerHeight) / 2.0}px`,
                    left: `${isLeft ? d.left + margin + marginForMouseEvent : d.left + d.width - resizerWidth - margin}px`,
                    height: `${resizerHeight}px`,
                    width: `${resizerWidth}px`,
                    // visibility: mouseX !== null ? "visible" : "hidden"
                }}
            />
        );
    });

    useEffect(() => {
        const div = divRef.current;

        resizerRef.current.forEach((resizer, i) => {
            d3.select(resizer.current).on("mousedown", () => setResizingIndex(i));
        });

        d3.select(div).on("mouseup", () => setResizingIndex(-1));

        d3.select(div).on("mousemove", () => {
            if(resizingIndex !== -1) {
                const { left: trackLeft, width: trackWidth } = trackProps[resizingIndex];
                const { field, type } = trackProps[resizingIndex].fieldInfo;
                const [mouseX, mouseY] = d3.mouse(div);
                let newWidth = isLeft ? trackWidth - (mouseX - trackLeft - marginForMouseEvent) : (mouseX - trackLeft);
                const minWidth = 50;
                if(newWidth < minWidth) {
                    newWidth = minWidth;
                }
                const mIdx = widths.indexOf(widths.find(d => d.field === field && d.type === type));
                if(mIdx !== -1){
                    setWidths(modifyItemInArray(widths, mIdx, {
                        field, type,
                        width: newWidth
                    }));
                }
            }
        });
    })

    console.log("TrackRowInfo.render");
    return (
        <div
            ref={divRef}
            className="cistrome-hgw-child"
            style={{
                top: `${top}px`,
                left: `${isLeft ? left - marginForMouseEvent : left}px`, 
                width: `${width + marginForMouseEvent}px`,
                height: `${height}px`,
            }}
        >
            {trackProps.map((d, i) => React.createElement(
                fieldTypeToVisComponent[d.fieldInfo.type],
                {
                    key: i,
                    left: isLeft ? marginForMouseEvent + d.left : d.left,
                    top: d.top,
                    width: d.width,
                    height: d.height,
                    isLeft: d.isLeft,
                    fieldInfo: d.fieldInfo,
                    viewId: viewId,
                    trackId: trackId,
                    rowInfo: rowInfo,
                    onSortRows: onSortRows,
                    onSearchRows: onSearchRows,
                    drawRegister: drawRegister,
                }
            ))}
            {resizers}
        </div>
    );
}