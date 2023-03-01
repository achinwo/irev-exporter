import axios from "axios";

const CACHE = {};

export default async function userHandler(req, res) {
    const { query, method } = req;
    const wardId = query.id;

    let data = CACHE[wardId];
    let startTime = new Date().getTime();

    if(!data){
        const url = `https://lv001-g.inecelectionresults.ng/api/v1/elections/63f8f25b594e164f8146a213/pus?ward=${wardId}`;
        console.log('Fetching url:', url);

        const response = await axios.get(url);
        data = response.data;

        CACHE[wardId] = data;
    }

    let endTime = new Date().getTime();
    data['request_duration'] = endTime - startTime;

    switch (method) {
        case 'GET':
            res.status(200).json(data);
            break
        default:
            res.setHeader('Allow', ['GET', 'PUT'])
            res.status(405).end(`Method ${method} Not Allowed`)
    }
}