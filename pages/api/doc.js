import url from 'url';
import axios from "axios";
//import pdf2img from "pdf-img-convert";
import path from 'path';

export default async function handler(req, res) {
    const {method, query} = req;

    switch (method) {
        case 'GET':
            const docUrl = decodeURI(query.url);

            // const [data,] = await pdf2img.convert(docUrl);
            //
            // res.setHeader('Content-Type', 'image/jpeg')
            res.json({url: docUrl, message: 'Not Implemented'});

            break;
        default:
            res.setHeader('Allow', ['GET', 'PUT'])
            res.status(405).end(`Method ${method} Not Allowed`)
    }
}