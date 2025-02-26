import React, { useEffect, useRef, useMemo } from 'react';
import aggregate from 'cube-core';
import embed from 'vega-embed';
import { globalRef } from '../global'
import { baseVis, commonVis } from '../queries/index';
import { EDITOR_URL } from '../constants';
import { IFieldMeta, IResizeMode, IRow } from '../interfaces';

export const geomTypeMap: {[key: string]: any} = {
  interval: 'bar',
  line: 'line',
  point: 'point',
  // density: 'rect'
  density: 'point'
}
export interface Specification {
  position?: string[];
  color?: string[];
  opacity?: string[];
  size?: string[];
  shape?: string[];
  geomType?: string[];
  facets?: string[];
  page?: string[];
  filter?: string[]
}
export interface BaseChartProps {
  defaultAggregated: boolean;
  defaultStack: boolean;
  aggregator: 'sum' | 'mean' | 'count';
  dataSource: IRow[];
  dimensions: string[];
  measures: string[];
  fieldFeatures: IFieldMeta[];
  schema: Specification;
  viewSize?: number;
  stepSize?: number;
  mode?: 'dist' | 'common';
  sizeMode?: IResizeMode;
  zoom?: boolean;
  debug?: boolean;
  width?: number;
  height?: number;
}

const BaseChart: React.FC<BaseChartProps> = (props) => {
  const {
    defaultAggregated,
    defaultStack,
    aggregator,
    dataSource = [],
    dimensions = [],
    measures = [],
    schema = {},
    fieldFeatures = [],
    viewSize,
    stepSize,
    mode = 'dist',
    zoom = false,
    debug = false,
    width,
    height,
    sizeMode = IResizeMode.auto
  } = props;

  const container = useRef<HTMLDivElement>(null);
  const aggregatedMeasures = useMemo(() => {
    return measures.map(mea => {
      return {
        op: aggregator,
        field: mea,
        as: `${mea}_${aggregator}`
      }
    })
  }, [measures, aggregator])

  let table = useMemo(() => {
    if (!defaultAggregated) {
      return dataSource
    }
    return aggregate({ dataSource, dimensions, measures, operator: aggregator, asFields: aggregatedMeasures.map(mea => mea.as)})
    // return simpleAggregate({dataSource, dimensions, measures, ops: measures.map(m => aggregator) }).map(r => ({
    //   ...r,
    //   []
    // }))
  }, [defaultAggregated, dataSource, dimensions, measures, aggregator, aggregatedMeasures])

  useEffect(() => {
    if (container.current !== null) {
      if (schema.position && schema.position.length > 0 && schema.geomType && schema.geomType.length > 0) {
        const params = {
          query: schema,
          dataSource: table,
          dimensions,
          measures,
          aggregatedMeasures,
          fieldFeatures,
          defaultAggregated,
          defaultStack,
          viewSize,
          stepSize,
          zoom,
          sizeMode,
          width,
          height
        }
        let spec = mode === 'dist' ? baseVis(params) : commonVis(params);
        globalRef.baseVisSpec = spec;
        const resultPromise = embed(container.current, spec, {
          mode: 'vega-lite',
          editorUrl: EDITOR_URL,
          actions: debug
        }).catch(err => {
          console.error('[VIS ERROR]', err)
        })
        return () => {
          resultPromise.then(res => {
            if (res) {
              res.finalize()
            }
          }).catch(console.error)
        }
      }
    }
  }, [schema,
    table,
    dimensions,
    measures,
    aggregatedMeasures,
    fieldFeatures,
    defaultAggregated,
    defaultStack,
    viewSize,
    stepSize,
    mode,
    zoom,
    debug,
    sizeMode,
    width,
    height])
  return <div ref={container}></div>
}

export default BaseChart;