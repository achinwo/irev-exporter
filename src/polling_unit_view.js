import axios from "axios";
import {
    capitalize, Card, CardContent, CardMedia, Typography,
    Button,
    Checkbox,
    FormControl,
    FormControlLabel,
    FormLabel,
    Grid,
    Link,
    Radio,
    RadioGroup, Stack,
    TextField
} from "@mui/material";
import Box from "@mui/material/Box";
import _ from "lodash";
import url from "url";
import LoadingButton from "@mui/lab/LoadingButton";
import ReactPanZoom from 'react-image-pan-zoom-rotate';
import {BASE_URL_KVDB, DataSource, ElectionType, KEY_CONTRIBUTOR} from "./ref_data";
import React, { useRef } from 'react'
import { useIsVisible } from 'react-is-visible'

const RESULT_ILLEGIBILITY_STATE = {
    LEGIBLE: false,
    ILLEGIBLE: true,
    UNANSWERED: undefined
}

export const PollingResultQuestionnaireView = ({pollingUnit, puData, setPuData, isSubmitting, setIsSubmitting, setAlert, electionType}) => {
    const pu = pollingUnit;

    const submitPollingData = async () => {
        const url = `/api/pus/${pu._id}?electionType=${electionType}`;
        console.log('submitted pu data url:', url, puData);

        const toBool = (value) => {
            return ['on', true, 1].includes(value);
        }

        setIsSubmitting(true);

        try{
            let data = puData || {votesLp: undefined, votesNnpp: undefined, votesPdp: undefined, votesApc: undefined};

            data = _.assign(data, {
                isResultLegible: !toBool(data?.isResultIllegible),
                isPuNameCorrect: !toBool(data?.containsIncorrectPuName),
                electionType: electionType,
                source: DataSource.IREV,
            });

            const contributor = globalThis?.localStorage?.getItem(KEY_CONTRIBUTOR);

            if(!contributor || contributor === 'null'){
                setAlert({severity: 'error', message: `Submission failed due to missing identifiers, ensure display name and contributor ID are set!`});
                return;
            }

            const resp = await axios.post(url, {pu, puData: data, contributor: contributor}, {headers: {'x-election-type': electionType}});
            console.log('submitted pu data', resp.data);

            setPuData(resp.data.data);

            setAlert({severity: 'success', message: `Submitted numbers for unit "${pu.pu_code}" successfully!`});
        } catch (e) {
            setAlert({severity: 'error', message: e?.response?.data?.errorMessage ?? `Error occurred while submitting for "${pu.pu_code}"!`});
        } finally {
            setIsSubmitting(false);
        }
    }

    const fieldsInfo = [
        ['containsIncorrectPuName', 'Incorrect PU name?'],
        ['isInecStampAbsent', 'INEC stamp absent?'],
        ['containsAlterations', 'Contains alterations?'],
        //['isNoneEceightForm', 'None EC8 form?'],
    ];

    let partyFields = ['Lp', 'Nnpp', 'Pdp'];
    if(electionType === ElectionType.GOVERNORSHIP){
        partyFields = _.concat(['Apc', 'Apga'], partyFields);
    }else{
        partyFields = _.concat(['Apc'], partyFields);
    }

    const legibleResultView = <Box sx={{'& > :not(style)': {m: 1, width: '25ch'},}}>
        {
            partyFields.map((tag, key) => {
                return <TextField label={tag.toUpperCase()}
                                  key={key}
                                  value={puData[`votes${tag}`]}
                                  onChange={(evt) => {
                                      const tagKey = `votes${tag}`;
                                      console.log(`setting ${tagKey} to:`, evt.target.value);
                                      setPuData({[tagKey]: evt.target.value});
                                  }}
                                  inputProps={{inputMode: 'numeric', pattern: '[0-9]*'}}
                                  variant="filled"/>
            })
        }
        <br/>
        {
            [['votersAccredited', 'Accredited Voters'], ['votesCast', 'Total Valid Votes']].map(([tag, label]) => {
                return <TextField label={label}
                                  key={tag}
                                  value={puData[tag]}
                                  onChange={(evt) => {
                                      setPuData({[tag]: evt.target.value});
                                  }}
                                  inputProps={{inputMode: 'numeric', pattern: '[0-9]*'}}
                                  variant="filled"/>
            })
        }
        <br/>

        {
            fieldsInfo.map(([fieldName, label], idx) => {
                return <>
                    <FormControlLabel
                        label={label}
                        key={`pu-field-${fieldName}`}
                        control={
                            <Checkbox
                                checked={puData[fieldName]}
                                onChange={(evt) => {
                                    setPuData({[fieldName]: evt.target.value});
                                }}
                            />
                        }
                    />
                </>;
            })
        }
        <br/>
    </Box>;


    const isIllegibleResult = puData?.isResultIllegible;
    const isIllegibleValue = puData?.createdAt ? (puData.isNoneEceightForm ? 'isNoneEceightForm' : 'isResultIllegible') : undefined

    const illegibleResultView = <>
        <FormControl disabled={!_.isUndefined(isIllegibleValue)} fullWidth={true}>
            <FormLabel>
                <Typography variant="h6">Why is this result invalid?</Typography>
            </FormLabel>
            <RadioGroup row name="row-radio-buttons-group" sx={{m: 2}} value={isIllegibleValue} style={{display: 'flex', justifyContent: 'center',
                alignItems: 'center'}}  onChange={(evt) => {
                setPuData({[evt.target.value]: true});
            }}>
                <FormControlLabel style={{ width: 'auto' }} sx={{mr: 2}} value="isResultIllegible" control={<Radio  />} label="It is illegible" />
                <FormControlLabel style={{ width: 'auto' }} sx={{ml: 2}} value="isNoneEceightForm" control={<Radio />} label={`Not a ${(electionType || ElectionType.PRESIDENTIAL).toLowerCase()} EC8`} />
            </RadioGroup>
        </FormControl>
        <br/>
    </>

    const unansweredView = <>

        <FormControl fullWidth={true}>
            <FormLabel id="demo-error-radios">
                <Typography variant="h6">
                Can you read the {(electionType || ElectionType.PRESIDENTIAL).toLowerCase()} election voting numbers?
                </Typography>
            </FormLabel>
            <RadioGroup row name="row-radio-buttons-group1" sx={{m: 2}} style={{display: 'flex', justifyContent: 'center',
                alignItems: 'center'}}  onChange={(evt) => {
                setPuData({isResultIllegible: _.toInteger(evt.target.value) === 1});
            }}>
                <FormControlLabel style={{ width: 'auto' }} sx={{mr: 2}} value="0" control={<Radio  />} label="Yes" />
                <FormControlLabel style={{ width: 'auto' }} sx={{ml: 2}} value="1" control={<Radio />} label="No" />
            </RadioGroup>
        </FormControl>
        <br/>
    </>

    //isIllegibleResult === RESULT_ILLEGIBILITY_STATE.LEGIBLE ? '25ch' :
    return <Box component="form" sx={{'& > :not(style)': {m: 1, width: '80%'},}} noValidate autoComplete="off">
        {isIllegibleResult === RESULT_ILLEGIBILITY_STATE.LEGIBLE ?
            legibleResultView
        :
            (isIllegibleResult === RESULT_ILLEGIBILITY_STATE.ILLEGIBLE ? illegibleResultView : unansweredView)
        }

        {
            _.isUndefined(isIllegibleResult) || puData.createdAt ?

                (puData.createdAt ? <Typography sx={{fontStyle: 'italic'}} variant="subtitle1" style={{color: 'grey'}}>
                    Submitted by {puData.contributorUsername}
                </Typography> : null)

                :
                <LoadingButton
                    size="medium"
                    color="secondary"
                    onClick={() => submitPollingData()}
                    loading={isSubmitting}
                    loadingPosition="start"
                    variant="outlined"
                >
                    <span>Submit</span>
                </LoadingButton>
        }

    </Box>;
}

