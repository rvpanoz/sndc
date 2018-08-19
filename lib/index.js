import fs from "fs";
import path from "path";
import os from 'os'
import config from "../config";
import request from "request";
import requestPromise from "request-promise";
import ProgressBar from "progress";

let length = 0;

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

const statusCodes = [
  { code: 401, message: "Unauthorized request." },
  { code: 404, message: "Track not found" },
  { code: 500, message: "Server Error" }
];


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
    const filePath = path.join(`${cwd}/downloads/${fileName}.mp3`);
    const fileSize = parseInt(headers["content-length"], 10);
    const length = fileSize.toFixed(2);

    const bar = new ProgressBar(" downloading [:bar]", {
      total: 10,
      complete: "=",
      incomplete: " ",
      width: 20
    });

    const result = handleStatusCode(+statusCode);

    if (result && typeof result === "string") {
      throw result;
    }

    let downloaded = 0;
    let progress;

    ctx.on("data", chunk => {
      downloaded += chunk.length;
      progress = ((100 * downloaded) / length).toFixed(2);
      // bar.tick(downloaded);
    });

    result
      .call(ctx, length)
      .pipe(fs.createWriteStream(filePath, { flags: "w+" }));
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