import React, { useState, useEffect, useRef, useCallback } from 'react';
import range from 'lodash/range';
import d3 from './utils/d3.js';
import Two from './utils/two.js';


/**
 * Component for visualizing highlighted rows of a multivec track.
 * @prop {number} trackX The track horizontal offset.
 * @prop {number} trackY The track vertical offset.
 * @prop {number} trackWidth The track width.
 * @prop {number} trackHeight The track height.
 * @prop {number} totalNumRows The number of rows.
 * @prop {(number[]|null)} selectedRows Array of selected row indices.
 * @prop {(number[]|null)} highlitRows Array of highlighted row indices.
 * @prop {function} register The function for child components to call to register their draw functions.
 */
export default function TrackRowHighlight(props) {

    const {
        trackX, trackY,
        trackWidth, trackHeight, 
        totalNumRows,
        selectedRows,
        highlitRows,
        register
    } = props;

    const top = trackY;
    const left = trackX;
    const height = trackHeight;
    const width = trackWidth;

    // Render canvas
    const canvasRef = useRef();

    const yScale = d3.scaleBand()
        .range([0, height]);

    if(selectedRows) {
        // Non-null selectedRows means a subset of rows are selected, potentially in a particular order.
        yScale.domain(selectedRows);
    } else {
        // Null selectedRows means all rows are selected, in the default order.
        yScale.domain(range(totalNumRows));
    }

    const rowHeight = yScale.bandwidth();

    // Render each track.
    const draw = useCallback((domElement) => {
        const two = new Two({
            width,
            height,
            domElement
        });

        if(highlitRows) {
            for(let i of highlitRows) {
                const rect = two.makeRect(0, yScale(i), width, rowHeight);
                rect.stroke = null;
                rect.fill = "#000";
                rect.opacity = 0.2;
            }
        }

        two.update();
        return two.teardown;
    }, [width, height, totalNumRows, selectedRows, highlitRows]);

    register("TrackRowHighlight", draw);

    useEffect(() => {
        const canvas = canvasRef.current;
        const teardown = draw(canvas);
        return teardown;
    });

    console.log("TrackRowHighlight.render");
    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'absolute',
                top: `${top}px`,
                left: `${left}px`,
                width: `${width}px`,
                height: `${height}px`,
                pointerEvents: 'none'
            }}
        />
    );
}