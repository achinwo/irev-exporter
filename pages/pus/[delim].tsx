import {App} from '../../src/app';
import * as models from '../../src/orm';
import { ElectionType } from '../../src/ref_data';
import Box from "@mui/material/Box";
import {
    Button,
    capitalize, Card,
    CardContent, CardMedia, CircularProgress, IconButton,
    Link,
    MenuItem,
    Select, Stack,
    Typography
} from "@mui/material";
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import React, {useEffect, useState} from "react";
import ReactPanZoom from "react-image-pan-zoom-rotate";
import _ from 'lodash';
import axios from "axios";
import DoneOutlineIcon from '@mui/icons-material/DoneOutline';
import CloseIcon from '@mui/icons-material/Close';

function goTo(page, title, url) {
    if ("undefined" !== typeof history.pushState) {
        history.pushState({page: page}, title, url);
    } else {
        window.location.assign(url);
    }
}

const AppPuView = function ({puCodesSerialized, puSerialized, puDataSerialized}) {
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

                goTo(newDelim, `PU - ${resp.data.data?.name}`, `/pus/${newDelim}`);
            })
            .finally(() => setIsLoadingPuData(false));

    }, [puCode]);

    //console.log('AppPuView:', puCodes);
    return <App pageTitle={'Data Review'} mainComponent={MainView} mainComponentProps={{puData, puCodes, setPuCode, isLoadingPuData}} stateId={puObj.stateId} electionType={ElectionType.PRESIDENTIAL}></App>;
}

function PaginationView({setPuCode, puCodes, puData}) {

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
            </Box>
        </Box>

        <Button
            sx={{ borderRadius: 8 }}
            variant="contained"
            onClick={(evt) => changePuCode(1)}
            endIcon={<NavigateNextIcon />}
            disabled={currentIndex > puCodes.length - 1}
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
    return <Card elevation={2} xs={{mt: 20}} style={{width: "100%", minHeight: '50vh'}}>
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

                    <Stack direction={'row'} sx={{mt: 2, mr: 'auto', ml: 'auto'}}>
                        <IconButton size={'large'} color="success" sx={{m: 4}}>
                            <DoneOutlineIcon />
                        </IconButton>
                        <IconButton size={'large'} color="error" sx={{m: 4}}>
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                </Stack>
            </CardMedia>
        </CardContent>
    </Card>
}

function MainView({puData, setPuCode, puCodes, isLoadingPuData}) {
    // const theme = useTheme();
    // const matches = useMediaQuery(theme.breakpoints.up('sm'));

    if (isLoadingPuData) {
        return <CircularProgress color={"success"} size={200} />;
    }

    return <Box sx={{ mt: 20, ml: {sm: 35, xs: 2}, mr: {sm: 4, xs: 0}}} style={{display: 'flex', flexDirection: 'column', minHeight: '70vh', width: '100%'}}>

        <Box style={{display: 'flex', flexDirection: 'row', flexShrink: 1}}>
            <PaginationView puData={puData} puCodes={puCodes} setPuCode={setPuCode}/>
        </Box>

        <Box sx={{mt: 2, mb: 2}} style={{display: 'flex', flexDirection: 'row', flexGrow: 2, width: '100%'}}>
            <PollingUnitReviewView puData={puData} puCodes={puCodes}/>


        </Box>

        <Box style={{display: 'flex', flexDirection: 'row', flexShrink: 1}}>
            <PaginationView puData={puData} puCodes={puCodes} setPuCode={setPuCode}/>
        </Box>
    </Box>
}

export async function getServerSideProps({params, query, resolvedUrl}) {
    const {delim} = params;
    const puCode = delim.replaceAll('-', '/');

    const pu = await models.IrevPu.query().where('pu_code', puCode).first();
    const puData = await models.PuData.query()
        .where('pu_code', puCode).andWhere('election_type', ElectionType.PRESIDENTIAL)
        .andWhere('source', 'irev').first();

    let puCodes = await models.PuData.query().select('pu_code', 'name')
        .where('ward_id', puData.wardId).andWhere('election_type', ElectionType.PRESIDENTIAL)
        .andWhere('source', 'irev');

    puCodes = _.sortBy(puCodes, (o) => o.puCode);
    console.log('[getServerSideProps] puCode:', puCode);
    return {
        props: {...params, puCode, puCodesSerialized: JSON.stringify(puCodes), puSerialized: JSON.stringify(pu.toJson()), puDataSerialized: JSON.stringify(puData.toJson()), query, resolvedUrl},
    }
}


export default AppPuView;