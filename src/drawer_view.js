import Box from "@mui/material/Box";
import {
    Button,
    ButtonGroup,
    Chip,
    Collapse,
    Divider, FormControl, InputLabel,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    ListSubheader, MenuItem, Select, Stack,
    Typography
} from "@mui/material";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import React from "react";
import _ from "lodash";
import FaceIcon from "@mui/icons-material/Face";
import {ElectionType, KEY_ELECTION_TYPE} from "./ref_data";
import ErrorSharpIcon from '@mui/icons-material/ErrorSharp';


export const WardSummaryView = ({ward, stats, electionType}) => {
    let wardStat = _.find(stats.ward, w => w.wardId === ward._id);
    console.log('WARD', wardStat, ward);
    const getResult = (data) => data[electionType === ElectionType.PRESIDENTIAL ? 'resultCount' : 'resultGuberCount'];

    return <Stack direction={'row'} spacing={1}>
        <Chip label={`#${ward.code}`} size="small" />
        <Chip label={`${wardStat?.wardCount || ''}${ward.stats ? (wardStat?.wardCount && '/' || '') + getResult(ward.stats) : ''}`}
              color={_.toInteger(wardStat?.wardCount || 0) === getResult(ward.stats) ? 'success' : "secondary"}
              title={`Results submitted`}
              variant={_.toInteger(wardStat?.wardCount || 0) >= getResult(ward.stats) ? 'filled' : "outlined"} size="small" />
        { wardStat?.lastContributorUsername &&
            <Chip sx={{maxWidth: 100}} title={`Last contributor ${wardStat.lastContributorUsername}`} icon={<FaceIcon/>}
                  label={wardStat.lastContributorUsername} color="primary" variant="outlined" size="small"/>
        }
    </Stack>
}

export const DrawerView = ({handleDrawerToggle, state, lga, ward, pu, setWard, setLga, stats, stateId, setStateId, states, electionType, setElectionType}) => {
    const selectedState = state;
    const selectedLga = lga;
    const setSelectedLga = setLga;
    const selectedWard = ward;
    const puData = (pu || {}).polling_data;
    console.log('DRAWER PU', pu);

    const onElectionTypeClicked = (value) => {
        localStorage.setItem(KEY_ELECTION_TYPE, value);
        setElectionType(value);
    }

    return <Box sx={{textAlign: "center"}}>
        <Stack direction={'column'} spacing={1} sx={{m: 1}} alignItems={'center'}>
            {/*<Box display="flex" alignItems="center">*/}
            {/*    <Box flexGrow={1}>*/}
            {/*        <Typography variant="h6" sx={{my: 2}}>*/}
            {/*            {selectedState?.name}*/}
            {/*        </Typography>*/}
            {/*    </Box>*/}
            {/*    <Box>*/}
            {/*        /!*<IconButton onClick={handleDrawerToggle}>*!/*/}
            {/*        /!*  <CloseIcon/>*!/*/}
            {/*        /!*</IconButton>*!/*/}

            {/*    </Box>*/}
            {/*</Box>*/}
            <FormControl fullWidth={true} sx={{ m: 1, minWidth: 120 }} size="small">
                <InputLabel>State</InputLabel>
                <Select
                    labelId="demo-simple-select-helper-label"
                    value={stateId ? stateId - 1 : null}
                    onChange={(event) =>
                        setStateId(
                            event.target.value === ""
                                ? null
                                : _.toInteger(event.target.value) + 1
                        )
                    }
                    label="State"
                >
                    <MenuItem value="">
                        <em>None</em>
                    </MenuItem>

                    {states.map((state, idx) => {
                        const containsReturnState = _.sumBy(stats.validationReturned, (r) => r.stateId == state.id ? 1 : 0);
                        return (
                            <MenuItem
                                value={_.toString(state.id - 1)}
                                key={`tab-${idx}`}
                            >
                                <Stack spacing={1} direction={'row'}>
                                    {containsReturnState ? <Chip size={'small'} label={containsReturnState} color={'error'}/> : null}
                                    <Typography>{state.name}</Typography>
                                </Stack>
                            </MenuItem>
                        );
                    })}
                </Select>
                {/*<FormHelperText>Select a state</FormHelperText>*/}
            </FormControl>
            <ButtonGroup fullWidth={true} variant="outlined" aria-label="outlined primary button group">
                <Button variant={electionType === ElectionType.GOVERNORSHIP ? 'contained' : 'outlined'} onClick={() => onElectionTypeClicked(ElectionType.GOVERNORSHIP)}>Gov.</Button>
                <Button variant={electionType === ElectionType.PRESIDENTIAL ? 'contained' : 'outlined'} onClick={() => onElectionTypeClicked(ElectionType.PRESIDENTIAL)}>Pres.</Button>
            </ButtonGroup>
        </Stack>

        <Divider/>
        <List
            subheader={
                <ListSubheader component="div" id="nested-list-subheader">
                    LGAs
                </ListSubheader>
            }
        >
            {(selectedState?.lgas?.data || []).map((lga, idx) => {

                const containsReturnLga = _.find(lga.wards, w => (stats.validationReturnedWards || []).includes(w._id));

                return (
                    <>
                        <ListItem
                            onClick={() =>
                                setSelectedLga(
                                    lga.lga.lga_id === selectedLga?.lga.lga_id ? null : lga
                                )
                            }
                            key={idx}
                        >
                            <ListItemText primary={
                                <Stack sx={{pl: containsReturnLga ? 0 : 2 }} spacing={1} direction={'row'}>
                                    {containsReturnLga ? <ErrorSharpIcon fontSize={'small'} color={'error'}/> : null}
                                    <Typography>{lga.lga.name}</Typography>
                                </Stack>
                            }/>
                            {lga.lga.lga_id === selectedLga?.lga.lga_id ? (
                                <ExpandLess/>
                            ) : (
                                <ExpandMore/>
                            )}
                        </ListItem>

                        <Collapse
                            in={lga.lga.lga_id === selectedLga?.lga.lga_id}
                            timeout="auto"
                            unmountOnExit
                            key={idx}
                        >
                            <List component="div" disablePadding={true}>
                                {lga.wards.map((ward, idx) => {
                                    const containsReturn = (stats.validationReturnedWards || []).includes(ward._id);
                                    return (
                                        <ListItemButton
                                            key={idx}
                                            onClick={() => {
                                                setWard(ward);
                                                handleDrawerToggle();
                                            }}
                                            selected={ward._id === selectedWard?._id}
                                        >
                                            <ListItemText
                                                primary={
                                                    <Stack sx={{pl: containsReturn ? 0 : 2 }} spacing={1} direction={'row'}>
                                                        {containsReturn ? <ErrorSharpIcon fontSize={'small'} color={'error'}/> : null}
                                                        <Typography>{ward.name}</Typography>
                                                    </Stack>
                                                }
                                                secondary={
                                                <Stack sx={{pl: 2}} direction={'row'}>
                                                    <WardSummaryView ward={ward} puData={puData} stats={stats} electionType={electionType}/>
                                                </Stack>
                                            }
                                            />
                                        </ListItemButton>
                                    );
                                })}
                            </List>
                        </Collapse>
                    </>
                );
            })}
        </List>
    </Box>
}