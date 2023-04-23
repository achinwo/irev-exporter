import {App} from './app';
import * as models from './orm';
import { ElectionType } from './ref_data';
import Box from "@mui/material/Box";
import {
    Button, ButtonGroup,
    capitalize, Card,
    CardContent, CardMedia, Chip, CircularProgress, Divider, FormControl, Grid, IconButton, InputLabel,
    Link,
    MenuItem,
    Select, Stack, TextField,
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

    useEffect(() => {
        if(puCode === puData?.puCode) return;
        const newDelim = puCode.replaceAll('/', '-');
        setIsLoadingPuData(true);
        axios.get(`/api/pu_data/${newDelim}`)
            .then((resp) => {
                setPuData(resp.data.data);

                const isDq = DataQualityIssue.values().map(i => i.toLowerCase()).includes(delim.toLowerCase());
                const newUrl = isDq ? `/pus/${delim}?pu=${newDelim}` : `/pus/${newDelim}`;
                goTo(newDelim, `PU - ${resp.data.data?.name}`, newUrl);
            })
            .finally(() => setIsLoadingPuData(false));

    }, [puCode]);

    //console.log('AppPuView:', puCodes);
    return <App suppressDrawer={true} pageTitle={'Data Review'} mainComponent={MainView} mainComponentProps={{delim, puData, puCodes, setPuCode, isLoadingPuData, stats}} stateId={puObj.stateId} electionType={ElectionType.PRESIDENTIAL}></App>;
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

function PollingUnitReviewView({puData, puCodes}: {puData: models.PuData, puCodes: string[]}) {
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    // @ts-ignore
    const updatedTxt = `Updated: ${new Date(puData.updatedAt).toLocaleDateString("en-US", options)}`;

    // @ts-ignore
    return <Card elevation={1} xs={{mt: 20}} style={{width: "100%", minHeight: '50vh'}}>
        {/* @ts-ignore */}
        <CardContent align="center" style={{width: "100%"}}>
            <Typography>{capitalize(`${puData.name}`)}</Typography>
            <Typography>{`PU Code: ${puData.puCode}`}</Typography>
            <Typography>{updatedTxt}</Typography>
            <Link href={puData.documentUrl} rel="noopener noreferrer" target="_blank" sx={{mb: 4}}>Document
                Link {puData.documentUrl.endsWith('.pdf') ? '(PDF)' : '(JPG)'}</Link>
            <CardMedia style={{maxWidth: "100%", minHeight: '70vh'}}>
                <Stack style={{width: '100%'}}>
                    {
                        puData.documentUrl.endsWith('.pdf') ?
                            <div style={{maxWidth: "100%", height: '100%', position: 'relative'}}>
                                <embed width={'90%'} height={'auto'} src={`${puData.documentUrl}#view=Fit&toolbar=1`}
                                       style={{height: 'auto', minHeight:'60vh', marginTop: '1em'}}/>

                            </div>
                            :
                            <Box style={{maxWidth: "100%", position: 'relative', overflow: 'hidden'}}>
                                <ReactPanZoom
                                    image={puData.documentUrl}
                                    alt={`Result for Polling Unit ${puData.puCode}`}
                                />
                            </Box>
                    }

                    <PuQuestionnaireView puData={puData}/>

                    <Stack direction={'row'} sx={{mt: 2, mr: 'auto', ml: 'auto'}}>
                        <Button size={'large'} color={'success'} sx={{m: 4}}>
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
    const fields: [string, string, boolean][] = [
        ['Accredited Votes', 'votersAccredited', false],
        ['Total Valid Votes', 'votesCast', false],
        ['Contains Alteration', 'containsAlterations', true],
        ['Incorrect PU Name', 'containsIncorrectPuName', true],
        ['INEC Stamp Absent', 'isInecStampAbsent', true],
        ['Non-EC8 Form', 'isNoneEceightForm', true],
    ]
    const gridArgs = {item: true, xs: 2, sm: 4, md: 3};
    const gridArgs2 = {item: true, xs: 4, sm: 4, md: 6};

    const makeStack = (label, val) => {
        const [validatedLabel, setValidatedLabel] = useState<null | boolean>(val === NOT_ENTERED ? false : null);
        const color = validatedLabel ? 'success' : (validatedLabel === null ? 'inherit' : 'error');
        return <Button
            variant={'outlined'}
            color={color}
            fullWidth={true}
            onClick={() => setValidatedLabel(!validatedLabel)}
            endIcon={validatedLabel ? <DoneIcon/> : (validatedLabel === null ? null : <CloseIcon />) }>
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
                fields.map(([label, fieldName, isBool]) => {
                    const val = isBool ? `${puData[fieldName] ?? false}` : puData[fieldName] || NOT_ENTERED;
                    return <Grid key={fieldName} {...gridArgs2}>
                        {makeStack(label, val)}
                    </Grid>
                })
            }
        </Grid>
    </>
}

function formatToUnits(number, precision) {
    const abbrev = ['', 'k', 'm', 'b', 't'];
    const unrangifiedOrder = Math.floor(Math.log10(Math.abs(number)) / 3)
    const order = Math.max(0, Math.min(unrangifiedOrder, abbrev.length -1 ))
    const suffix = abbrev[order];

    return (number / Math.pow(10, order * 3)).toFixed(precision) + suffix;
}

function MainView({puData, setPuCode, puCodes, isLoadingPuData, stats, delim}) {
    // const theme = useTheme();
    // const matches = useMediaQuery(theme.breakpoints.up('sm'));

    if (isLoadingPuData) {
        return <CircularProgress color={"success"} size={200} />;
    }

    const theme = useTheme();
    const matches = useMediaQuery(theme.breakpoints.down('sm'));

    const makeStack = (text, chip) => {
        return <Stack direction={ matches ? 'column' : 'row'} alignItems={'center'}>
            <Typography>{text}</Typography>
            <Chip label={chip} sx={{display: {sx: 'none'}, ml: 1}} />
        </Stack>
    }
    //{ mt: 20, ml: {sm: 35, xs: 2}, mr: {sm: 4, xs: 0}}
    return <Box sx={{ mt: 20, ml: 4, mr: 4}} style={{display: 'flex', flexDirection: 'column', minHeight: '70vh', width: '100%'}}>

        <ButtonGroup fullWidth={true} variant="outlined" sx={{mb: 2}}>
            {
                _.toPairs(stats).map(([key, {label, count}]) => {
                    return <Button
                        href={`/pus/${key}`}
                        color={'secondary'}
                        key={key}
                        variant={key === delim ? 'contained' : 'outlined'} onClick={null}>
                        {makeStack(label, formatToUnits(count, 1))}
                    </Button>
                })
            }

        </ButtonGroup>

        {/*<Divider/>*/}

        <Box sx={{mt: 4}} style={{display: 'flex', flexDirection: 'row', flexShrink: 1}}>
            <PaginationView  componentId={'pagination-top'} puData={puData} puCodes={puCodes} setPuCode={setPuCode}/>
        </Box>

        <Box sx={{mt: 2, mb: 2}} style={{display: 'flex', flexDirection: 'row', flexGrow: 2, width: '100%'}}>
            <PollingUnitReviewView puData={puData} puCodes={puCodes}/>


        </Box>

        <Box style={{display: 'flex', flexDirection: 'row', flexShrink: 1}}>
            <PaginationView componentId={'pagination-bottom'} puData={puData} puCodes={puCodes} setPuCode={setPuCode}/>
        </Box>
    </Box>
}