class ImageWithFallback extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            imageSrc: null,
            error: false,
        };
        this.handleError = this.handleError.bind(this);
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        console.log(`[ImageWithFallback] prevProps:`, BASE_URL_KVDB, prevProps, this.props, prevState, this.props?.pu)

        if(prevProps.convertPdf === this.props.convertPdf || (prevState.imageSrc && !this.state.imageSrc)) return;

        if(this.props.convertPdf){
            this.fetchImage()
        } else {
            this.setState({imageSrc: null});
        }
    }

    componentDidMount() {
        //this.props?.onConvertState(this.state.imageSrc && !this.state.error ? 'SUCCESS' : null);
    }

    async fetchImage() {
        //const endpoint = `/api/doc?url=${encodeURI(this.props.pu.document.url)}`;
        const endpoint = `${BASE_URL_KVDB}/api/polling-data/doc`;
        console.log('[ImageWithFallback] endpoint', endpoint);

        try{
            this.props?.onConvertState('CONVERTING');
            const response = await axios.post(endpoint, {url: this.props.pu.document.url}, {responseType: "arraybuffer"})
            const buffer = Buffer.from(response.data, "binary");
            const blob = new Blob([buffer], { type: "image/png" });
            const urlCreator = window.URL || window.webkitURL;
            const imageUrl = urlCreator.createObjectURL(blob);
            this.setState({ imageSrc: imageUrl });
            this.props?.onConvertState('SUCCESS');
        } catch (error) {
            console.error("[ImageWithFallback] Error fetching image:", error);
            this.setState({ error: true });
            this.props?.onConvertState('FAILED');
        }
    }

    handleError() {
        this.setState({
            imageSrc: null,
            error: true,
        });
    }

    render() {
        const { imageSrc, error } = this.state;
        const { fallbackComponent: FallbackComponent } = this.props;

        return (
            <>
                {imageSrc && !error ? (
                    // <img src={imageSrc} alt="" onError={this.handleError} key={this.props?.pu?.pu_code}/>
                    <Box style={{maxWidth: "100%", position: 'relative', overflow: 'hidden'}}>
                        <ReactPanZoom
                            image={imageSrc}
                            alt={`Result for Polling Unit ${this.props.pu.pu_code}`}
                        />
                    </Box>
                ) : (
                    <FallbackComponent key={this.props?.pu?.pu_code} />
                )}
            </>
        );
    }
}

