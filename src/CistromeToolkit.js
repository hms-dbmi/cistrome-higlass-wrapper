import React, { useEffect, useRef, useCallback, useState, useMemo } from "react";
import PubSub from 'pubsub-js';
import d3 from './utils/d3.js';
import { EVENT } from './utils/constants.js';
import DataTable from "./DataTable.js";
import { CLOSE, SEARCH, EXPAND, TABLE, EXTERNAL_LINK, QUESTION_MARK } from './utils/icons.js';
import { TooltipContent, destroyTooltip } from "./Tooltip.js";
import { 
    CISTROME_DBTOOLKIT_CHROMOSOMES,
    CISTROME_DBTOOLKIT_SPECIES, 
    CISTROME_DBTOOLKIT_PEAK_NUMBERS, 
    CISTROME_DBTOOLKIT_GENE_DISTANCE,
    validateGeneParams, 
    CISTROME_API_TYPES,
    getReadableTable,
    CISTROME_API_COLORS,
    validateIntervalParams,
    requestDBToolkitAPI,
    validatePeaksetParams
} from './utils/cistrome.js';
import './CistromeToolkit.scss';
import { stackOffsetNone } from "d3";

export function destroyCistromeToolkit() {
    PubSub.publish(EVENT.CISTROME_TOOLKIT, {
        intervalParams: undefined,
        isVisible: false
    });
}

/**
 * Wrapper around <DataTable />, specific for showing the TF binding interval request results.
 * Subscribes to 'cistrome-toolkit' event via `PubSub`.
 * @prop {function} onAddTrack A function to call when adding tracks with selected rows.
 * @prop {object} intervalParams The interval request parameters.
 * @prop {string} intervalParams.assembly
 * @prop {string} intervalParams.chrStartName
 * @prop {number} intervalParams.chrStartPos
 * @prop {string} intervalParams.chrEndName
 * @prop {number} intervalParams.chrEndPos
 * @example
 * <CistromeToolkit/>
 */
