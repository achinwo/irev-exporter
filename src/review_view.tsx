import {App} from './app';
import * as models from './orm';
import {ElectionType, KEY_CONTRIBUTOR, KEY_CONTRIBUTOR_DISPLAYNAME, KEY_ELECTION_TYPE} from './ref_data';
import Box from "@mui/material/Box";
import {
    Button, ButtonGroup,
    capitalize, Card,
    CardContent, CardMedia, Chip, CircularProgress, Divider, FormControl, Grid, IconButton, InputLabel,
    Link,
    MenuItem,
    Select, Stack, TextField, ToggleButton, ToggleButtonGroup,
    Typography, useMediaQuery, useTheme
} from "@mui/material";
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import React, {useEffect, useState} from "react";
import ReactPanZoom from "react-image-pan-zoom-rotate";
import _ from 'lodash';
import axios from "axios";
import DoneOutlineIcon from '@mui/icons-material/DoneOutline';
import DoneIcon from '@mui/icons-material/Done';
import CloseIcon from '@mui/icons-material/Close';
import HomeSharpIcon from '@mui/icons-material/HomeSharp';
import LoadingButton from "@mui/lab/LoadingButton";

import GroupsSharpIcon from '@mui/icons-material/GroupsSharp';
import FilterListSharpIcon from '@mui/icons-material/FilterListSharp';
import PersonSharpIcon from '@mui/icons-material/PersonSharp';
import HistoryToggleOffSharpIcon from '@mui/icons-material/HistoryToggleOffSharp';
import HistorySharpIcon from '@mui/icons-material/HistorySharp';
import {fullValidator} from "./account_view";


export enum DataQualityIssue {
    OVER_VOTING = 'OVER_VOTING', UNENTERED_VOTES = 'UNENTERED_VOTES', VOTES_GT_TTL_VOTES = 'VOTES_GT_TTL_VOTES',
    FALSE_ILLEGIBLE = 'FALSE_ILLEGIBLE'
}

export namespace DataQualityIssue {

    export function values(): string[] {
        return [
            DataQualityIssue.UNENTERED_VOTES,
            DataQualityIssue.VOTES_GT_TTL_VOTES,
            DataQualityIssue.OVER_VOTING,
            DataQualityIssue.FALSE_ILLEGIBLE,
        ]
    }

    export function labelFor(val) {
        return {
            [DataQualityIssue.UNENTERED_VOTES]: 'Missing Acc./Total Votes',
            [DataQualityIssue.VOTES_GT_TTL_VOTES]: 'Sum Votes > Ttl Votes',
            [DataQualityIssue.OVER_VOTING]: 'Overvoting',
            [DataQualityIssue.FALSE_ILLEGIBLE]: 'False Illegible'
        }[val];
    }
}


function goTo(page, title, url) {
    if ("undefined" !== typeof history.pushState) {
        history.pushState({page: page}, title, url);
    } else {
        window.location.assign(url);
    }
}

