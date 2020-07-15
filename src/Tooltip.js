import React, { useEffect, useState } from 'react';
import PubSub from 'pubsub-js';

import { EVENT } from './utils/constants.js';

import './Tooltip.scss';

export function destroyTooltip() {
    PubSub.publish(EVENT.TOOLTIP, {
        x: null,
        y: null,
        content: null
    });
}

/**
 * Generate tooltip contents.
 * @prop {string} title The title of tooltip.
 * @prop {number} value A value to show in tooltip.
 * @prop {string} color A color related to the value/title.
 */
export function TooltipContent(props) {
    const { title, value, color: background, warning } = props;   
    return (
        <div className="hm-tooltip-content">
            <div className="hm-tooltip-title">{title}</div>
            <div className="hm-tooltip-content-group">
                {background ? 
                    <div className="hm-tooltip-color-container">
                        <div className="hm-tooltip-color" style={{ background }}/>
                    </div>
                    : null
                }
                {value ? 
                    <div style={{color: warning ? "red" : "black"}}>{value}</div>
                    : null
                }
            </div>
        </div>
    );
}

/**
 * Tooltip component. Subscribes to 'tooltip' event via `PubSub`.
 * @example
 * <Tooltip />
 */
export default function Tooltip() {

    const [left, setLeft] = useState(null);
    const [top, setTop] = useState(null);
    const [content, setContent] = useState("");

    useEffect(() => {
        const tooltipToken = PubSub.subscribe(EVENT.TOOLTIP, (msg, data) => {
            setLeft(data.x);
            setTop(data.y);
            setContent(data.content);
        });

        return () => {
            PubSub.unsubscribe(tooltipToken);
        };
    });

    return (
        <div
            className="hm-tooltip"
            style={{
                display: ((left !== null && top !== null) ? 'inline-block' : 'none'),
                top: `${top}px`,
                left: `${left}px`,
            }}
        >
            {content}
        </div>
    );
};