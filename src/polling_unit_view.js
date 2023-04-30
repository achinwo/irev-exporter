import axios from "axios";
import {
    capitalize, Card, CardContent, CardMedia, Typography,
    Checkbox,
    FormControl,
    FormControlLabel,
    FormLabel,
    Link,
    Radio,
    RadioGroup, Stack,
    TextField, IconButton, Chip
} from "@mui/material";
import Box from "@mui/material/Box";
import _ from "lodash";
import url from "url";
import LoadingButton from "@mui/lab/LoadingButton";
import ReactPanZoom from 'react-image-pan-zoom-rotate';
import {DataSource, ElectionType, KEY_CONTRIBUTOR, ReviewStatus} from "./ref_data";
import React, { useRef } from 'react';
import { useIsVisible } from 'react-is-visible';
import WarningIcon from '@mui/icons-material/Warning';
import VisibilitySharpIcon from '@mui/icons-material/VisibilitySharp';
import VerifiedSharpIcon from '@mui/icons-material/VerifiedSharp';
import ErrorSharpIcon from '@mui/icons-material/ErrorSharp';

const RESULT_ILLEGIBILITY_STATE = {
    LEGIBLE: false,
    ILLEGIBLE: true,
    UNANSWERED: undefined
}

export const PollingResultQuestionnaireView = ({pollingUnit, puData, setPuData, isSubmitting, setIsSubmitting, setAlert, electionType}) => {
    const pu = pollingUnit;

    const isValidated = puData.reviewStatus === ReviewStatus.VALIDATED;
    let ValidationIcon = isValidated ? VerifiedSharpIcon : ErrorSharpIcon;

    const submitPollingData = async () => {
        const recordId = puData?.createdAt ? puData.id : pu._id;
        const url = `/api/pus/${recordId}?electionType=${electionType}`;
        console.log('submitted pu data url:', url, puData);

        const toBool = (value) => {
            return ['on', true, 1].includes(value);
        }

        setIsSubmitting(true);

        try{
            let data = puData || {votesLp: undefined, votesNnpp: undefined, votesPdp: undefined, votesApc: undefined};

            data = _.assign({}, data, {
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

            const headers = {'x-election-type': electionType, 'x-user': contributor};

            let resp;
            if(puData?.createdAt){
                data.reviewedByContributorId = data.reviewedAt = data.reviewStatus = null;
                resp = await axios.put(url, {data, contributor: contributor}, {headers});
            } else {
                resp = await axios.post(url, {pu, puData: data, contributor: contributor}, {headers});
            }

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

    const options = {
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };

    const submitPanelView = () => {

        if(puData?.createdAt){
            return <Stack alignItems={'center'} spacing={2}>
                <Stack direction={'row'} alignItems={'center'} spacing={1}>
                    <Typography sx={{fontStyle: 'italic'}} variant="subtitle1" style={{color: 'grey'}}>
                        Submitted by {puData.contributorDisplayName} on {new Date(puData.updatedAt).toLocaleDateString("en-US", options)}
                    </Typography>
                    {puData.documentSize === pu.document.size ? null : <WarningIcon title={'detected size mismatch from original submission'} fontSize={'small'} color={'warning'}/>}


                    <IconButton href={`/pus/${puData.puCode.replaceAll('/', '-')}`} color="success">
                        {puData.reviewStatus ? <ValidationIcon color={isValidated ? 'success' : 'error'}/> : <VisibilitySharpIcon />}
                    </IconButton>
                </Stack>

                {
                    (puData?.reviewStatus && !isValidated && puData?.comment) &&
                    <Stack direction={'row'} alignItems={'center'} spacing={1}>
                        <Typography sx={{fontWeight: 'bold'}}>Review Comment:</Typography>
                        {puData.comment.split(',').map((fld, idx) => {
                            return <Chip key={idx} label={_.startCase(fld)}/>
                        })}
                    </Stack>
                }

                {
                    (puData?.reviewStatus && !isValidated) &&
                    <LoadingButton
                        size="medium"
                        color="secondary"
                        onClick={() => submitPollingData()}
                        loading={isSubmitting}
                        loadingPosition="start"
                        variant="outlined"
                    >
                        <span>Resubmit</span>
                    </LoadingButton>
                }
            </Stack>

        } else if(_.isUndefined(isIllegibleResult)){
            return null;
        }

        return <LoadingButton
            size="medium"
            color="secondary"
            onClick={() => submitPollingData()}
            loading={isSubmitting}
            loadingPosition="start"
            variant="outlined"
        >
            <span>Submit</span>
        </LoadingButton>;
    }

    //isIllegibleResult === RESULT_ILLEGIBILITY_STATE.LEGIBLE ? '25ch' :
    return <Box component="form" sx={{'& > :not(style)': {m: 1, width: '80%'},}} noValidate autoComplete="off">
        {isIllegibleResult === RESULT_ILLEGIBILITY_STATE.LEGIBLE ?
            legibleResultView
        :
            (isIllegibleResult === RESULT_ILLEGIBILITY_STATE.ILLEGIBLE ? illegibleResultView : unansweredView)
        }

        {submitPanelView()}
    </Box>;
}


const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
};

export const PollingUnitView = ({pollingUnit, puData, setPuData, isSubmitting, setIsSubmitting, setAlert, electionType}) => {

    const pu = pollingUnit;
    const nodeRef = useRef();
    const isVisible = useIsVisible(nodeRef, {once: true});

    let priorVersionLabel = '';

    if(puData.puCode === '01/01/03/043') {
        console.log('[PollingUnitView] pudata', puData);
    }

    let border = {};

    const isValidated = puData.reviewStatus === ReviewStatus.VALIDATED;
    let ValidationIcon = isValidated ? VerifiedSharpIcon : ErrorSharpIcon;

    if(puData.reviewStatus){
        border = {border: 1, borderColor: isValidated ? 'success.main' : 'error.main'};
    }

    return (
        <Card elevation={4} xs={{mt: 20}} sx={border} style={{maxWidth: "100%"}} ref={nodeRef}>
            {isVisible && <CardContent align="center" style={{maxWidth: "100%"}}>

                <Stack alignItems={'center'}>
                    <Typography>{capitalize(`${pu.name}`)}</Typography>
                    <Stack direction={'row'} spacing={1} alignItems={'center'}>
                        <Typography>{`PU Code: ${pu.pu_code}`}</Typography>
                        { puData.reviewStatus &&
                            <IconButton href={`/pus/${puData.puCode.replaceAll('/', '-')}`} color="success">
                                <ValidationIcon color={isValidated ? 'success' : 'error'}/>
                            </IconButton>
                        }
                    </Stack>
                    <Typography>{`Updated: ${new Date(pu.updated_at).toLocaleDateString("en-US", options)}${priorVersionLabel}`}</Typography>
                    {
                        puData.reviewStatus && <Typography sx={{fontStyle: 'italic', mb: 2}} style={{color: 'gray'}}>{`Reviewed By: ${puData.reviewedByContributorId}`}</Typography>
                    }
                </Stack>

                {pu.document?.url && (_.trim(url.parse(pu.document.url).pathname) !== '/') ?
                    <>
                        <Link href={pu.document?.url} rel="noopener noreferrer" target="_blank" sx={{mb: 4}}>Document
                            Link {pu.document.url.endsWith('.pdf') ? '(PDF)' : '(JPG)'}</Link>
                        <CardMedia style={{maxWidth: "100%"}}>
                            <Stack>
                                <Box style={{maxWidth: "100%", position: 'relative', overflow: 'hidden'}}>
                                {
                                    pu.document.url.endsWith('.pdf') ?
                                        <div style={{maxWidth: "100%", height: '100%', position: 'relative'}}>
                                            <embed width={'90%'} height={'auto'} src={`${pu.document?.url}#view=Fit&toolbar=1`} frameBorder={0}
                                                    seamless style={{height: 'auto', minHeight:'60vh', marginTop: '1em'}}/>

                                        </div>
                                        :
                                        <ReactPanZoom
                                            image={pu.document.url}
                                            alt={`Result for Polling Unit ${pu.pu_code}`}
                                        />
                                }
                                </Box>
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

            </CardContent>}
        </Card>
    );
}