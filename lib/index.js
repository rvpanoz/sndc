import fs from 'fs'
import path from 'path'
import config from '../config'
import request from 'request'
import requestPromise from 'request-promise'

const __continueRequest = function(length) {
  let downloaded = 0, progress = 0;

  this.on('data', (chunk) => {
    let c = chunk.length
    downloaded += c
    progress = ((100 * downloaded) / length).toFixed(2)
    console.log(progress)
  })

  return this;
}

const statusCodes = [
  {code: 200, run: __continueRequest},
  {code: 401, message: 'Unauthorized request.'},
  {code: 404, message: 'Track not found'},
  {code: 500, message: 'Server Error'}]

const handleStatusCode = (code) => {
  const result = statusCodes.filter(statusCode=>statusCode.code===code)[0]
  const run = result && result.run
  return run && typeof run === 'function' ? run : result.message
}

export const resolve = (url) => {
    const options = {
        uri: config.resolveUri,
        qs: {
          client_id: config.client_id,
          url
        },
        json: true
      }
    
      return requestPromise(options)
}

export const writeStream = (ctx, title, reply) => {

  try {
    const now = Date.now().toString(), cwd = process.cwd();
    const replyObj = reply.toJSON()
    const {headers, statusCode} = replyObj
    const fileName = title && title.replace(/[`~!@#$%^&*()_|+\-=÷¿?;:'",.<>\{ }{\}\[\]\\\/]/gi, '').trim();
    const filePath = path.join(`${cwd}/downloads/${fileName}.mp3`)
  
    let fileSize = parseInt(headers['content-length'], 10)
      let len = fileSize.toFixed(2)
    
      const result = handleStatusCode(+statusCode)
  
      if (result && typeof result === 'string') {  
        throw result
      }
      
      result.call(ctx, len).pipe(fs.createWriteStream(filePath, {flags: 'w+'}))
  } catch(err) {
    throw new Error(err)
  }
  
}

export const download = (streamUrl) => {
    /*
      STREAMING THE RESPONSE with request-promise (e.g. .pipe(...)) is DISCOURAGED 
      because Request-Promise would grow the memory footprint for large requests 
      unnecessarily high. Use the original Request library for that.
    */
    return request({
      url: streamUrl,
      qs: {
        client_id: config.client_id
      }
    })
}