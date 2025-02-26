import React, { useState, useEffect, useMemo } from 'react';
import { SearchBox } from '@fluentui/react';
import Fuse, { FuseOptions } from 'fuse.js';
import { specification } from 'visual-insights';
import styled from 'styled-components';
import { observer } from 'mobx-react-lite';
import { ViewSpace } from '../../../service';
import BaseChart from "../../../visBuilder/vegaBase";
import { useGlobalStore } from '../../../store';
import { meta2fieldScores } from '../../../utils/transform';

const VisCard = styled.div`
  padding: 1rem;
  overflow-x: auto;
  margin: 1rem;
`

const PageLinkButton = styled.a`
  margin-right: 1rem;
  cursor: pointer;
  color: rgb(16, 110, 190);
`

const PAGE_SIZE = 4;
const PAGE_OFFSET = 2;

function usePageController (size: number) {
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    setCurrentPage(0)
  }, [size])
  const maxPageNumber = Math.ceil(size / PAGE_SIZE);
  const gotoPage = (num: number) => {
    let fixPageNum = (num + maxPageNumber) % maxPageNumber;
    setCurrentPage(fixPageNum)
  }

  const lastPage = () => {
    setCurrentPage(p => (p + maxPageNumber - 1) % maxPageNumber)
  }
  const nextPage = () => {
    setCurrentPage(p => (p + maxPageNumber + 1) % maxPageNumber)
  }
  const minVisPage = Math.max(currentPage - PAGE_OFFSET, 0);
  const maxVisPage = Math.min(currentPage + PAGE_OFFSET, maxPageNumber);
  const itemRange = useMemo(() => {
    return [currentPage * PAGE_SIZE, Math.min((currentPage + 1) * PAGE_SIZE, size)]
  }, [size, currentPage])
  const visPageRange = [...new Array(maxVisPage - minVisPage + 1)].map((n, i) => minVisPage + i)
  return {
    currentPage,
    visPageRange,
    itemRange,
    gotoPage,
    lastPage,
    nextPage
  }
}

const SearchPage: React.FC = props => {
  const { pipeLineStore } = useGlobalStore();
  const [targetViewSpaces, setTargetViewSpaces] = useState<ViewSpace[]>([]);

  const { viewSpaces, cookedDataset, fieldMetas } = pipeLineStore;

  const dimScores = useMemo(() => {
    return meta2fieldScores(cookedDataset.transedMetas)
  }, [cookedDataset.transedMetas])

  const fuse = useMemo(() => {
    const options: FuseOptions<ViewSpace> = {
      keys: [
        'dimensions',
        'measures'
      ]
    }
    return new Fuse(viewSpaces, options)
  }, [viewSpaces])
  const searchHandler = (newValue: string) => {
    const result: any[] = fuse.search(newValue)
    setTargetViewSpaces(result);
  }

  const {  currentPage, visPageRange, itemRange, gotoPage, lastPage, nextPage } = usePageController(targetViewSpaces.length);

  const specList = useMemo(() => {
    return targetViewSpaces.slice(itemRange[0], itemRange[1]).map(space => {
      const { dimensions, measures } = space;
      const fieldScores = dimScores.filter(field => {
        return dimensions.includes(field[0]) || measures.includes(field[0]);
      });
      let { schema } = specification(
        fieldScores,
        cookedDataset.transedData,
        dimensions,
        measures
      );
      return {
        schema,
        fieldFeatures: fieldScores.map(f => f[3]),
        aggData: cookedDataset.transedData,
        dimensions,
        measures
      }
    })
  }, [cookedDataset.transedData, targetViewSpaces, itemRange, dimScores])
  
  return (
    <div>
      <SearchBox
        placeholder="Search"
        onSearch={searchHandler}
        underlined={true}
      />
      <p className="state-description">{targetViewSpaces.length} results are found. current page is {currentPage + 1}</p>
      <div>
        <PageLinkButton onClick={lastPage}>Last Page</PageLinkButton>
        {
          targetViewSpaces.length > 0 && visPageRange.map(n => <PageLinkButton key={`page-btn-${n}`} onClick={() => { gotoPage(n) }}>{ n + 1 }</PageLinkButton>)
        }
        <PageLinkButton onClick={nextPage}>Next Page</PageLinkButton>
      </div>
      <div>
        {specList.map((spec, index) => (
          <VisCard key={`result-${index}`}>
            <BaseChart
              aggregator={"sum"}
              defaultAggregated={true}
              defaultStack={true}
              dimensions={spec.dimensions}
              measures={spec.measures}
              dataSource={spec.aggData}
              schema={spec.schema}
              fieldFeatures={fieldMetas}
            />
          </VisCard>
        ))}
      </div>
    </div>
  );
}

export default observer(SearchPage)
