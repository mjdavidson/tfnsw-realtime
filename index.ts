import axios from 'axios';
import protobuf from 'protobufjs';
import { pRateLimit } from 'p-ratelimit';

// populate process.env with api key
import dotenv from 'dotenv';
dotenv.config();

import { PositionFeedMessage, UpdateFeedMessage } from './types';

const { TFNSW_API_KEY } = process.env;
console.log(process.env.TFNSW_API_KEY);
// start a rate limiter so that we don't exceed our limit
const rateLimit = pRateLimit({
  interval: 1000,
  rate: 5,
  concurrency: 5
});

// options for trip updates with apikey added
const tripUpdateOptions = {
  url: 'https://api.transport.nsw.gov.au/v1/gtfs/realtime',
  headers: {
    Authorization: TFNSW_API_KEY
  }
};

// options for vehicle position updates with apikey added
const vehicleLocationOptions = {
  url: 'https://api.transport.nsw.gov.au/v1/gtfs/vehiclepos',
  headers: {
    Authorization: TFNSW_API_KEY
  }
};

// list of all trip modes
const modes = [
  'metro',
  'buses',
  'ferries',
  'lightrail/innerwest',
  'lightrail/newcastle',
  'nswtrains',
  'sydneytrains'
];

/**
 * function to fetch and decode trip update
 * @param {*} mode mode of transport
 * @param {*} FeedMessage protobuf decoder
 * @returns FeedMessage
 */
const getRealtimeTripUpdate = async (
  mode: string,
  FeedMessage: protobuf.Type
) => {
  const res = await rateLimit(() =>
    axios.get(`${tripUpdateOptions.url}/${mode}`, {
      headers: tripUpdateOptions.headers,
      responseType: 'arraybuffer'
    })
  );
  const data = new Uint8Array(res.data);
  const feed = (FeedMessage.decode(data) as unknown) as UpdateFeedMessage;
  return feed;
};

/**
 * function to fetch and decode vehicle positions
 * @param {*} mode mode of transport
 * @param {*} FeedMessage protobuf decoder
 * @returns FeedMessage
 */
const getRealtimeVehiclePositions = async (
  mode: string,
  FeedMessage: protobuf.Type
) => {
  const res = await rateLimit(() =>
    axios.get(`${vehicleLocationOptions.url}/${mode}`, {
      headers: vehicleLocationOptions.headers,
      responseType: 'arraybuffer'
    })
  );
  const data = new Uint8Array(res.data);
  const feed = (FeedMessage.decode(data) as unknown) as PositionFeedMessage;
  return feed;
};

const start = async () => {
  // load the proto file
  const root = await protobuf.load('tfnsw-gtfs-realtime.proto');
  // get the feed message root
  const FeedMessage = root.lookupType('transit_realtime.FeedMessage');

  // iterate throught the modes and run each function on each mode
  for (const mode of modes) {
    const tripUpdate = await getRealtimeTripUpdate(mode, FeedMessage);
    const vehicleUpdate = await getRealtimeVehiclePositions(mode, FeedMessage);

    // print the first of each result
    console.log(tripUpdate.entity[0]);
    console.log(vehicleUpdate.entity[0]);
  }
};

(async () => {
  await start();
})();
