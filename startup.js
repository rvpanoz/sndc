import config from "./config";
import { resolve, download } from "./lib";
import path from "path";
import prompts from "prompts";

global.appRoot = path.resolve(__dirname);

const start = async () => {
  const qs = await prompts({
    type: "text",
    name: "trackUrl",
    message: "Enter a soundcloud url",
    initial: config.initial || false
  });

  if (qs.trackUrl && qs.trackUrl !== "") {
    const trackData = await resolve(qs.trackUrl);
    const isStreamable = trackData && trackData.streamable;

    if (isStreamable && trackData.stream_url) {
      const { stream_url, title } = trackData;
      const result = await download(stream_url, title);

      if (result && result === "completed") {
        start();
      }
    }
  }
};

start();
