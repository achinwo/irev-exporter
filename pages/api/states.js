
export default function handler(_req, res) {
    // Get data from your database
    res.status(200).json(STATES)
}

export const STATES = [
    {
        "name": "ABIA",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=1",
        "id": 1
    },
    {
        "name": "ADAMAWA",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=2",
        "id": 2
    },
    {
        "name": "AKWA IBOM",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=3",
        "id": 3
    },
    {
        "name": "ANAMBRA",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=4",
        "id": 4
    },
    {
        "name": "BAUCHI",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=5",
        "id": 5
    },
    {
        "name": "BAYELSA",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=6",
        "id": 6
    },
    {
        "name": "BENUE",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=7",
        "id": 7
    },
    {
        "name": "BORNO",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=8",
        "id": 8
    },
    {
        "name": "CROSS RIVER",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=9",
        "id": 9
    },
    {
        "name": "DELTA",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=10",
        "id": 10
    },
    {
        "name": "EBONYI",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=11",
        "id": 11
    },
    {
        "name": "EDO",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=12",
        "id": 12
    },
    {
        "name": "EKITI",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=13",
        "id": 13
    },
    {
        "name": "ENUGU",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=14",
        "id": 14
    },
    {
        "name": "FCT",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=15",
        "id": 15
    },
    {
        "name": "GOMBE",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=16",
        "id": 16
    },
    {
        "name": "IMO",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=17",
        "id": 17
    },
    {
        "name": "JIGAWA",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=18",
        "id": 18
    },
    {
        "name": "KADUNA",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=19",
        "id": 19
    },
    {
        "name": "KANO",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=20",
        "id": 20
    },
    {
        "name": "KATSINA",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=21",
        "id": 21
    },
    {
        "name": "KEBBI",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=22",
        "id": 22
    },
    {
        "name": "KOGI",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=23",
        "id": 23
    },
    {
        "name": "KWARA",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=24",
        "id": 24
    },
    {
        "name": "LAGOS",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=25",
        "id": 25
    },
    {
        "name": "NASARAWA",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=26",
        "id": 26
    },
    {
        "name": "NIGER",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=27",
        "id": 27
    },
    {
        "name": "OGUN",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=28",
        "id": 28
    },
    {
        "name": "ONDO",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=29",
        "id": 29
    },
    {
        "name": "OSUN",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=30",
        "id": 30
    },
    {
        "name": "OYO",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=31",
        "id": 31
    },
    {
        "name": "PLATEAU",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=32",
        "id": 32
    },
    {
        "name": "RIVERS",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=33",
        "id": 33
    },
    {
        "name": "SOKOTO",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=34",
        "id": 34
    },
    {
        "name": "TARABA",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=35",
        "id": 35
    },
    {
        "name": "YOBE",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=36",
        "id": 36
    },
    {
        "name": "ZAMFARA",
        "url": "https://www.inecelectionresults.ng/elections/63f8f25b594e164f8146a213?state=37",
        "id": 37
    }
];