export const AppPuView = function ({stats, puCodesSerialized, puSerialized, puDataSerialized, delim}) {
    let puObj: models.IrevPu = JSON.parse(puSerialized);
    let initialPuData: models.PuData = JSON.parse(puDataSerialized);
    const puCodes: {name: string, puCode: string}[] = JSON.parse(puCodesSerialized);

    const [puCode, setPuCode] = useState(initialPuData?.puCode || null);
    const [puData, setPuData] = useState<models.PuData>(initialPuData);
    const [isLoadingPuData, setIsLoadingPuData] = useState<boolean>(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const contributor = localStorage.getItem(KEY_CONTRIBUTOR);

        if(!contributor) return;

        const resp = axios.get(`/api/users/${encodeURIComponent(_.trim(contributor))}`)
            .then((resp) => {
                setCurrentUser(resp.data.data);
                localStorage.setItem(KEY_CONTRIBUTOR_DISPLAYNAME, resp.data.data?.displayName && _.toString(resp.data.data.displayName) || null);
            })
            .catch((e) => {
                console.error('Unable to fetch user by conributor id:', contributor, e.stack);
            });

    }, []);

    useEffect(() => {
        if(puCode === puData?.puCode || !puCode) return;

        const newDelim = puCode.replaceAll('/', '-');
        setIsLoadingPuData(true);
        axios.get(`/api/pu_data/${newDelim}`)
            .then((resp) => {
                setPuData(resp.data.data);

                const isDq = DataQualityIssue.values().map(i => i.toLowerCase()).includes(delim.toLowerCase());


                const params = new URLSearchParams(location.search);
                if(isDq){
                    params.set('pu', newDelim);
                } else {
                    params.delete('pu');
                }
                 //isDq ? `/pus/${delim}?pu=${newDelim}` : `/pus/${newDelim}`);

                const newUrl = `/pus/${isDq ? delim : newDelim}?${params.toString()}`;

                goTo(newDelim, `PU - ${resp.data.data?.name}`, newUrl);
            })
            .finally(() => setIsLoadingPuData(false));

    }, [puCode]);

    //console.log('AppPuView:', puCodes);

    const pageTitle = <Stack spacing={2} direction={'row'} alignItems={'center'}>
        <IconButton size={'small'} href={'/'}>
            <HomeSharpIcon fontSize={'medium'}/>
        </IconButton>
        <Typography variant={'h6'}>Data Review</Typography>
    </Stack>

    return <App suppressDrawer={true} pageTitle={pageTitle} mainComponent={MainView} mainComponentProps={{delim, puData, puCodes, setPuCode, isLoadingPuData, stats, currentUser}} stateId={puObj?.stateId} electionType={ElectionType.PRESIDENTIAL}></App>;
}

function PaginationView({setPuCode, puCodes, puData, componentId}) {

    const currentIndex = _.findIndex(puCodes, (p) => p.puCode === puData.puCode);

    const changePuCode = (delta) => {
        const newIdx = currentIndex + delta;
        if(newIdx < 0 || newIdx > puCodes.length - 1) return;
        setPuCode(puCodes[currentIndex + delta].puCode);
    }

    return <>
        <Button
            sx={{ borderRadius: 8 }}
            variant="contained"
            onClick={(evt) => changePuCode(-1)}
            disabled={currentIndex < 1}
            startIcon={<NavigateBeforeIcon />}
        >Prev</Button>

        <Box style={{flexGrow: 2}}>
            <Box sx={{mr: 'auto', ml: 'auto', minWidth: 25, maxWidth: '50vw'}} style={{display: 'flex', flexDirection: 'column'}}>
                <FormControl variant="filled" sx={{ m: 1, minWidth: 120 }}>
                    <InputLabel id={componentId}>Polling Unit</InputLabel>
                    <Select
                        sx={{}}
                        value={puData?.puCode}
                        label="Polling Unit"
                        onChange={(evt) => setPuCode(evt.target.value)}
                    >
                        {
                            (puCodes || []).map((o) => {
                                return <MenuItem key={o.puCode} value={o.puCode}>{`${o.puCode} - ${o.name}`}</MenuItem>
                            })
                        }
                    </Select>
                </FormControl>
            </Box>
        </Box>

        <Button
            sx={{ borderRadius: 8}}
            variant="contained"
            onClick={(evt) => changePuCode(1)}
            endIcon={<NavigateNextIcon />}
            disabled={currentIndex >= (puCodes.length - 1)}
        >Next</Button>
    </>
}

