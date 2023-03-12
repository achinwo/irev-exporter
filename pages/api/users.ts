import {User} from "../../src/orm";
import {PartialModelObject} from "objection";

export default async function handler(req, res) {
    const {method, query} = req;

    switch (method) {
        case 'POST':
            const newUser: PartialModelObject<User> = req.body;

            const saved = await User.query().insert(newUser);
            res.json({data: saved});
            break;
        default:
            res.setHeader('Allow', ['GET', 'PUT'])
            res.status(405).end(`Method ${method} Not Allowed`)
    }
}