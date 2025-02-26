import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import intl from 'react-intl-universal';
import { observer } from 'mobx-react-lite';
import { InsightSpace, DefaultIWorker, specification } from 'visual-insights';
import { PrimaryButton, SpinButton, Slider, ProgressIndicator, Position } from '@fluentui/react';
import { getInsightViewSpace } from '../../service';
import PreferencePanel, { PreferencePanelConfig } from '../../components/preference';
import BaseChart from '../../visBuilder/vegaBase';
import { useComposeState } from '../../hooks/index';
import SimpleTick from '../../components/simpleTick';
import RadarChart from '../../components/radarChart';
import { useGlobalStore } from '../../store';
import { meta2fieldScores } from '../../utils/transform';

const Tag = styled.div`
    display: inline-block;
    padding: 0.1em 0.3em;
    margin: 0.2em;
    border-radius: 3px;
    color: #fff;
    font-size: 12px;
    background-color: ${(props) => props.color};
`;

const DashBoard = styled.div`
    display: flex;
    div.left {
        flex-basis: 300px;
        flex-grow: 1;
        border-right: 1px solid #f0f0f0;
    }
    div.right {
        margin-left: 1em;
        flex-grow: 8;
    }
    padding: 1em 0em;
`;

const ColorMap: {
    [key: string]: string;
} = {
    [DefaultIWorker.outlier]: '#cf1322',
    [DefaultIWorker.trend]: '#7cb305',
    general: '#08979c',
    [DefaultIWorker.cluster]: '#c41d7f',
};

function arrEqual(arr1: any[], arr2: any[]): boolean {
    if (arr1.length !== arr2.length) {
        return false;
    }
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) {
            return false;
        }
    }
    return true;
}

