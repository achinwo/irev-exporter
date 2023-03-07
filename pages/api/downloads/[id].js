import path from 'path';

import url from 'url';
import _ from 'lodash';

import {archivePipe, fetchWardData, STATES} from "../../../src/utils";
import axios from "axios";

function resolvePuFilename(pu, opts={includeWard: false, includeWardAndLga: false}) {
    if (!pu.document?.url) return null;

    const fileName = _.trim(path.basename(url.parse(pu.document?.url).pathname));

    if(!fileName) return null;

    const puFileName = `${pu.pu_code.replaceAll('/', '_')}${path.extname(fileName)}`;

    if (!opts?.includeWard){
        return puFileName;
    }

    const wardDir = _.snakeCase(pu.ward.name.replaceAll('\"', '').replaceAll('\'', ''));
    return `${wardDir}/${puFileName}`;

    // if (!opts?.includeWardAndLga) {
    //     return wardFilePath;
    // }
    //
    // const lgaDir = _.snakeCase(pu.polling_unit.lga.name.replaceAll('\"', '').replaceAll('\'', ''));
    // return `${lgaDir}/${wardFilePath}`;
}

export default async function userHandler(req, res) {
    const { query, method } = req;

    console.log('QUery:', query);

    switch (method) {
        case 'GET':
            let dataSets = [];
            let state = null;
            let lga = null;

            if(query.stateId){
                const response = await axios.get(`https://storage.googleapis.com/joli-app-bucket/json-data/data_lgas_${query.stateId}.json`);
                const lgas = response.data.data;

                const lgaData = _.find(lgas, (l) => l.lga.lga_id === _.toInteger(query.id));

                lga = lgaData.lga;
                state = _.find(STATES, (s) => _.toInteger(query.stateId) === s.id);
                //console.log('resolved LGA:', lgaData);

                for (const ward of (lgaData?.wards || [])) {
                    let data = null;

                    try {
                        data = await fetchWardData(ward._id, {includePuData: false});
                    } catch (e) {
                        console.log('Unable to fetch:', ward);
                        data = await fetchWardData(ward._id, {includePuData: false});
                    }

                    if(!data) continue;

                    dataSets.push(data);
                }

            } else {
                let data = await fetchWardData(query.id, {includePuData: false});
                dataSets.push(data);

                state = _.find(STATES, (s) => _.first(data.lgas)?.state_id === s.id);
                lga = _.first(data.lgas);
            }

            let docUrls = {};

            for (const data of dataSets) {
                for (const pu of data.data) {
                    const fileName = resolvePuFilename(pu, {includeWard: !_.isEmpty(query.stateId)});

                    if(!fileName) continue;

                    docUrls[pu.document.url] = fileName;
                }
            }

            const fileName = `${_.snakeCase(state?.name || 'unknownstate')}_${_.snakeCase(lga?.name || 'unknownlga')}_${query.id}.zip`;

            res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
            res.setHeader('Content-Type', 'application/zip');

            await archivePipe(res, docUrls);

            //res.setHeader('Content-Length', );
            // res.writeHead(200, {
            //     'Content-Type': 'application/zip',
            //     'Content-Disposition': `attachment; filename=${fileName}`,
            //     //'Content-Length': stat.size
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