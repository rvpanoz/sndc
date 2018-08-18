import config from './config'
import {resolve, download, writeStream} from './lib'
import path from 'path'
import prompts from 'prompts'

global.appRoot = path.resolve(__dirname);

const start = async () => {
    const qs = await prompts({
        type: 'text',
        name: 'trackUrl',
        message: 'Enter a soundcloud url',
        initial: 'https://soundcloud.com/robot-heart/timujin-robot-heart-10-year-anniversary-burning-man-2018'
    });

    if(qs.trackUrl) {
        const trackData = await resolve(qs.trackUrl)
        const isStreamable = trackData && trackData.streamable

        if(isStreamable && trackData.stream_url) {
            const stream = download(trackData.stream_url)
            const {title} = trackData
            stream.on('response', (reply) => {
                writeStream(stream, title, reply)
            })
            .on('end', () => {
                // process.exit()
                start() 
            })
            .on('error', (err) => {
                throw err
            })
        }
    }
}

start()