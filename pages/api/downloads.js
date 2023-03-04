import fs from 'fs';
import path from 'path';
import stream from 'stream';
import {promisify} from 'util';
import fetch from 'node-fetch';
import writeXlsxFile from 'write-excel-file/node'
import axios from "axios";
import {BASE_URL_KVDB} from "../../src/utils";

const pipeline = promisify(stream.pipeline);

export default async function handler(req, res) {

    //const zipPath = path.join(process.cwd(), 'pages/api', './Avenir-Font.zip');
    //const stat = fs.statSync(zipPath);

    res.setHeader('Content-Disposition', 'attachment; filename=devices.zip');
    res.setHeader('Content-Type', 'application/zip');
    //res.setHeader('Content-Length', stat.size);

    res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename=Avenir-Font.zip',
      //  'Content-Length': stat.size
    });

    const endpoint = `${BASE_URL_KVDB}/api/polling-data`;
    const response = await axios.get(endpoint);

    console.log('RESPONSE', response.data);

    const fileStream = await writeXlsxFile(endpoint.data);
    await pipeline(fileStream, res);
}