function PollingUnitReviewView({puData, currentUser}: {puData: models.PuData, currentUser: any}) {
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    // @ts-ignore
    const updatedTxt = `Submitted: ${new Date(puData.createdAt).toLocaleDateString("en-US", options)}`;
    // @ts-ignore
    const submittedAtTxt = new Date(puData.updatedAt).toLocaleDateString("en-US", options)

    // @ts-ignore
    return <Card elevation={1} xs={{mt: 20}} style={{width: "100%", minHeight: '50vh'}}>
        {/* @ts-ignore */}
        <CardContent align="center" style={{width: "100%"}}>
            <Typography>{capitalize(`${puData.name}`)}</Typography>
            <Typography>{`PU Code: ${puData.puCode}`}</Typography>
            <Typography>{`State/LGA: ${puData.stateName} | ${puData.lgaName}`}</Typography>
            <Typography>{updatedTxt} by <span style={{fontWeight: 'bolder'}}>{puData.contributorUsername}</span></Typography>
            <Link href={puData.documentUrl} rel="noopener noreferrer" target="_blank" sx={{mb: 4}}>Document
                Link {puData.documentUrl.endsWith('.pdf') ? '(PDF)' : '(JPG)'}</Link>
            <CardMedia style={{maxWidth: "100%", minHeight: '70vh'}}>
                <Stack style={{width: '100%'}}>

                    <Box style={{maxWidth: "100%", minHeight: '40vh', position: 'relative', overflow: 'hidden'}}>
                    {
                        puData.documentUrl.endsWith('.pdf') ?
                            <div style={{maxWidth: "100%", height: '100%', position: 'relative'}}>
                                <embed width={'90%'} height={'auto'} src={`${puData.documentUrl}#view=Fit&toolbar=1`}
                                       style={{height: 'auto', minHeight:'60vh', marginTop: '1em'}}/>

                            </div>
                            :
                                <ReactPanZoom
                                    image={puData.documentUrl}
                                    alt={`Result for Polling Unit ${puData.puCode}`}
                                />
                    }
                    </Box>

                    <PuQuestionnaireView puData={puData}/>

                    <Stack direction={'row'} sx={{mt: 2, mr: 'auto', ml: 'auto'}}>
                        <Button size={'large'} color={'success'} sx={{m: 4}} disabled={!fullValidator(currentUser)}>
                            <Stack justifyContent="center" alignItems="center">
                                <DoneOutlineIcon fontSize={'large'} />
                                <Typography>Valid</Typography>
                            </Stack>
                        </Button>

                        <Button size={'large'} color={'error'} sx={{m: 4}}>
                            <Stack justifyContent="center" alignItems="center">
                                <CloseIcon fontSize={'large'} />
                                <Typography>Return</Typography>
                            </Stack>
                        </Button>
                    </Stack>
                </Stack>
            </CardMedia>
        </CardContent>
    </Card>
}

const NOT_ENTERED = 'Not Entered';

function PuQuestionnaireView({puData}) {
    const fields: [string, string, boolean, boolean][] = [
        ['Accredited Votes', 'votersAccredited', false, true],
        ['Accredited Votes (BVAS)', 'votersAccreditedBvas', false, false],
        ['Total Valid Votes', 'votesCast', false, true],
        ['Contains Alteration', 'containsAlterations', true, true],
        ['Incorrect PU Name', 'containsIncorrectPuName', true, true],
        ['INEC Stamp Absent', 'isInecStampAbsent', true, true],
        ['Can\'t Read Votes', 'isResultIllegible', true, false],
        ['Non-EC8 Form', 'isNoneEceightForm', true, false],
    ]
    const gridArgs = {item: true, xs: 2, sm: 4, md: 3, display: puData.isResultIllegible ? 'none' : 'initial'};

    const makeStack = (label, val) => {
        const [isValidatedLabel, setIsValidatedLabel] = useState<null | boolean>(val === NOT_ENTERED ? false : null);
        const color = isValidatedLabel ? 'success' : (isValidatedLabel === null ? 'inherit' : 'error');
        return <Button
            variant={'outlined'}
            color={color}
            disabled={label === 'Accredited Votes (BVAS)'}
            fullWidth={true}
            onClick={() => setIsValidatedLabel(isValidatedLabel === null ? false : !isValidatedLabel)}
            endIcon={isValidatedLabel ? <DoneIcon/> : (isValidatedLabel === null ? null : <CloseIcon />) }>
            <Stack direction={'row'} divider={<Divider orientation={'vertical'} flexItem={true} sx={{ml: 1, mr: 1}}/>}>
                <Typography sx={{fontWeight: 'bold'}}>{label}</Typography>
                <Typography sx={{}}>{val}</Typography>
            </Stack>
        </Button>;
    }

    return <>
        <Grid container spacing={{ xs: 2, md: 2 }} sx={{mt: 4}} columns={{ xs: 4, sm: 8, md: 12 }}>
            {['Apc', 'Lp', 'Nnpp', 'Pdp'].map((tag, key) => {
                return <Grid key={key} {...gridArgs}>
                    {makeStack(tag.toUpperCase(), puData[`votes${tag}`] || 'nil')}
                </Grid>
            })}

            {
                fields.map(([label, fieldName, isBool, hideOnIlleligible]) => {
                    const val = isBool ? `${puData[fieldName] ?? false}` : puData[fieldName] || NOT_ENTERED;
                    return <Grid key={fieldName} item xs={4} sm={4} md={6} display={hideOnIlleligible && puData.isResultIllegible ? 'none' : 'initial'}>
                        {makeStack(label, val)}
                    </Grid>
                })
            }
        </Grid>
    </>
}

