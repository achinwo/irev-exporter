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


export const WardSummaryView = ({ward, stats}) => {
    let wardStat = _.find(stats.ward, w => w.wardId === ward._id);
    //console.log('WARD', ward);

    return <Stack direction={'row'} spacing={1}>
        <Chip label={`#${ward.code}`} size="small" />
        {
            !_.isEmpty(wardStat) ?
                <>
                    <Chip label={`${wardStat.wardCount}${ward.stats ? '/' + ward.stats.resultCount : ''}`}
                          color={_.toInteger(wardStat.wardCount) === ward.stats?.resultCount ? 'success' : "secondary"}
                          title={`Results submitted`}
                          variant={_.toInteger(wardStat.wardCount) >= ward.stats?.resultCount ? 'filled' : "outlined"} size="small" />
                    <Chip sx={{maxWidth: 100}} title={`Last contributor ${wardStat.lastContributorUsername}`} icon={<FaceIcon />} label={wardStat.lastContributorUsername} color="primary"  variant="outlined" size="small" />
                </>

                : null
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
                        return (
                            <MenuItem
                                value={_.toString(state.id - 1)}
                                key={`tab-${idx}`}
                            >
                                {state.name}
                            </MenuItem>
                        );
                    })}
                </Select>
                {/*<FormHelperText>Select a state</FormHelperText>*/}
            </FormControl>
            <ButtonGroup fullWidth={true} variant="outlined" aria-label="outlined primary button group">
                <Button disabled={true} variant={electionType !== 'PRESIDENTIAL' ? 'contained' : 'outlined'} onClick={() => setElectionType('GOVERNORSHIP')}>Gov.</Button>
                <Button variant={electionType === 'PRESIDENTIAL' ? 'contained' : 'outlined'} onClick={() => setElectionType('PRESIDENTIAL')}>Pres.</Button>
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
                            <ListItemText primary={lga.lga.name}/>
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
                            <List component="div" disablePadding>
                                {lga.wards.map((ward, idx) => {
                                    return (
                                        <ListItemButton
                                            key={idx}
                                            sx={{pl: 4}}
                                            onClick={() => {
                                                setWard(ward);
                                                handleDrawerToggle();
                                            }}
                                            selected={ward._id === selectedWard?._id}
                                        >
                                            <ListItemText
                                                primary={ward.name}
                                                secondary={<WardSummaryView ward={ward} puData={puData} stats={stats}/>}
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