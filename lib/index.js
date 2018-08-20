import fs from "fs";
import path from "path";
import os from 'os'
import config from "../config";
import request from "request";
import requestPromise from "request-promise";
import Progress from "cli-progress";
import {statusCodes} from './statusCodes'

const __continueRequest = function(length) {
  let downloaded = 0,
    progress = 0;

  this.on("data", chunk => {
    let c = chunk.length;
    downloaded += c;
    progress = ((100 * downloaded) / length).toFixed(2);
  });

  return this;
};

const handleStatusCode = code => {
  const result = statusCodes.filter(statusCode => statusCode.code === code)[0];

  if (code === 200) {
    return __continueRequest;
  }

  const { message } = result;
  return message;
};

export const resolve = url => {
  const options = {
    uri: config.resolveUri,
    qs: {
      client_id: config.client_id,
      url
    },
    json: true
  };

  return requestPromise(options);
};

export const writeStream = (ctx, title, reply) => {
  const REGX_CleanSpecial = /[`~!@#$%^&*()_|+\-=÷¿?;:'",.<>\{ }{\}\[\]\\\/]/gi
  const bar = new Progress.Bar({}, Progress.Presets.shades_classic)

  try {
    const now = Date.now().toString();
    const cwd = process.cwd();
    const replyObj = reply.toJSON();
    const { headers, statusCode } = replyObj;
    const fileName =
      title &&
      title
        .replace(REGX_CleanSpecial, "")
        .trim();
    const downloadsFolder = path.join(`${cwd}/downloads/`);
    const downloadsFolderExists = fs.existsSync(path.resolve(downloadsFolder))
    
    if(!downloadsFolderExists) {
      fs.mkdirSync(downloadsFolder)
    }

    const fileSize = parseInt(headers["content-length"], 10);
    const length = fileSize.toFixed(2);
    const result = handleStatusCode(+statusCode);

    if (result && typeof result === "string") {
      throw result;
    }

    let downloaded = 0;
    let progress;

    bar.start(length, 0)

    ctx.on('data', chunk => {
      downloaded += chunk.length;
      progress = ((100 * downloaded) / length).toFixed(2);
      bar.update(downloaded)
    });

    ctx.on('end', () => {
      bar.stop()
    })

    result
      .call(ctx, length)
      .pipe(fs.createWriteStream(path.join(downloadsFolder, `/${fileName}.mp3`), { flags: "w+" }));
  } catch (err) {
    throw new Error(err);
  }
};

export const download = async (streamUrl, title) => {

  const downloadPromise = new Promise(function(resolve, reject) {
    /*
        STREAMING THE RESPONSE with request-promise (e.g. .pipe(...)) is DISCOURAGED
        because Request-Promise would grow the memory footprint for large requests
        unnecessarily high. Use the original Request library for that.
      */

    const R = request({
      url: streamUrl,
      qs: {
        client_id: config.client_id
      }
    })
      .on("response", reply => writeStream(R, title, reply))
      .on("end", () => {
        resolve("completed");
      })
      .on("error", err => {
        reject(err)
      });
  });

  return downloadPromise
};
