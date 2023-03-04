import {STATES} from "../../src/utils";

export default function handler(_req, res) {
    // Get data from your database
    res.status(200).json(STATES)
}

