const axios = require('axios');
const protobuf = require('protobufjs');
const { pRateLimit } = require('p-ratelimit');
require('dotenv').config();

const { TFNSW_API_KEY } = process.env;

const rateLimit = pRateLimit({
  interval: 1000,
  rate: 5,
  concurrency: 5
});

const tripUpdateOptions = {
  url: 'https://api.transport.nsw.gov.au/v1/gtfs/realtime',
  headers: {
    Authorization: TFNSW_API_KEY
  }
};

const vehicleLocationOptions = {
  url: 'https://api.transport.nsw.gov.au/v1/gtfs/vehiclepos',
  headers: {
    Authorization: TFNSW_API_KEY
  }
};

const modes = [
  'metro',
  'buses',
  'ferries',
  'lightrail/innerwest',
  'lightrail/newcastle',
  'nswtrains',
  'sydneytrains'
];

const getRealtimeTripUpdate = async (mode, FeedMessage) => {
  const res = await rateLimit(() =>
    axios.get(`${tripUpdateOptions.url}/${mode}`, {
      headers: tripUpdateOptions.headers,
      responseType: 'arraybuffer'
    })
  );
  const data = new Uint8Array(res.data);
  const feed = FeedMessage.decode(data);
  return feed;
};
const getRealtimeVehiclePositions = async (mode, FeedMessage) => {
  const res = await rateLimit(() =>
    axios.get(`${vehicleLocationOptions.url}/${mode}`, {
      headers: vehicleLocationOptions.headers,
      responseType: 'arraybuffer'
    })
  );
  const data = new Uint8Array(res.data);
  const feed = FeedMessage.decode(data);
  return feed;
};

const start = async () => {
  const root = await protobuf.load('tfnsw-gtfs-realtime.proto');
  const FeedMessage = root.lookupType('transit_realtime.FeedMessage');
  for (const mode of modes) {
    const tripUpdate = await getRealtimeTripUpdate(mode, FeedMessage);
    const vehicleUpdate = await getRealtimeVehiclePositions(mode, FeedMessage);

    console.log(tripUpdate.entity[0]);
    console.log(vehicleUpdate.entity[0]);
  }
};

(async () => {
  await start();
})();
