import {PuData} from "../../../src/orm";

export default async function userHandler(req, res) {
    const { query, method, body } = req;

    switch (method) {
        case 'GET':
            const data = await PuData.fetchStats(query.electionType);
            res.status(200).json({data});
            break;
        default:
            res.setHeader('Allow', ['GET', 'PUT'])
            res.status(405).end(`Method ${method} Not Allowed`)
    }
}