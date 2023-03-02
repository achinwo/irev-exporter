import fs from 'fs';
import path from 'path';
import stream from 'stream';
import {promisify} from 'util';
import fetch from 'node-fetch';

const pipeline = promisify(stream.pipeline);

export default async function handler(req, res) {
    // const response = await fetch(url);
    //
    // if (!response.ok) throw new Error(`unexpected response ${response.statusText}`);

    

    const zipPath = path.join(process.cwd(), 'pages/api', './Avenir-Font.zip');
    const stat = fs.statSync(zipPath);
    res.setHeader('Content-Disposition', 'attachment; filename=devices.zip');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Length', stat.size);
    res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename=Avenir-Font.zip',
        'Content-Length': stat.size
    });

    let fileStream = fs.createReadStream(zipPath);
    await pipeline(fileStream, res);
}