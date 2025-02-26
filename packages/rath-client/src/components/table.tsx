import React from 'react';
import { DetailsList, SelectionMode } from '@fluentui/react';
import { BIField } from '../global';
import { IRow } from '../interfaces';
export interface DataTableProps {
  dataSource: IRow[],
  fields: BIField[]
}
const DataTable: React.FC<DataTableProps> = (props) => {
  const { dataSource = [], fields = [] } = props;
  let columns = fields.map(field => {
    return {
      key: field.name,
      name: field.name,
      fieldName: field.name,
      minWidth: 70,
      maxHeight: 90
    }
  });

  return <div style={{maxHeight: 400, overflow: 'auto'}}>
    <DetailsList items={dataSource} columns={columns} selectionMode={SelectionMode.none} />
  </div>
}

export default DataTable;