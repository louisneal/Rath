import { toJS } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { Spinner } from '@fluentui/react';
import { useGlobalStore } from '../../../store';
import { getTestServerAPI } from '../../../service';

const InsightDesc = styled.div`
    margin: 4px 12px 0px 12px;
    padding: 12px;
    border: 1px solid #95de64;
    font-size: 12px;
    max-width: 500px;
    overflow-y: auto;
    .insight-header{
        display: flex;
        font-size: 14px;
        line-height: 14px;
        margin-bottom: 8px;
        .type-title{

        }
        .type-score{
            margin-left: 1em;
            padding-left: 1em;
            border-left: 1px solid #bfbfbf;
        }
    }
    .type-label{
        background-color: green;
        color: white;
        display: inline-block;
        padding: 0px 1em;
        border-radius: 8px;
        font-size: 12px;
    }
`

const Narrative: React.FC = props => {
    const { megaAutoStore, langStore } = useGlobalStore();
    const { pageIndex, insightSpaces, dataSource, fieldMetas, nlgThreshold } = megaAutoStore;
    const [explainLoading, setExplainLoading] = useState(false);
    const requestId = useRef<number>(0);
    const fms = toJS(fieldMetas);
    const fieldsInViz = useMemo(() => {
        return insightSpaces[pageIndex] ? [...insightSpaces[pageIndex].dimensions, ...insightSpaces[pageIndex].measures].map(fid => fms.find(fm => fm.fid === fid)) : []
    }, [insightSpaces, pageIndex, fms]);
    const [viewInfo, setViewInfo] = useState<any[]>([])
    useEffect(() => {
        setViewInfo([])
        setExplainLoading(false);
    }, [pageIndex])
    useEffect(() => {
        setExplainLoading(true)
        requestId.current++;
        let rid = requestId.current;
        fetch(getTestServerAPI('insight'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    dataSource,
                    fields: fieldsInViz,
                    aggrType: 'sum',
                    langType: langStore.lang
                })
            })
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    rid === requestId.current && setViewInfo(res.data)
                } else {
                    throw new Error(res.message)
                }
            }).catch(err => {
                console.error(err);
                setViewInfo([])
            }).finally(() => {
                setExplainLoading(false)
            })
    }, [pageIndex, dataSource, fieldsInViz, langStore.lang])
    const explains = useMemo<any[]>(() => {
        if (!viewInfo || viewInfo.length === 0) return []
        return Object.keys(viewInfo[0]).filter((k: string) => viewInfo[0][k].score > 0).map((k: string) => ({
            score: viewInfo[0][k].score,
            type: k,
            explain: viewInfo[0][k].para.explain
        }));
    }, [viewInfo])
    return <div>
        {
            !explainLoading && explains.filter(ex => ex.score > nlgThreshold).map(ex => <InsightDesc key={ex.type}>
                <div className="insight-header">
                    <div className="type-title">{ex.type}</div>
                    <div className="type-score">{(ex.score * 100).toFixed(1)} %</div>
                </div>
                {/* <div className="type-label">{ex.type}</div> */}
                <p>{ex.explain}</p>
            </InsightDesc>)
        }
        {
            explainLoading && <div>
                <Spinner label="explain loading..." />
            </div>
        }
        {/* <ReactJson src={viewInfo} /> */}
        {/* {JSON.stringify(viewInfo)} */}
    </div>
}

export default observer(Narrative);