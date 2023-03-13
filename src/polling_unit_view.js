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
import React from "react";
import {KEY_CONTRIBUTOR} from "../pages";
import url from "url";
import LoadingButton from "@mui/lab/LoadingButton";
import ReactPanZoom from 'react-image-pan-zoom-rotate';

const RESULT_ILLEGIBILITY_STATE = {
    LEGIBLE: false,
    ILLEGIBLE: true,
    UNANSWERED: undefined
}

export const PollingResultQuestionnaireView = ({pollingUnit, puData, setPuData, isSubmitting, setIsSubmitting, setAlert}) => {
    const pu = pollingUnit;

    const submitPollingData = async () => {
        const url = `/api/pus/${pu._id}`;
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
            });

            const contributor = globalThis?.localStorage?.getItem(KEY_CONTRIBUTOR);

            if(!contributor || contributor === 'null'){
                setAlert({type: 'error', message: `Submission failed due to missing identifiers, ensure display name and contributor ID are set!`});
                return;
            }

            const resp = await axios.post(url, {pu, puData: data, contributor: contributor});
            console.log('submitted pu data', resp.data);

            setPuData(resp.data.data);

            setAlert({type: 'success', message: `Submitted numbers for unit "${pu.pu_code}" successfully!`});
        } catch (e) {
            setAlert({type: 'error', message: `Error occurred while submitting for "${pu.pu_code}"!`});
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

    const legibleResultView = <Box sx={{'& > :not(style)': {m: 1, width: '25ch'},}}>
        {
            ['Apc', 'Lp', 'Nnpp', 'Pdp'].map((tag, key) => {
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
            [['votersAccredited', 'Accredited Voters'], ['votesCast', 'Total Votes']].map(([tag, label]) => {
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
                <FormControlLabel style={{ width: 'auto' }} sx={{ml: 2}} value="isNoneEceightForm" control={<Radio />} label="Not a presidential EC8" />
            </RadioGroup>
        </FormControl>
        <br/>
    </>

    const unansweredView = <>

        <FormControl fullWidth={true}>
            <FormLabel id="demo-error-radios">
                <Typography variant="h6">
                Can you read the presidential election voting numbers?
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

export const PollingUnitView = ({pollingUnit, puData, setPuData, isSubmitting, setIsSubmitting, setAlert}) => {

    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    const pu = pollingUnit;

    //<Grid key={pu._id} item xs={12} sm={12} md={12} lg={12} style={{maxWidth: "100%"}}>
    return (

        <Card elevation={4} xs={{mt: 20}} style={{maxWidth: "100%"}}>
            <CardContent align="center" style={{maxWidth: "100%"}}>
                <Typography>{capitalize(`${pu.name}`)}</Typography>
                <Typography>{`PU Code: ${pu.pu_code}`}</Typography>
                <Typography>{`Updated: ${new Date(pu.updated_at).toLocaleDateString("en-US", options)}`}</Typography>
                {pu.document?.url && (_.trim(url.parse(pu.document.url).pathname) !== '/') ?
                    <>
                        <Link href={pu.document?.url} rel="noopener noreferrer" target="_blank" sx={{mb: 4}}>Document
                            Link</Link>
                        <CardMedia style={{maxWidth: "100%", minHeight: '70vh'}}>
                            <Stack>
                                {
                                    pu.document.url.endsWith('.pdf') ?
                                        <div style={{maxWidth: "100%", height: '100%', position: 'relative'}}>
                                            <iframe width={'80%'} height={'70vh'} src={pu.document?.url} frameBorder={0}
                                                    seamless style={{height: '70vh', marginTop: '1em'}}/>

                                        </div>
                                        :
                                        <Box style={{maxWidth: "100%", position: 'relative', overflow: 'hidden'}}>
                                            <ReactPanZoom
                                                image={pu.document.url}
                                                alt={`Result for Polling Unit ${pu.pu_code}`}
                                            />
                                        </Box>
                                }

                                <PollingResultQuestionnaireView pollingUnit={pu} puData={puData} setPuData={setPuData}
                                                                isSubmitting={isSubmitting} setIsSubmitting={setIsSubmitting} setAlert={setAlert} />
                            </Stack>
                        </CardMedia>
                    </>
                    :
                    <>
                        <Typography>No Document</Typography>
                    </>
                }

            </CardContent>
        </Card>
    );
}