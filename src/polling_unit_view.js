import axios from "axios";
import {capitalize, Card, CardContent, CardMedia, Typography} from "@material-ui/core";
import {Button, Checkbox, FormControlLabel, Link, TextField} from "@mui/material";
import Box from "@mui/material/Box";
import _ from "lodash";
import React from "react";
import {KEY_CONTRIBUTOR} from "../pages";
import url from "url";
import LoadingButton from "@mui/lab/LoadingButton";


export const PollingResultQuestionnaireView = ({pollingUnit, puData, setPuData, isSubmitting, setIsSubmitting, setAlert}) => {
    const pu = pollingUnit;

    const submitPollingData = async () => {
        const url = `/api/pus/${pu._id}`;
        console.log('submitted pu data url:', url, puData);

        setIsSubmitting(true);

        try{
            const data = puData || {votesLp: undefined, votesNnpp: undefined, votesPdp: undefined, votesApc: undefined};
            const resp = await axios.post(url, {pu, puData: data, contributor: globalThis?.localStorage?.getItem(KEY_CONTRIBUTOR)});
            console.log('submitted pu data', resp);

            setAlert({type: 'success', message: `Submitted numbers for unit "${pu.pu_code}" successfully!`});
        } catch (e) {
            setAlert({type: 'error', message: `Error occurred while submitting for "${pu.pu_code}"!`});
        }finally {
            setIsSubmitting(false);
        }
    }

    return <Box component="form" sx={{'& > :not(style)': {m: 1, width: '25ch'},}} noValidate autoComplete="off">
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
        <FormControlLabel
            label="Is PU name correct?"
            control={
                <Checkbox
                    checked={puData.isPuNameCorrect}
                    onChange={(evt) => {
                        setPuData({isPuNameCorrect: evt.target.value});
                    }}
                />
            }
        />
        <FormControlLabel
            label="Is result legible?"
            control={
                <Checkbox
                    checked={puData.isResultLegible}
                    onChange={(evt) => {
                        setPuData({isResultLegible: evt.target.value});
                    }}
                />
            }
        />
        <br/>

        <LoadingButton
            size="small"
            color="secondary"
            onClick={() => submitPollingData()}
            loading={isSubmitting}
            loadingPosition="start"
            variant="text"
        >
            <span>Submit</span>
        </LoadingButton>
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
                            <div style={{maxWidth: "100%", height: '100%', position: 'relative'}}>
                                <iframe width={'80%'} height={'70vh'} src={pu.document?.url} frameBorder={0}
                                        seamless style={{height: '70vh', marginTop: '1em'}}/>
                            </div>
                            <PollingResultQuestionnaireView pollingUnit={pu} puData={puData} setPuData={setPuData}
                                                            isSubmitting={isSubmitting} setIsSubmitting={setIsSubmitting} setAlert={setAlert} />
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