export default function CistromeToolkit(props) {
    const {
        onAddTrack
    } = props;

    const resizerRef = useRef(null);
    const dragY = useRef(null);

    const [isVisible, setIsVisible] = useState(true); // TODO: To debug
    const [height, setHeight] = useState(800);

    const [requestStatus, setRequestStatus] = useState(undefined);
    const [requestHistory, setRequestHistory] = useState([]);
    const [selectedRequestIndex, setSelectedRequestIndex] = useState(undefined);
    const [selectedRowIndexes, setSelectedRowIndexes] = useState([]);

    // API parameters
    const [latestIntervalParams, setLatestIntervalParams] = useState({
        assembly: CISTROME_DBTOOLKIT_SPECIES[0],
        chrStartName: CISTROME_DBTOOLKIT_CHROMOSOMES[0],
        chrEndName: CISTROME_DBTOOLKIT_CHROMOSOMES[0],
        chrStartPos: undefined,
        chrEndPos: undefined
    });
    const [latestGeneParams, setLatestGeneParams] = useState({
        assembly: CISTROME_DBTOOLKIT_SPECIES[0],
        distance: CISTROME_DBTOOLKIT_GENE_DISTANCE[0],
        gene: ''
    });
    const [latestPeaksetParams, setLatestPeaksetParams] = useState({
        assembly: CISTROME_DBTOOLKIT_SPECIES[0],
        tpeak: CISTROME_DBTOOLKIT_PEAK_NUMBERS[0],
        bedFile: {}
    });

    // Ready to call API?
    const [isLatestIntervalParamsReady, setIsLatestIntervalParamsReady] = useState(false);
    const [isLatestGeneParamsReady, setIsLatestGeneParamsReady] = useState(false);
    const [isLatestPeaksetParamsReady, setIsLatestPeaksetParamsReady] = useState(false);

    // Subscribing PubSub events
    useEffect(() => {
        const cistromeToolkitToken = PubSub.subscribe(EVENT.CISTROME_TOOLKIT, (msg, data) => {
            setIsVisible(data.isVisible !== undefined ? data.isVisible : !isVisible); // When undefined, toggle visibility
            // Only Interval API supports interactive request from HiGlass tracks
            if(validateIntervalParams(data.intervalParams).success) {
                setLatestIntervalParams(data.intervalParams);
                runCistromeToolkitAPI(CISTROME_API_TYPES.INTERVAL, data.intervalParams);
            }
        });
        return () => {
            PubSub.unsubscribe(cistromeToolkitToken);
        };
    });

    // Reset the row selection upon mouse click on other history
    useEffect(() => {
        setSelectedRowIndexes([]);
    }, [selectedRequestIndex]);

    // Check if parameters for each API is ready and can make a good URL
    useEffect(() => {
        setIsLatestIntervalParamsReady(validateIntervalParams(latestIntervalParams).success);
    }, [latestIntervalParams]);

    useEffect(() => {
        setIsLatestGeneParamsReady(validateGeneParams(latestGeneParams).success);
    }, [latestGeneParams]);

    useEffect(() => {
        setIsLatestPeaksetParamsReady(validatePeaksetParams(latestPeaksetParams).success);
    }, [latestPeaksetParams]);

    function addRequestHistory(api, parameter, columns, rows) {
        const isIdentical = {
            [CISTROME_API_TYPES.INTERVAL]: (d1, d2) => (
                d1.assembly === d2.assembly 
                && d1.chrStartName === d2.chrStartName 
                && d1.chrStartPos === d2.chrStartPos
                && d1.chrEndName === d2.chrEndName 
                && d1.chrEndPos === d2.chrEndPos
            ),
            [CISTROME_API_TYPES.GENE]: (d1, d2) => (
                d1.assembly === d2.assembly,
                d1.distance === d2.distance,
                d1.gene === d2.gene
            )
            // TODO:
        }
        const isRequestNew = undefined === requestHistory.find(d => isIdentical[api](d, parameter));
        if(isRequestNew) {
            const history = [{ api, parameter, columns, rows }, ...requestHistory];
            setRequestHistory(history);
            setSelectedRequestIndex(0);
        }
    }

    function runCistromeToolkitAPI(apiType, parameter = undefined) {
        if(!parameter) {
            parameter = {
                [CISTROME_API_TYPES.INTERVAL]: latestIntervalParams,
                [CISTROME_API_TYPES.GENE]: latestGeneParams,
                [CISTROME_API_TYPES.PEAKSET]: latestPeaksetParams
            }[apiType];
        }
        if(parameter) {
            setRequestStatus({ msg: "Receiving Cistrome DB API response...", isLoading: true });
            requestDBToolkitAPI(apiType, parameter)
                .then(([rows]) => {
                    const [customColumns, customRows] = getReadableTable(apiType, rows);
                    setRequestStatus({ msg: 'Finished receiving API response', isLoading: false });
                    addRequestHistory(
                        apiType,
                        parameter,
                        customColumns,
                        customRows
                    );
                })
                .catch((msg) => {
                    setRequestStatus({ msg, isLoading: false });
                });
        }
    }
    
    // Set up the d3-drag handler functions (started, ended, dragged).
    const started = useCallback(() => {
        const event = d3.event;
        dragY.current = event.sourceEvent.clientY;
    }, [dragY])

    const ended = useCallback(() => {
        dragY.current = null;
    }, [dragY])

    const dragged = useCallback(() => {
        const event = d3.event;
        const diff = event.sourceEvent.clientY - dragY.current;
        setHeight(
            Math.max(
                Math.min(height - diff, window.innerHeight),
                400
            )
        );
    }, [dragY, height]);

    // Detect drag events for the resize element.
    useEffect(() => {
        const resizer = resizerRef.current;

        const drag = d3.drag()
            .on("start", started)
            .on("drag", dragged)
            .on("end", ended);

        d3.select(resizer).call(drag);

        return () => d3.select(resizer).on(".drag", null);
    }, [resizerRef, started, dragged, ended]);

    const APIConfigurationViews = useMemo(() => {
        const searchButton = (isReady, onClick) => (
            <div 
                className={isReady ? 'api-search-button' : 'api-search-button-disabled'}
                onClick={onClick}
            >
                <svg className="chw-button-sm chw-button-static" 
                    style={{ top: '.3em', position: 'relative' }}
                    viewBox={SEARCH.viewBox}>
                    <path d={SEARCH.path} fill="currentColor"/>
                </svg>
                Search
            </div>  
        );
        
        const tooltipHelpInfo = {
            'distance': e => {
                PubSub.publish(EVENT.TOOLTIP, {
                    x: e.clientX,
                    y: e.clientY,
                    content: <TooltipContent
                        title={'Half-decay Distance to Transcription Start Site'}
                        value={'This is the relative distance that the distribution of RP calculation function is decreased to half of the highest value at TSS'}
                    />
                });
            },
            'bedfile': (e) => {
                PubSub.publish(EVENT.TOOLTIP, {
                    x: e.clientX,
                    y: e.clientY,
                    content: <TooltipContent
                        title={'Bed File'}
                        value={'Three columns are required (i.e., chromosome, start site, end site), and tab delimited, maximum of 50,000 peaks'}
                    />
                });
            }
        }

        return (
            <>
                {/* Search by Interval */}
                <div 
                    className={'api-config-view'}
                    style={{ borderLeft: `4px solid ${CISTROME_API_COLORS.INTERVAL}` }}
                >
                    <div className='api-title'>Search by Interval</div>
                    <div className='api-subtitle'>What factors bind in your interval?</div>
                    <div>Chromosome</div>    
                    <select
                        value={latestIntervalParams.chrStartName}
                        onChange={e => setLatestIntervalParams({ 
                            ...latestIntervalParams, 
                            chrStartName: e.target.value,
                            chrEndName: e.target.value
                        })} 
                    >
                        {CISTROME_DBTOOLKIT_CHROMOSOMES.map(d => (
                            <option key={d} value={d}>
                                {d}
                            </option>
                        ))}
                    </select>
                    <div>Start Position</div>
                    <input
                        className="cistrome-api-text-input"
                        type="text"
                        placeholder="151690496"
                        value={latestIntervalParams.chrStartPos}
                        onChange={e => setLatestIntervalParams({ ...latestIntervalParams, chrStartPos: e.target.value })}
                    />
                    <div>End Position</div>
                    <input
                        className="cistrome-api-text-input"
                        type="text"
                        placeholder="152103274"
                        value={latestIntervalParams.chrEndPos}
                        onChange={e => setLatestIntervalParams({ ...latestIntervalParams, chrEndPos: e.target.value })}
                    />
                    {searchButton(isLatestIntervalParamsReady, () => runCistromeToolkitAPI(CISTROME_API_TYPES.INTERVAL))}
                </div>
                {/* Search By Gene */}
                <div 
                    className={'api-config-view'}
                    style={{ borderLeft: `4px solid ${CISTROME_API_COLORS.GENE}` }}
                >
                    <div className='api-title'>Search by Gene</div>
                    <div className='api-subtitle'>What factors regulate your gene?</div>
                    <div>
                        {'Half-decay Distance '}
                        <span 
                            style={{ position: 'relative', top: 3 }}
                            onMouseEnter={e => tooltipHelpInfo.distance(e)}
                            onMouseMove={e => tooltipHelpInfo.distance(e)}
                            onMouseLeave={() => destroyTooltip()}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                                viewBox={QUESTION_MARK.viewBox}>
                                <path fill="#666" d={QUESTION_MARK.path}/>
                            </svg>
                        </span>
                    </div>
                    <select
                        value={latestGeneParams.distance}
                        onChange={e => setLatestGeneParams({ ...latestGeneParams, distance: e.target.value })} 
                    >
                        {CISTROME_DBTOOLKIT_GENE_DISTANCE.map(d => (
                            <option key={d} value={d}>
                                {d}
                            </option>
                        ))}
                    </select>
                    <div>Gene</div>
                    <input
                        className="cistrome-api-text-input"
                        type="text"
                        placeholder="GAPDH or NM_001289746"
                        onChange={e => setLatestGeneParams({ ...latestGeneParams, gene: e.target.value })}
                    />
                    {searchButton(isLatestGeneParamsReady, () => runCistromeToolkitAPI(CISTROME_API_TYPES.GENE))}
                </div>
                {/* Search by Peak Set */}
                <div
                    className={'api-config-view'}
                    style={{ 
                        borderLeft: `4px solid ${CISTROME_API_COLORS.PEAKSET}`,
                        // visibility: 'hidden' // TODO: Show after we provide this functionality
                    }}
                >
                    <div className='api-title'>Search by Peak Set</div>
                    <div className='api-subtitle'>What factors have a significant binding overlap with your peak set?</div>
                    <div>Peak Number of Cistrome Sample to Use</div>
                    <select
                        value={latestPeaksetParams.tpeak[0]}
                        onChange={e => setLatestPeaksetParams({ ...latestPeaksetParams, tpeak: e.target.value })} 
                    >
                        {CISTROME_DBTOOLKIT_PEAK_NUMBERS.map(d => (
                            <option key={d} value={d}>
                                {d}
                            </option>
                        ))}
                    </select>
                    <div>
                        {'Bed File '}
                        <span 
                            style={{ position: 'relative', top: 3 }}
                            onMouseEnter={e => tooltipHelpInfo.bedfile(e)}
                            onMouseMove={e => tooltipHelpInfo.bedfile(e)}
                            onMouseLeave={() => destroyTooltip()}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                                viewBox={QUESTION_MARK.viewBox}>
                                <path fill="#666" d={QUESTION_MARK.path}/>
                            </svg>
                        </span>
                    </div>  
                    <input
                        className="cistrome-api-text-input"
                        type="file"
                        onChange={e => {
                            const bedFile = e.target.files[0];
                            if(bedFile) {
                                let reader = new FileReader();
                                reader.onload = () => {
                                    setLatestPeaksetParams({ ...latestPeaksetParams, bedFile: new Blob([reader.result]) });
                                };
                                reader.readAsArrayBuffer(bedFile);
                            }
                        }}
                    />
                    {searchButton(isLatestPeaksetParamsReady, () => runCistromeToolkitAPI(CISTROME_API_TYPES.PEAKSET))}
                </div>
            </>
        );
    });

    const listOfResultsRequested = useMemo(() => {
        return requestHistory.map((d, i) => {
            const { api } = d;
            if(api === CISTROME_API_TYPES.INTERVAL) {
                const { assembly, chrStartName, chrStartPos, chrEndPos } = d.parameter;
                return (
                    <div 
                        key={JSON.stringify(d.parameter) + i}
                        className={i === selectedRequestIndex ? "cisvis-api-result-selected" : "cisvis-api-result"}
                        style={{ borderLeft: `4px solid ${CISTROME_API_COLORS[api]}` }}
                        onClick={() => setSelectedRequestIndex(i)}
                    >
                        <div className='cisvis-api-parameter'>
                            <span>{"SPECIES"}</span>
                            <b>{assembly}</b>
                        </div>
                        <div className='cisvis-api-parameter'>
                            <span>{"INTERVAL"}</span>
                            <b>{`${chrStartName}:${chrStartPos.toLocaleString('en')}-${chrEndPos.toLocaleString('en') }`}</b>
                        </div>
                    </div>
                );
            } 
            else if(api === CISTROME_API_TYPES.GENE) {
                const { assembly, distance, gene } = d.parameter;
                return (
                    <div 
                        key={JSON.stringify(d.parameter) + i}
                        className={i === selectedRequestIndex ? "cisvis-api-result-selected" : "cisvis-api-result"}
                        style={{ borderLeft: `4px solid ${CISTROME_API_COLORS[api]}` }}
                        onClick={() => setSelectedRequestIndex(i)}
                    >
                        <div className='cisvis-api-parameter'>
                            <span>{"SPECIES"}</span>
                            <b>{assembly}</b>
                        </div>
                        <div className='cisvis-api-parameter'>
                            <span>{"GENE"}</span>
                            <b>{gene}</b>
                        </div>
                        <div className='cisvis-api-parameter'>
                            <span>{"DISTANCE"}</span>
                            <b>{distance}</b>
                        </div>
                    </div>
                );
            }
            else {
                // TODO: peak set
            }
        });
    }, [requestHistory, selectedRequestIndex]);
    
    return (
        <div className="cisvis-data-table-bg"
            style={{
                height: isVisible ? `${height}px` : 0
            }}
        >
            <div className='cisvis-data-table-header' ref={resizerRef}/>
            <div className="cisvis-data-table-container">
                <h4 className="cisvis-table-title">
                    <span style={{ position: 'relative', top: 5 }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"
                            viewBox={TABLE.viewBox}>
                            <path fill="#666" d={TABLE.path}/>
                        </svg>
                    </span>
                    {' CistromeDB Toolkit '}
                    <span style={{ position: 'relative', top: 6 }}>
                        <svg
                            className={'chw-button'}
                            style={{ color: "gray", background: "none" }}
                            onClick={() => window.open('http://dbtoolkit.cistrome.org')}
                            viewBox={EXTERNAL_LINK.viewBox}
                        >
                            <title>Open Cistrome DB Toolkit</title>
                            <path d={EXTERNAL_LINK.path} fill="currentColor"/>
                        </svg>
                    </span>
                </h4>
                <span className="cisvis-table-subtitle">
                    {requestStatus?.isLoading ? (
                        <span className="cisvis-progress-ring" />
                    ) : null}
                </span>
                <span style={{ 
                    verticalAlign: "middle", 
                    display: "inline-block", 
                    position: "absolute", 
                    right: 40,
                    top: 15
                }}>
                    <svg
                        className={'chw-button'}
                        style={{ color: "gray", background: "none" }}
                        onClick={() => setHeight(window.innerHeight)}
                        viewBox={EXPAND.viewBox}
                    >
                        <title>Expand Cistrome Toolkit</title>
                        <path d={EXPAND.path} fill="currentColor"/>
                    </svg>
                </span>
                <span style={{ 
                    verticalAlign: "middle", 
                    display: "inline-block", 
                    position: "absolute", 
                    right: 15, 
                    top: 15
                }}>
                    <svg
                        className={'chw-button'}
                        style={{ color: "gray", background: "none" }}
                        onClick={() => setIsVisible(false)}
                        viewBox={CLOSE.viewBox}
                    >
                        <title>Close Cistrome Toolkit</title>
                        <path d={CLOSE.path} fill="currentColor"/>
                    </svg>
                </span>
                <div className="cisvis-cistrome-toolkit-body">
                    <div className='cisvis-api-result-header'>API Configuration</div>
                    <div className='cisvis-api-result-header'>Request History</div>
                    <div className='cisvis-api-result-header'>Selected Result</div>
                    <div className="cisvis-api-request">
                        {APIConfigurationViews}
                    </div>
                    <div className="cisvis-api-result-list">
                        {listOfResultsRequested}
                    </div>
                    <DataTable 
                        columns={selectedRequestIndex !== undefined ? requestHistory[selectedRequestIndex].columns : []}
                        rows={selectedRequestIndex !== undefined ? requestHistory[selectedRequestIndex].rows : []}
                        selectedRows={selectedRowIndexes}
                        expoNotations={["Overlap Ratio", 'Regulatory Potential']}
                        onButton={() => {
                            // TODO: Change this to add a track based on actual data after we build DB.
                            onAddTrack(
                                'https://resgen.io/api/v1',
                                'Hygs6CEVR2mCnGlsHK93zQ',
                                'top'
                            );
                        }}
                    />
                </div>
            </div>
        </div>
    );
}