function formatToUnits(number, precision) {

    if(number < 1000) return number.toFixed(0);

    const abbrev = ['', 'k', 'm', 'b', 't'];
    const unrangifiedOrder = Math.floor(Math.log10(Math.abs(number)) / 3)
    const order = Math.max(0, Math.min(unrangifiedOrder, abbrev.length -1 ))
    const suffix = abbrev[order];

    return (number / Math.pow(10, order * 3)).toFixed(precision) + suffix;
}

function MainView({puData, setPuCode, puCodes, isLoadingPuData, stats, delim, currentUser}) {
    // const theme = useTheme();

    const [currentContrib, setCurrentContrib] = useState<string>(null);
    const [currentCreatedAfter, setCurrentCreatedAfter] = useState<string>(null);

    const [currentDisplayName, setcurrentDisplayName] = useState<string>(null);

    const [contribId, setContribId] = useState<string>(null);
    const [createdAfter, setCreatedAfter] = useState<string>(null);
    const [destUrl, setDestUrl] = useState<string>(null);

    const [loadingIssue, setLoadingIssue] = useState<string | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(globalThis?.window?.location?.search);
        const addressContrib = params.get('displayName') || '';
        const addressCreatedAfter = params.get('createdAfter') || '';

        setCreatedAfter(addressCreatedAfter);
        setContribId(addressContrib ? 'mine' : '');
        setcurrentDisplayName(localStorage?.getItem(KEY_CONTRIBUTOR_DISPLAYNAME));

        setCurrentContrib(addressContrib ? 'mine' : '');
        setCurrentCreatedAfter(addressCreatedAfter);
    }, [currentContrib, currentCreatedAfter]);

    useEffect(() => {
        const params = new URLSearchParams(globalThis?.window?.location?.search);
        if(createdAfter) {
            params.set('createdAfter', createdAfter);
        }else {
            params.delete('createdAfter');
        }

        if(contribId) {
            const myDisplayName = localStorage.getItem(KEY_CONTRIBUTOR_DISPLAYNAME);
            params.set('displayName', contribId === 'mine' && myDisplayName ? myDisplayName : '');
        }else {
            params.delete('displayName');
        }

        setDestUrl(`${window.location.pathname}?${params.toString()}`);
    }, [contribId, createdAfter]);

    const theme = useTheme();
    const matches = useMediaQuery(theme.breakpoints.down('sm'));

    const makeStack = (text, chip) => {
        return <Stack direction={ matches ? 'column' : 'row'} alignItems={'center'}>
            <Typography>{text}</Typography>
            <Chip label={chip} sx={{display: {sx: 'none'}, ml: 1}} />
        </Stack>
    }
    //{ mt: 20, ml: {sm: 35, xs: 2}, mr: {sm: 4, xs: 0}}
    return <Stack spacing={4} alignItems={'center'} sx={{ mt: 20, ml: 4, mr: 4, maxWidth: {xs: '100%', md: 1000}}} style={{display: 'flex', flexDirection: 'column', minHeight: '70vh'}}>

        <Stack direction="row" alignItems={'center'} spacing={4}>
            <Stack direction={'row'} spacing={2} style={{color: 'gray'}} alignItems={'center'}>
                <FilterListSharpIcon/>
                { matches ? null : <Typography variant={'h6'} style={{flexGrow: 2}}>Filters</Typography>}
            </Stack>

            <ToggleButtonGroup
                value={contribId}
                disabled={!currentDisplayName}
                exclusive
                onChange={(evt, value) => {
                    if(value === contribId || value == null) return;
                    setContribId(value);
                }}
                aria-label="text alignment"
            >
                <ToggleButton value="" aria-label="laptop">
                    <Stack direction={'row'} spacing={2}>
                        <GroupsSharpIcon/>
                        { matches ? null : <Typography>Everyone</Typography>}
                    </Stack>
                </ToggleButton>
                <ToggleButton value="mine" aria-label="laptop">
                    <Stack direction={'row'} spacing={2}>
                        <PersonSharpIcon/>
                        { matches ? null : <Typography>Mine Only</Typography>}
                    </Stack>
                </ToggleButton>
            </ToggleButtonGroup>

            <ToggleButtonGroup
                value={createdAfter}
                exclusive={true}
                onChange={(evt, value) => {
                    console.log('REVIEW_VIEW', {currentContrib, contribId, currentCreatedAfter, createdAfter, value});
                    if(value === createdAfter || value == null) return;
                    setCreatedAfter(value);
                }}>
                <ToggleButton value="">
                    <Stack direction={'row'} spacing={2}>
                        <HistorySharpIcon/>
                        { matches ? null : <Typography>All Time</Typography>}
                    </Stack>
                </ToggleButton>
                <ToggleButton value="2023-04-16">
                    <Stack direction={'row'} spacing={2}>
                        <HistoryToggleOffSharpIcon/>
                        { matches ? null : <Typography>From April 16th</Typography>}
                    </Stack>
                </ToggleButton>
            </ToggleButtonGroup>
            <Button size={'large'} disabled={currentContrib === contribId && currentCreatedAfter === createdAfter} href={destUrl}>
                Apply
            </Button>
        </Stack>

        <ButtonGroup fullWidth={true} variant="outlined">
            {
                _.toPairs(stats).map(([key, {label, count}]) => {

                    return <LoadingButton
                        href={`/pus/${key.toLowerCase()}`}
                        color={'secondary'}
                        disabled={count < 1}
                        onClick={() => setLoadingIssue(key)}
                        loading={loadingIssue === key}
                        loadingPosition="start"
                        key={key}
                        variant={key.toLowerCase() === delim.toLowerCase() ? 'contained' : 'outlined'}>
                        {loadingIssue === key ? 'Fetching...' : makeStack(label, formatToUnits(count, 1))}
                    </LoadingButton>
                })
            }

        </ButtonGroup>

        <Box style={{display: 'flex', flexDirection: 'row', flexShrink: 1, width: '100%'}}>
            <PaginationView  componentId={'pagination-top'} puData={puData} puCodes={puCodes} setPuCode={setPuCode}/>
        </Box>


        {isLoadingPuData ?
            <Box style={{display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexGrow: 2, width: '100%'}}>
                <CircularProgress color={"success"} size={200} />
            </Box>
            :

            (puData ?

                    <Box style={{display: 'flex', flexDirection: 'row', flexGrow: 2, width: '100%'}}>
                        <PollingUnitReviewView puData={puData} currentUser={currentUser}/>
                    </Box>
                 :
            <Typography style={{display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', flexGrow: 2, width: '100%'}}>Nothing data to display</Typography>
            )

        }

        <Box style={{display: 'flex', flexDirection: 'row', flexShrink: 1, width: '100%'}}>
            <PaginationView componentId={'pagination-bottom'} puData={puData} puCodes={puCodes} setPuCode={setPuCode}/>
        </Box>
    </Stack>
}