import React from "react";
import { IconButton, Stack } from '@fluentui/react';
import VisDescription from "../../../plugins/visSummary/description";
import BaseChart from "../../../visBuilder/vegaBase";
import { Subspace } from "../../../service";
import { IFieldMeta } from "../../../interfaces";
import useDigDimension, { DigDimensionProps } from "./digDimension";

function isDimensionEqual(dimensions1: string[], dimensions2: string[]) {
  if (dimensions1.length !== dimensions2.length) {
    return false;
  }
  return dimensions1.every(dim1 => {
    return dimensions2.includes(dim1);
  });
}
interface AssociationProps {
  digDimensionProps: DigDimensionProps;
  subspaceList: Subspace[];
  fieldMetas: IFieldMeta[];
  onSelectView: (index: number) => void
}
const Association: React.FC<AssociationProps> = props => {
  const { digDimensionProps, subspaceList, onSelectView, fieldMetas } = props;
  const { dataSource, visualConfig, fieldScores } = digDimensionProps;
  const relatedCharts = useDigDimension(digDimensionProps);

  return (
    <div>
      <div className="ms-Grid">
        {relatedCharts.map((view, i) => {
          let currentSpace = subspaceList.find(space => {
            return isDimensionEqual(space.dimensions, view.dimensions);
          });
          return (
            <div key={`associate-row-${i}`}
              className="ms-Grid-row"
              dir="ltr"
              style={{
                border: "solid 1px #bfbfbf",
                margin: "1em",
                padding: "1em"
              }}
            >
              <div
                className="ms-Grid-col ms-sm6 ms-md8 ms-lg9"
                style={{ overflow: 'auto' }}
              >
                <BaseChart
                  aggregator={visualConfig.aggregator}
                  defaultAggregated={view.schema.geomType && view.schema.geomType.includes("point") ? false : true}
                  defaultStack={visualConfig.defaultStack}
                  dimensions={view.dimensions}
                  measures={view.measures}
                  dataSource={dataSource}
                  schema={view.schema}
                  fieldFeatures={fieldMetas}
                />
              </div>
              <div
                className="ms-Grid-col ms-sm6 ms-md4 ms-lg3"
                style={{ fontSize: 14, color: "#8a8886", overflow: "auto" }}
              >
                <div>
                  
                  <Stack tokens={{ childrenGap: 8 }} horizontal>
                    <IconButton iconProps={{ iconName: 'Lightbulb' }} title="Interested" onClick={() => {
                      onSelectView(view.index)
                    }} />
                  </Stack>
                </div>
                {currentSpace && (
                  <VisDescription
                    dimensions={view.dimensions}
                    measures={view.measures}
                    dimScores={fieldScores}
                    space={currentSpace}
                    spaceList={subspaceList}
                    schema={view.schema}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Association;