export const PollingUnitView = ({pollingUnit, puData, setPuData, isSubmitting, setIsSubmitting, setAlert, electionType}) => {

    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    const pu = pollingUnit;
    const nodeRef = useRef();
    const isVisible = useIsVisible(nodeRef, {once: true});
    const isPdf = pu.document?.url && (_.trim(url.parse(pu.document.url).pathname) !== '/') ? pu.document.url.endsWith('.pdf') : false;

    // const endpoint = `${BASE_URL_KVDB}/api/polling-data/doc`;
    // const response = await axios.post(endpoint, {url: query.url},{
    //     responseType: 'arraybuffer',
    //     httpsAgent: new https.Agent({
    //         rejectUnauthorized: false,
    //     })});

    function StandardViewer() {
        return <>
            {
                isPdf ?
                    <div style={{maxWidth: "100%", height: '100%', position: 'relative'}}>
                        <embed width={'90%'} height={'auto'} src={`${pu.document?.url}#view=Fit&toolbar=1`} frameBorder={0}
                               seamless style={{height: 'auto', minHeight:'60vh', marginTop: '1em'}}/>

                    </div>
                    :
                    <Box style={{maxWidth: "100%", position: 'relative', overflow: 'hidden'}}>
                        <ReactPanZoom
                            image={pu.document.url}
                            alt={`Result for Polling Unit ${pu.pu_code}`}
                        />
                    </Box>
            }
        </>;
    }

    const renderBody = () => {

        const onConvertState = (imageConvertState) => {
            setPuData({imageConvertState})
        }

        let label = 'Attempt Convert?';
        if(puData?.imageConvertState === 'SUCCESS'){
            label = 'Successful!';
        } else if (puData?.imageConvertState === 'FAILED'){
            label = 'Convert Failed!'
        }

        return pu.document?.url && (_.trim(url.parse(pu.document.url).pathname) !== '/') ?
            <>
                <Link href={pu.document?.url} rel="noopener noreferrer" target="_blank" sx={{mb: 4}}>Document
                    Link {`${pu.document.url.endsWith('.pdf') ? '(PDF' : '(JPG'} - ${(pu.document.size / (1024 * 1024)).toFixed(2)}MB)`}</Link>

                {isPdf ?
                    <LoadingButton
                        sx={{marginLeft: 2}}
                        size="small"
                        color={puData?.imageConvertState === 'SUCCESS' ? "success" : 'primary'}
                        onClick={() => setPuData({forceImageConvert: puData?.forceImageConvert ? false : true})}
                        loading={puData?.imageConvertState === 'CONVERTING'}
                        loadingPosition="start"
                        variant="text"
                    >
                        <span>{label}</span>
                    </LoadingButton>
                    : null}

                <CardMedia style={{maxWidth: "100%", minHeight: '70vh'}}>
                    <Stack>
                        <ImageWithFallback convertPdf={puData?.forceImageConvert} onConvertState={onConvertState}
                                           pu={pu} fallbackComponent={StandardViewer} />

                        <PollingResultQuestionnaireView pollingUnit={pu} puData={puData} setPuData={setPuData}
                                                        isSubmitting={isSubmitting} setIsSubmitting={setIsSubmitting}
                                                        setAlert={setAlert} electionType={electionType} />

                    </Stack>
                </CardMedia>
            </>
            :
            <>
                <Typography>No Document</Typography>
            </>
    }

    let priorVersionLabel = '';
    // if(!_.isEmpty(pu.old_documents)){
    //
    // }
    //<Grid key={pu._id} item xs={12} sm={12} md={12} lg={12} style={{maxWidth: "100%"}}>
    return (

        <Card elevation={4} xs={{mt: 20}} style={{maxWidth: "100%", minHeight: '50vh'}} ref={nodeRef}>
            {isVisible && <CardContent align="center" style={{maxWidth: "100%"}}>
                <Typography>{capitalize(`${pu.name}`)}</Typography>
                <Typography>{`PU Code: ${pu.pu_code}`}</Typography>
                <Typography>{`Updated: ${new Date(pu.updated_at).toLocaleDateString("en-US", options)}${priorVersionLabel}`}</Typography>
                {renderBody()}

            </CardContent>}
        </Card>
    );
}