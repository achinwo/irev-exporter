import {fetchWardData} from "../pus/[id]";
import fs from "fs";
import path from 'path';
import stream from 'stream';
import {promisify} from 'util';
import fetch from 'node-fetch';
import url from 'url';
import _ from 'lodash';
import archiver from 'archiver';
const pipeline = promisify(stream.pipeline);

export default async function userHandler(req, res) {
    const { query, method } = req;

    switch (method) {
        case 'GET':
            let data = await fetchWardData(query.id, {includePuData: false});

            const docUrls = _.filter(data.data.map(pu => pu.document?.url), (v) => v);
            console.log('The button was clicked', docUrls);

            let proms = []
            for (const docUrl of docUrls) {
                proms.push(fetch(docUrl));
            }

            const fileName = `output_${query.id}.zip`;
            const destPath = path.join(process.cwd(), fileName);

            res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
            res.setHeader('Content-Type', 'application/zip');
            //res.setHeader('Content-Length', );
            res.writeHead(200, {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename=${fileName}`,
                //'Content-Length': stat.size
            });

            //const output = new MemoryStream([], {writable: true, readable: true});
            const archive = archiver('zip');

            // output.on('close', async function() {
            //     console.log('archiver has been finalized and the output file descriptor has closed.');
            //     // const stat = fs.statSync(destPath);
            //     //
            //     //
            //     //readable
            //     // await pipeline(fileStream, res);
            //
            //
            // });
            //
            // output.on('error', function(err) {
            //     console.log(err.stack);
            //     return
            // });

            archive.pipe(res);

            for (const resp of await Promise.all(proms)) {

                const parsed = url.parse(resp.url);
                const fileName = path.basename(parsed.pathname);

                if(!_.trim(fileName)) continue;

                archive.append(resp.body, {name: fileName});
            }

            const r = await archive.finalize();


            console.log('Finalized', r);
            //     function(err, bytes) {
            //     if (err) {
            //         console.log(err.stack);
            //         return;
            //     }
            //
            //     console.log(bytes + ' total bytes');
            //     output.end();
            // });

            break
        default:
            res.setHeader('Allow', ['GET', 'PUT'])
            res.status(405).end(`Method ${method} Not Allowed`)
    }
}

export const config = {
    api: {
        responseLimit: '100mb',
    },
}