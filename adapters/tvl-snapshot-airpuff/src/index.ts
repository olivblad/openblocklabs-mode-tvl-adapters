import BigNumber from 'bignumber.js';
import { CHAINS, PROTOCOLS, AMM_TYPES } from './sdk/config';
// import { getLPValueByUserAndPoolFromPositions, getPositionAtBlock, getPositionDetailsFromPosition, getPositionsForAddressByPoolAtBlock } from "./sdk/subgraphDetails";
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

import { promisify } from 'util';
import stream from 'stream';
import csv from 'csv-parser';
import fs from 'fs';
import { format } from 'fast-csv';
import { write } from 'fast-csv';
import { getLpTokenPriceUSD } from './sdk/price';
import { getAllPositionsAtBlock } from './sdk/vaultDetails';
import path from 'path';

//Uncomment the following lines to test the getPositionAtBlock function

// const position = getPositionAtBlock(
//         0, // block number 0 for latest block
//         2, // position id
//         CHAINS.MODE, // chain id
//         PROTOCOLS.SUPSWAP, // protocol
//         AMM_TYPES.UNISWAPV3 // amm type
//     );
// position.then((position) => {
//     // print response
//     const result = getPositionDetailsFromPosition(position);
//     console.log(`${JSON.stringify(result,null, 4)}
//     `)
// });

interface LPValueDetails {
  pool: string;
  lpValue: string;
}

interface UserLPData {
  totalLP: string;
  pools: LPValueDetails[];
}

// Define an object type that can be indexed with string keys, where each key points to a UserLPData object
interface OutputData {
  [key: string]: UserLPData;
}

interface CSVRow {
  user: string;
  vault: string;
  block: number;
  lpvalue: number;
  position: number;
  lpvalueusd: number;
}

const pipeline = promisify(stream.pipeline);

// Assuming you have the following functions and constants already defined
// getPositionsForAddressByPoolAtBlock, CHAINS, PROTOCOLS, AMM_TYPES, getPositionDetailsFromPosition, getLPValueByUserAndPoolFromPositions, BigNumber

const readBlocksFromCSV = async (filePath: string): Promise<number[]> => {
  return new Promise((resolve, reject) => {
    const blocks: number[] = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        for (let key in row) {
          const blockNumber = parseInt(row[key]);
          if (!isNaN(blockNumber)) { // Ensure it's a valid number before pushing
            blocks.push(blockNumber);
          }
        }
      })
      .on('end', () => {
        console.log('CSV file successfully processed.');
        resolve(blocks); // Resolve the promise with the blocks array
      })
      .on('error', (error) => {
        reject(error); // Reject the promise if an error occurs
      });
  });
};

const getData = async () => {
  const csvFilePath = path.resolve(__dirname, '../../../../data/mode_airpuff_hourly_blocks.csv');
  const snapshotBlocks = await readBlocksFromCSV(csvFilePath);

  const csvRows: CSVRow[] = [];

  for (let block of snapshotBlocks) {
    const positions = await getAllPositionsAtBlock(PROTOCOLS.AIRPUFF, block);

    console.log(`Block: ${block}`);
    console.log('Positions: ', positions.length);

    const positionsRow: CSVRow[] = positions.map((p) => {
      return {
        user: p.user,
        vault: p.vault,
        block: block,
        position: p.position,
        lpvalue: p.lpValue,
        lpvalueusd: p.lpValueUsd,
      } as CSVRow;
    });

    csvRows.push(...positionsRow);
    // // Assuming this part of the logic remains the same
    // let positionsWithUSDValue = positions.map(getPositionDetailsFromPosition);
    // let lpValueByUsers = getLPValueByUserAndPoolFromPositions(
    //   positionsWithUSDValue
    // );

    // lpValueByUsers.forEach((value, key) => {
    //   let positionIndex = 0; // Define how you track position index
    //   value.forEach((lpValue, poolKey) => {
    //     const lpValueStr = lpValue.toString();
    //     // Accumulate CSV row data
    //     csvRows.push({
    //       user: key,
    //       pool: poolKey,
    //       block,
    //       position: positions.length, // Adjust if you have a specific way to identify positions
    //       lpvalue: lpValueStr,
    //     });
    //   });
    // });
  }

  //Write the CSV output to a file
  const outputPath = path.resolve(__dirname, '../../../../data/mode_airpuff_tvl_snapshot.csv');
  const ws = fs.createWriteStream(outputPath);
  write(csvRows, { headers: true })
    .pipe(ws)
    .on('finish', () => {
      console.log('CSV file has been written.');
    });
};

getData().then(() => {
  console.log('Done');
});
// getPrice(new BigNumber('1579427897588720602142863095414958'), 6, 18); //Uniswap
// getPrice(new BigNumber('3968729022398277600000000'), 18, 6); //SupSwap
