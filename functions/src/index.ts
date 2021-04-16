import * as functions from "firebase-functions";
import * as imagemagick from "imagemagick";
import nodeGeocoder, { Options } from "node-geocoder";

// import { Storage } from "@google-cloud/storage";
// const storage = new Storage();
// const bucket = storage.bucket("gs://notsoserious-c6690.appspot.com");

// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

interface Location {
  lat: number;
  lon: number;
}

export const helloWorld = functions.https.onRequest(
    async (request, response) => {
      functions.logger.info("Hello logs!", { structuredData: true });
      response.send("Hello, World!");
    }
);

export const getImageLocation = functions.https.onRequest(
    async (request, response) => {
      try {
        const { url } = request.query;
        if (!url) {
          response.status(422).send("No image URL is provided");
          return;
        }
        const location = await getLocationMetaData((url as unknown) as string);
        response.send(location);
      } catch (e) {
        functions.logger.error(e);
      }
    }
);

export const getImageCity = functions.https.onRequest(
    async (request, response) => {
      try {
        const { url } = request.query;
        if (!url) {
          response.status(422).send("No image URL is provided");
          return;
        }
        const { lat, lon } = await getLocationMetaData(
        (url as unknown) as string
        );
        const city = await getCityNameByLocation(lat, lon);
        response.send(city);
      } catch (e) {
        functions.logger.error(e);
      }
    }
);

const getLocationMetaData = (source: string): Promise<Location> => {
  return new Promise((resolve, reject) => {
    imagemagick.readMetadata(source, (error: Error, meta) => {
      if (error) {
        reject(error);
      }

      const lat = meta.exif.gpsLatitude.split(",");
      const lon = meta.exif.gpsLongitude.split(",");
      const parsedLat = parseGPSLocation(lat);
      const parsedLon = parseGPSLocation(lon);

      resolve({ lat: parsedLat, lon: parsedLon });
    });
  });
};

const parseGPSLocation = (values: string[]) => {
  const parsedValues = values.map((value) => {
    const [numerator, denominator] = value.split("/");
    return parseInt(numerator) / parseInt(denominator);
  });
  const [degrees, minutes, seconds] = parsedValues;
  const value = degrees + minutes / 60 + seconds / 3600;

  return value;
};

const getCityNameByLocation = (lat: number, lon: number) => {
  const options = {
    provider: "yandex",
    httpAdapter: "https",
    apiKey: "9e282b5f-f010-4230-a264-56d192576794",
    formatter: "json",
  };
  const geocoder = nodeGeocoder(options as Options);

  return new Promise((resolve, reject) => {
    geocoder.reverse({ lat, lon }, (error, res) => {
      if (error) reject(error);

      const cityName = res[0].city;
      resolve(cityName);
    });
  });
};
