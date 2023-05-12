import {App} from './app';
import * as models from './orm';
import {ElectionType, KEY_CONTRIBUTOR, KEY_CONTRIBUTOR_DISPLAYNAME, KEY_ELECTION_TYPE, ReviewStatus} from './ref_data';
import Box from "@mui/material/Box";
import {
    Button, ButtonGroup,
    capitalize, Card,
    CardContent, CardMedia, Chip, CircularProgress, Divider, FormControl, Grid, IconButton, InputLabel,
    Link,
    MenuItem,
    Select, Stack, ToggleButton, ToggleButtonGroup,
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
import {fullValidator, isSuperValidator} from "./account_view";
import VerifiedSharpIcon from "@mui/icons-material/VerifiedSharp";
import ErrorSharpIcon from "@mui/icons-material/ErrorSharp";
import PictureAsPdfSharpIcon from '@mui/icons-material/PictureAsPdfSharp';
import InsertPhotoSharpIcon from '@mui/icons-material/InsertPhotoSharp';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';


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

type Props = {stats: any, puCodesSerialized: string, puData?: models.PuData, puSerialized: string, puDataSerialized: string, delim: string};
type State = {
    puCode: string,
    puData: models.PuData,
    isLoadingPuData: boolean,
    currentUser: models.User,

    isSubmitting: boolean,
    issueFlags: {[key: string]: boolean},
    puCodes: {name: string, puCode: string}[],
    puObj: models.IrevPu,
    stats: any,
};

export class AppPuView extends React.Component<Props, State> {

    constructor(props) {
        let {stats, puCodesSerialized, puSerialized, puDataSerialized} = props;
        let initialPuData: models.PuData = JSON.parse(puDataSerialized);

        super({puData: initialPuData, ...props});

        let puObj: models.IrevPu = JSON.parse(puSerialized);
        const puCodes: {name: string, puCode: string}[] = JSON.parse(puCodesSerialized);

        this.state = {
            puCode: initialPuData?.puCode || null,
            puData: initialPuData,
            isLoadingPuData: false,
            currentUser: null,

            isSubmitting: false,
            issueFlags: {},
            puCodes,
            puObj,
            stats
        }
    }

    async componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>, snapshot?: any) {
        const {puCode} = this.state;
        const {delim} = prevProps;

        if(prevState.puCode === puCode || !puCode) return;

        const newDelim = puCode.replaceAll('/', '-');

        this.setState({isLoadingPuData: true});

        try {
            console.log('fetching new PU Data:', `/api/pu_data/${newDelim}`);

            const resp = await axios.get(`/api/pu_data/${newDelim}`)
            this.setState({puData: resp.data.data});
            this.setState({issueFlags: {}});

            const reviewStatuses = [ReviewStatus.RETURNED.toLowerCase(), ReviewStatus.VALIDATED.toLowerCase()];
            const isDq = _.concat(DataQualityIssue.values().map(i => i.toLowerCase()), reviewStatuses).includes(delim.toLowerCase());

            const params = new URLSearchParams(location.search);
            if (isDq) {
                params.set('pu', newDelim);
            } else {
                params.delete('pu');
            }

            const newUrl = `/pus/${isDq ? delim : newDelim}?${params.toString()}`;

            goTo(newDelim, `PU - ${resp.data.data?.name}`, newUrl);

        }finally {
            this.setState({isLoadingPuData: false});
        }
    }

    changePuCode(delta) {
        const {puData, puCodes} = this.state;

        let currentIndex = _.findIndex(puCodes, (p) => p.puCode === puData.puCode);
        currentIndex = currentIndex < 0 ? 0 : currentIndex;

        const newIdx = currentIndex + delta;

        console.log('REVIEW_APP: changePuCode', currentIndex, newIdx, newIdx > puCodes.length - 1);

        if(currentIndex < 0 || (newIdx < 0 || newIdx > puCodes.length - 1)) return;

        this.setState({puCode: puCodes[currentIndex + delta].puCode});
    }

    _keyupListener: (event) => {} | undefined

    async componentDidMount() {
        const handlePuReviewLocal = async (): Promise<boolean> => {
            console.log(`[REVIEW_APP] validation via key press:`, this.state.puData.puCode);

            if(this.state.isSubmitting || !fullValidator(this.state.currentUser) || this.state.puData.reviewStatus) return;

            const issueList = _.compact(_.toPairs(this.state.issueFlags).map(([label, isValid]) => !isValid ? label : null));
            return await handlePuReview({
                puData: this.state.puData,
                setPuData: (v) => this.setState({puData: v}),
                setIsSubmitting: (v) => this.setState({isSubmitting: v}),
                currentUser: this.state.currentUser,
                reviewStatus: ReviewStatus.VALIDATED, issueList});
        }

        const keyupListener = async (event) => {
            console.log('REVIEW_APP: key pressed', event.key, this.state.puData.puCode);
            if(event.key === 'ArrowRight' || event.key === 'ArrowLeft'){
                this.changePuCode(event.key === 'ArrowRight' ? 1 : -1);
            } else if(event.key === 'p' || event.key === 'w'){
                console.log(`[REVIEW_APP] validation via key press ${event.key}:`, this.state.puData.puCode);
                const status = await handlePuReviewLocal();
                if(event.key === 'w' && status) this.changePuCode(1);
            }
        };

        window.addEventListener('keyup', keyupListener);
        this._keyupListener = keyupListener;

        console.log('REVIEW_APP: registered keyboard event handlers');

        const contributor = localStorage.getItem(KEY_CONTRIBUTOR);

        if(!contributor) return;

        try{
            const resp = await axios.get(`/api/users/${encodeURIComponent(_.trim(contributor))}`)
            this.setState({currentUser: resp.data.data});
            localStorage.setItem(KEY_CONTRIBUTOR_DISPLAYNAME, resp.data.data?.displayName && _.toString(resp.data.data.displayName) || null);
        } catch (e) {
            console.error('Unable to fetch user by conributor id:', contributor, e.stack);
        }
    }

    componentWillUnmount() {
        if(!this._keyupListener) return;
        window.removeEventListener('keyup', this._keyupListener);
        console.log('REVIEW_APP: unregistered keyboard event handler');
    }

    render() {
        const pageTitle = <Stack spacing={2} direction={'row'} alignItems={'center'}>
            <IconButton size={'small'} href={'/'}>
                <HomeSharpIcon fontSize={'medium'}/>
            </IconButton>
            <Typography variant={'h6'}>Data Review</Typography>
        </Stack>

        return <App suppressDrawer={true} pageTitle={pageTitle} mainComponent={MainView}
                    mainComponentProps={{
                        delim: this.props.delim,
                        setPuData: (v) => this.setState({puData: v}),
                        puData:this.state.puData,
                        isSubmitting: this.state.isSubmitting,
                        setIsSubmitting: (v) => this.setState({isSubmitting: v}),
                        setIssueFlags: (v) => typeof v === 'function' ? this.setState({issueFlags: v(this.state.issueFlags)}) : this.setState({issueFlags: v}),
                        issueFlags: this.state.issueFlags,
                        puCodes: this.state.puCodes,
                        setPuCode: (v) => this.setState({puCode: v}),
                        isLoadingPuData: this.state.isLoadingPuData,
                        stats: this.state.stats,
                        currentUser: this.state.currentUser}}
                    stateId={this.state?.puObj?.stateId} electionType={ElectionType.PRESIDENTIAL}></App>;
    }

}