const DevPage: React.FC = (props) => {
    const [insightViewSpace, setInsightViewSpace] = useState<InsightSpace[]>([]);
    const [sigThreshold, setSigThreshold] = useState<number>(0.6);
    const [loading, setLoading] = useState<boolean>(false);
    const [visualConfig, setVisualConfig] = useState<PreferencePanelConfig>({
        aggregator: 'sum',
        defaultAggregated: true,
        defaultStack: true,
    });
    const [pageStatus, setPageStatus] = useComposeState<{ show: { configPanel: boolean } }>({
        show: {
            configPanel: false,
        },
    });
    const { pipeLineStore } = useGlobalStore();
    const { cookedDataset, TOP_K_DIM_PERCENT } = pipeLineStore;
    const [chartIndex, setChartIndex] = useState(0);
    const { transedData: cookedDataSource, transedMetas, dimMetas, meaMetas } = cookedDataset;

    const dimScores = useMemo(() => {
        return meta2fieldScores(transedMetas);
    }, [transedMetas]);
    const cookedDimensions = dimMetas.map((f) => f.fid);
    const cookedMeasures = meaMetas.map((f) => f.fid);
    const viewSpaceList = useMemo(() => {
        return insightViewSpace.filter((s) => s.significance >= sigThreshold);
    }, [insightViewSpace, sigThreshold]);

    const dataView = useMemo(() => {
        if (viewSpaceList.length === 0) return null;
        const { dimensions, measures } = viewSpaceList[chartIndex];
        const fieldScores = dimScores.filter((field) => {
            return dimensions.includes(field[0]) || measures.includes(field[0]);
        });
        let { schema } = specification(fieldScores, cookedDataSource, dimensions, measures);
        return {
            schema,
            fieldFeatures: fieldScores.map((f) => f[3]),
            dimensions,
            measures,
        };
    }, [viewSpaceList, chartIndex, cookedDataSource, dimScores]);
    const relatedViews = useMemo<InsightSpace[]>(() => {
        if (dataView !== null) {
            const { dimensions, measures } = dataView;
            return insightViewSpace.filter((f) => {
                if (arrEqual(dimensions, f.dimensions) && arrEqual(measures, f.measures)) {
                    return true;
                }
                return false;
            });
        }
        return [];
    }, [insightViewSpace, dataView]);

    useEffect(() => {
        if (dataView === null) return;
        const { schema } = dataView;
        if (schema.geomType && (schema.geomType.includes('point') || schema.geomType.includes('density'))) {
            setVisualConfig((config) => {
                return {
                    ...config,
                    defaultAggregated: false,
                };
            });
        } else {
            setVisualConfig((config) => {
                return {
                    ...config,
                    defaultAggregated: true,
                };
            });
        }
    }, [dataView]);
    return (
        <div className="content-container">
            <PreferencePanel
                show={pageStatus.show.configPanel}
                config={visualConfig}
                onUpdateConfig={(config) => {
                    setVisualConfig(config);
                    setPageStatus((draft) => {
                        draft.show.configPanel = false;
                    });
                }}
                onClose={() => {
                    setPageStatus((draft) => {
                        draft.show.configPanel = false;
                    });
                }}
            />
            {cookedDataSource.length > 0 && (
                <div className="card">
                    <PrimaryButton
                        text={intl.get('explainer.insightButton')}
                        onClick={() => {
                            setLoading(true);
                            getInsightViewSpace(
                                cookedDataSource,
                                cookedDimensions.slice(0, cookedDimensions.length * TOP_K_DIM_PERCENT),
                                cookedMeasures
                            ).then((res) => {
                                setInsightViewSpace(res);
                                setLoading(false);
                            });
                        }}
                    />
                    {loading && <ProgressIndicator description="generating dashboard" />}

                    <DashBoard>
                        <div className="left">
                            <SimpleTick
                                x="type"
                                y="significance"
                                dataSource={insightViewSpace}
                                threshold={sigThreshold}
                            />
                            <Slider
                                label={intl.get('explainer.sigThreshold')}
                                max={100}
                                value={sigThreshold * 100}
                                valueFormat={(value: number) => `${value}%`}
                                showValue={true}
                                onChange={(value: number) => {
                                    setSigThreshold(value / 100);
                                    setChartIndex(0);
                                }}
                            />
                            <p className="state-description">
                                {intl.get('explainer.desc', {
                                    num: viewSpaceList.length,
                                    threshold: (sigThreshold * 100).toFixed(2),
                                })}
                            </p>
                        </div>
                        <div className="right">
                            <div style={{ width: '280px' }}>
                                <SpinButton
                                    label={intl.get('explainer.currentIndex')}
                                    value={(chartIndex + 1).toString()}
                                    min={0}
                                    max={viewSpaceList.length}
                                    step={1}
                                    iconProps={{ iconName: 'Search' }}
                                    labelPosition={Position.start}
                                    // tslint:disable:jsx-no-lambda
                                    onValidate={(value: string) => {
                                        setChartIndex((Number(value) - 1) % viewSpaceList.length);
                                    }}
                                    onIncrement={() => {
                                        setChartIndex((chartIndex + 1) % viewSpaceList.length);
                                    }}
                                    onDecrement={() => {
                                        setChartIndex((chartIndex - 1 + viewSpaceList.length) % viewSpaceList.length);
                                    }}
                                    incrementButtonAriaLabel={'Increase value by 1'}
                                    decrementButtonAriaLabel={'Decrease value by 1'}
                                />
                            </div>
                            <div style={{ display: 'flex', padding: '1em' }}>
                                <RadarChart
                                    dataSource={relatedViews}
                                    threshold={sigThreshold}
                                    keyField="type"
                                    valueField="significance"
                                />
                                <div>
                                    {relatedViews.length > 0 &&
                                        relatedViews
                                            .filter((view) => view.significance >= sigThreshold)
                                            .map((view, i) => (
                                                <Tag key={i} color={ColorMap[view.type as string]}>
                                                    {intl.get(`explainer.insightTypes.${view.type}`)}
                                                </Tag>
                                            ))}
                                    {viewSpaceList[chartIndex] && (
                                        <p className="state-description">
                                            {intl.get('explainer.explainTemp.viewDesc', {
                                                dimensions: viewSpaceList[chartIndex].dimensions.join(', '),
                                                measures: viewSpaceList[chartIndex].measures.join(', '),
                                            })}
                                            <br />
                                            {intl.get('explainer.explainTemp.sig', {
                                                sig: (viewSpaceList[chartIndex].significance * 100).toFixed(2),
                                                itype: viewSpaceList[chartIndex].type,
                                            })}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div></div>
                        </div>
                    </DashBoard>
                    {viewSpaceList.length > 0 && dataView !== null && (
                        <div>
                            <BaseChart
                                aggregator={visualConfig.aggregator}
                                defaultAggregated={visualConfig.defaultAggregated}
                                defaultStack={visualConfig.defaultStack}
                                dimensions={dataView.dimensions}
                                measures={dataView.measures}
                                dataSource={cookedDataSource}
                                schema={dataView.schema}
                                fieldFeatures={pipeLineStore.fieldMetas}
                            />
                        </div>
                    )}
                </div>
            )}
            {cookedDataSource.length === 0 && (
                <div className="card">
                    <p>{intl.get('explainer.notReadyTip')}</p>
                </div>
            )}
        </div>
    );
};

export default observer(DevPage);