function PaginationView({setPuCode, puCodes, puData, componentId}) {

    let currentIndex = _.findIndex(puCodes, (p) => p.puCode === puData.puCode);
    currentIndex = currentIndex < 0 ? 0 : currentIndex;

    const changePuCode = (delta) => {
        const newIdx = currentIndex + delta;

        if(currentIndex < 0 || newIdx < 0 || newIdx > puCodes.length - 1) return;
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

function PollingUnitReviewView({puData, issueFlags, currentUser, isSubmitting, setIsSubmitting, setPuData, setIssueFlags}: {puData: models.PuData, currentUser: any, issueFlags: any, isSubmitting: boolean, setIssueFlags: Function, setIsSubmitting: Function, setPuData: Function}) {
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
    //const submittedAtTxt = new Date(puData.updatedAt).toLocaleDateString("en-US", options);

    const summedVotes = _.sumBy(['Apc', 'Pdp', 'Lp', 'Nnpp'], (n) => puData[`votes${n}`] || 0);
    const issueList = _.compact(_.toPairs(issueFlags).map(([label, isValid]) => !isValid ? label : null));

    let border = {};

    const isValidated = puData.reviewStatus === ReviewStatus.VALIDATED;
    let ValidationIcon = isValidated ? VerifiedSharpIcon : ErrorSharpIcon;

    if(puData.reviewStatus){
        border = {border: 1, borderColor: isValidated ? 'success.main' : 'error.main'};
    }


    const theme = useTheme();
    const matchesMd = useMediaQuery(theme.breakpoints.up('md'));

    const header = <Stack alignItems={'center'}>
        <Typography>{capitalize(`${puData.name}`)}</Typography>
        <Stack direction={'row'} spacing={1} alignItems={'center'}>
            <Typography>{`PU Code: ${puData.puCode}`}</Typography>
            { puData.reviewStatus && <ValidationIcon color={isValidated ? 'success' : 'error'}/>}
        </Stack>
        <Typography>{`State/LGA/Ward: ${puData.stateName}`} / {puData.lgaName} / {puData.wardName}</Typography>
        <Typography>{updatedTxt} by <span style={{fontWeight: 'bolder'}}>{puData.contributorDisplayName}</span></Typography>
        <Link href={puData.documentUrl} rel="noopener noreferrer" target="_blank" sx={{mb: 4}}>Document
            Link {puData.documentType === 'pdf' ? '(PDF)' : '(JPG)'}</Link>
    </Stack>;

    async function handlePuReviewLocal(reviewStatus: ReviewStatus) {
        await handlePuReview({puData, setPuData, setIsSubmitting, currentUser, reviewStatus, issueList});
    }

    // @ts-ignore
    return <Card elevation={1} xs={{mt: 20}} sx={border} style={{width: "100%", minHeight: '50vh'}}>
        {/* @ts-ignore */}
        <CardContent align="center" style={{width: "100%"}}>
            {!matchesMd && header}
            <CardMedia style={{maxWidth: "100%", minHeight: '70vh'}}>
                <Stack direction={matchesMd ? 'row' : 'column'} spacing={4} style={{width: '100%'}}>

                    <Box sx={{maxWidth: {xs: '100%', md: 800}, minWidth: {xs: '100%', md: 800}}} style={{minHeight: '40vh', position: 'relative', overflow: 'hidden'}}>
                    {
                        puData.documentType === 'pdf' ?
                            <div style={{width: "100%", height: '100%', position: 'relative'}}>
                                <embed width={'95%'} height={'auto'} src={`${puData.documentUrl}#view=Fit&toolbar=1`}
                                       style={{height: 'auto', minHeight:'60vh', marginTop: '1em'}}/>

                            </div>
                            :
                            <ReactPanZoom
                                image={puData.documentUrl}
                                alt={`Result for Polling Unit ${puData.puCode}`}
                            />
                    }
                    </Box>

                    <Box sx={{maxWidth: {xs: '100%', md: 600}}} style={{display: 'flex', flexDirection: 'column'}}>
                        {matchesMd && header}

                        <Stack style={{flexGrow: 2, justifyContent: 'end'}}>
                        {
                            !puData.isResultIllegible && <Typography sx={{mt: 2, mb: 2}} color={'gray'}>Sum of votes: <span style={{fontWeight: 'bolder'}}>{summedVotes}</span></Typography>
                        }


                        {!puData.reviewStatus ?
                            <>
                                <PuQuestionnaireView puData={puData} setIssueFlags={setIssueFlags} issueFlags={issueFlags}/>


                                <Stack direction={'row'} sx={{mt: 2, mr: 'auto', ml: 'auto'}}>
                                    <LoadingButton
                                        size={'large'}
                                        color={'success'}
                                        sx={{m: 4}}
                                        loading={isSubmitting}
                                        loadingPosition="center"
                                        disabled={!fullValidator(currentUser) || isSubmitting || !_.isEmpty(issueList)} onClick={() => handlePuReviewLocal(ReviewStatus.VALIDATED)}>
                                        <Stack justifyContent="center" alignItems="center">
                                            <DoneOutlineIcon fontSize={'large'} />
                                            <Typography>Valid</Typography>
                                        </Stack>
                                    </LoadingButton>

                                    <LoadingButton
                                        size={'large'}
                                        color={'error'}
                                        sx={{m: 4}}
                                        loading={isSubmitting}
                                        loadingPosition="center"
                                        onClick={() => handlePuReviewLocal(ReviewStatus.RETURNED)}
                                        disabled={!currentUser || (currentUser.contributorId !== puData.contributorUsername && !fullValidator(currentUser)) || isSubmitting}>
                                        <Stack justifyContent="center" alignItems="center">
                                            <CloseIcon fontSize={'large'} />
                                            <Typography>Return</Typography>
                                        </Stack>
                                    </LoadingButton>
                                </Stack>
                            </>
                            :
                            <>
                                <Stack direction={'row'} sx={{mt: 2, mr: 'auto', ml: 'auto'}} alignItems={'center'} >
                                    <ValidationIcon color={isValidated ? 'success' : 'error'} fontSize={'large'} sx={{marginRight: 2}}/>
                                    <Typography variant={'h4'}>{puData.reviewStatus}</Typography>
                                </Stack>
                                { isSuperValidator(currentUser) &&
                                <LoadingButton
                                    size={'small'}
                                    color={'warning'}
                                    sx={{m: 1}}
                                    loading={isSubmitting}
                                    loadingPosition="center"
                                    onClick={() => handlePuReviewLocal(null)}
                                    disabled={isSubmitting}>
                                    <Stack justifyContent="center" alignItems="center">
                                        <RestartAltRoundedIcon fontSize={'small'} />
                                        <Typography>Reset</Typography>
                                    </Stack>
                                </LoadingButton>
                                }
                            </>
                        }


                        {currentUser && currentUser.contributorId !== puData.contributorUsername &&
                            <Typography sx={{mt: 2}} color={'gray'}>Submitted by {puData.contributorDisplayName}</Typography>
                        }

                        {puData.reviewStatus &&
                            <Typography sx={{mt: 2}} color={'gray'}>Reviewed by {puData.reviewedByDisplayName}</Typography>
                        }

                        {(!fullValidator(currentUser) && !puData.reviewStatus) &&
                            <Typography sx={{mt: 2}} color={'gray'}>Note: You have LIMITED validation capabilities. You can return your own submissions only.</Typography>}

                        </Stack>
                    </Box>
                </Stack>
            </CardMedia>
        </CardContent>
    </Card>
}

const NOT_ENTERED = 'Not Entered';

function PuQuestionnaireView({puData, setIssueFlags, issueFlags}) {
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
        //const [isValidatedLabel, setIsValidatedLabel] = useState<null | boolean>(val === NOT_ENTERED ? false : null);

        const isValidatedLabel = issueFlags[label] === undefined ? null : issueFlags[label];
        const color = isValidatedLabel ? 'success' : (isValidatedLabel === null ? 'inherit' : 'error');
        return <Button
            variant={'outlined'}
            color={color}
            disabled={label === 'Accredited Votes (BVAS)'}
            fullWidth={true}
            onClick={() => setIssueFlags((prev) => _.assign({}, prev, {[label]: isValidatedLabel === null ? false : !isValidatedLabel}))}
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


const handlePuReview = async ({puData, reviewStatus, issueList, currentUser, setIsSubmitting, setPuData}): Promise<boolean> => {
    let comment = _.join(issueList, ',');

    const newData = _.assign({}, puData, {
        reviewStatus,
        comment: reviewStatus === null ? null : comment,
        reviewedAt: reviewStatus === null ? null : new Date(),
        reviewedByContributorId: reviewStatus === null ? null : currentUser.contributorId
    });

    try {
        setIsSubmitting(true);

        const url = `/api/pus/${puData.id}`;
        const resp = await axios.put(url, {data: newData, contributor: currentUser.contributorId});
        console.log('ISSUES RESP:', resp.data);
        setPuData(resp.data.data);
        return true;
    } catch (e) {
        console.log('handlePuReview submission error:', e);
        return false;
    } finally {
        setIsSubmitting(false);
    }

}

function MainView({puData, setPuData, setPuCode, puCodes, isLoadingPuData, stats, delim, currentUser, isSubmitting, setIsSubmitting, issueFlags, setIssueFlags}) {
    // const theme = useTheme();

    const [currentContrib, setCurrentContrib] = useState<string>(null);
    const [currentContribDisplayName, setCurrentContribDisplayName] = useState<string>(null);
    const [currentCreatedAfter, setCurrentCreatedAfter] = useState<string>(null);
    const [currentDoctType, setCurrentDoctType] = useState<string>(null);

    const [currentDisplayName, setcurrentDisplayName] = useState<string>(null);

    const [contribId, setContribId] = useState<string>(null);
    const [createdAfter, setCreatedAfter] = useState<string>(null);
    const [docType, setDoctType] = useState<'' | 'imagesOnly' | null>(null);
    const [destUrl, setDestUrl] = useState<string>(null);

    const [loadingIssue, setLoadingIssue] = useState<string | null>(null);
    const [issueBucketUrls, setIssueBucketUrls] = useState<any>({});

    useEffect(() => {
        const params = new URLSearchParams(globalThis?.window?.location?.search);
        const addressContrib = params.get('displayName') || '';
        const addressCreatedAfter = params.get('createdAfter') || '';
        const addressDocType = params.get('docType') || '';

        setCreatedAfter(addressCreatedAfter);
        setContribId(addressContrib ? 'mine' : '');
        setDoctType(addressDocType as '' | 'imagesOnly');

        setcurrentDisplayName(localStorage?.getItem(KEY_CONTRIBUTOR_DISPLAYNAME));

        setCurrentContrib(addressContrib ? 'mine' : '');
        setCurrentContribDisplayName(addressContrib);
        setCurrentCreatedAfter(addressCreatedAfter);
        setCurrentDoctType(addressDocType);

        params.delete('pu');

        let issueUrls = {};
        for (const [key, {label, count}] of _.toPairs(stats)) {
            issueUrls[key] = `/pus/${key.toLowerCase()}?${params.toString()}`;
        }

        setIssueBucketUrls(issueUrls);
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

        if(docType === 'imagesOnly') {
            params.set('docType', docType);
        }else {
            params.delete('docType');
        }

        params.delete('pu');

        setDestUrl(`${window.location.pathname}?${params.toString()}`);
    }, [contribId, createdAfter, docType]);

    const theme = useTheme();
    const matches = useMediaQuery(theme.breakpoints.down('sm'));

    const makeStack = (text, chip) => {
        return <Stack direction={ matches ? 'column' : 'row'} alignItems={'center'}>
            <Typography align={matches ? 'center' : 'inherit'} fontSize={'small'}>{text}</Typography>
            <Chip label={chip} sx={{display: {sx: 'none'}, ml: 1}} />
        </Stack>
    }
    //{ mt: 20, ml: {sm: 35, xs: 2}, mr: {sm: 4, xs: 0}}
    return <Stack spacing={4} alignItems={'center'} sx={{ mt: 20, ml: matches ? 5 : 4, mr: 4, maxWidth: '95%'}} style={{display: 'flex', flexDirection: 'column', minHeight: '100vh'}}>

        <Stack direction="row" alignItems={'center'} spacing={matches ? 1 : 2}>
            <Stack direction={'row'} spacing={1} style={{color: 'gray'}} alignItems={'center'}>
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
                <ToggleButton value="" >
                    <Stack direction={'row'} spacing={1}>
                        <GroupsSharpIcon/>
                        { matches ? null : <Typography>Everyone</Typography>}
                    </Stack>
                </ToggleButton>
                <ToggleButton value="mine" >
                    <Stack direction={'row'} spacing={1}>
                        <PersonSharpIcon/>
                        { matches ? null : <Typography title={currentContribDisplayName ?? currentUser?.displayName}>
                            {currentContribDisplayName && currentContribDisplayName !== currentUser?.displayName ? 'Theirs' : 'Mine'}</Typography>}
                    </Stack>
                </ToggleButton>
            </ToggleButtonGroup>

            <ToggleButtonGroup
                value={createdAfter}
                exclusive={true}
                onChange={(evt, value) => {
                    if(value === createdAfter || value == null) return;
                    setCreatedAfter(value);
                }}>
                <ToggleButton value="">
                    <Stack direction={'row'} spacing={1}>
                        <HistorySharpIcon/>
                        { matches ? null : <Typography>All Time</Typography>}
                    </Stack>
                </ToggleButton>
                <ToggleButton value="2023-04-10">
                    <Stack direction={'row'} spacing={1}>
                        <HistoryToggleOffSharpIcon/>
                        { matches ? null : <Typography noWrap={true}>After Apr 10th</Typography>}
                    </Stack>
                </ToggleButton>
            </ToggleButtonGroup>

            <ToggleButtonGroup
                value={docType}
                exclusive={true}
                onChange={(evt, value) => {
                    if(value === docType || value == null) return;
                    setDoctType(value);
                }}>
                <ToggleButton value="">
                    <Stack direction={'row'} spacing={1}>
                        <PictureAsPdfSharpIcon/>
                        { matches ? null : <Typography>All</Typography>}
                    </Stack>
                </ToggleButton>
                <ToggleButton value="imagesOnly">
                    <Stack direction={'row'} spacing={1}>
                        <InsertPhotoSharpIcon/>
                        { matches ? null : <Typography>JPG</Typography>}
                    </Stack>
                </ToggleButton>
            </ToggleButtonGroup>

            <Button size={'large'} disabled={currentContrib === contribId && currentCreatedAfter === createdAfter && currentDoctType === docType} href={destUrl}>
                Apply
            </Button>
        </Stack>

        <ButtonGroup fullWidth={true} variant="outlined">
            {
                _.toPairs(stats).map(([key, {label, count}]) => {

                    return <LoadingButton
                        href={issueBucketUrls[key]}
                        color={'secondary'}
                        title={key}
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

        <Box style={{display: 'flex', flexDirection: 'row', flexGrow: 2, width: '100%', position: 'relative', minHeight: '50vh'}}>
            {
                (puData ?


                        <PollingUnitReviewView puData={puData} setPuData={setPuData} currentUser={currentUser}
                                               isSubmitting={isSubmitting} setIsSubmitting={setIsSubmitting}
                                               issueFlags={issueFlags} setIssueFlags={setIssueFlags}/>

                        :
                        <Typography style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'row',
                            flexGrow: 2,
                            width: '100%'
                        }}>Nothing data to display</Typography>
                )



            }
            <Box style={{
                display: isLoadingPuData ? 'flex' : 'none',
                position: 'absolute',
                background: 'rgba(255,255,255,0.7)',
                zIndex: 100,
                flexDirection: 'row', justifyContent: 'center',
                alignItems: 'center', flexGrow: 2, width: '100%', height: '100%'}}>
                <Stack alignItems={'center'} spacing={4}>
                    <CircularProgress color={"success"} size={100} />
                    <Typography variant={'h4'} color={'gray'}>Loading...</Typography>
                </Stack>
            </Box>
        </Box>

        <Box style={{display: 'flex', flexDirection: 'row', flexShrink: 1, width: '100%'}}>
            <PaginationView componentId={'pagination-bottom'} puData={puData} puCodes={puCodes} setPuCode={setPuCode}/>
        </Box>
    </Stack>
}