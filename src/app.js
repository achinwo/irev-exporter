import React, { useState, useEffect } from "react";
import { generateUsername } from "unique-username-generator";
import {
    Grid,
    Typography,
    AppBar,
    Button,
    CssBaseline,
    Divider,
    Drawer,
    IconButton,
    Link,
    Menu,
    MenuItem,
    Stack,
    Toolbar,
} from "@mui/material";
import axios from "axios";
import Box from "@mui/material/Box";
import _ from "lodash";
import MenuIcon from "@mui/icons-material/Menu";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import { Analytics } from "@vercel/analytics/react";
import AccountCircle from '@mui/icons-material/AccountCircle';
import MetaHead from "../src/MetaHead";
import {DrawerView} from './drawer_view';
import {MainBody} from './main_view';
import {ElectionType, KEY_CONTRIBUTOR, KEY_ELECTION_TYPE, STATES} from "./ref_data";
import {AccountDiaglogView} from "./account_view";

export const App = ({stateId: initialStateId, mainComponent, mainComponentProps, electionType: initialElectionType, pageTitle, suppressDrawer}) => {
    const [states, setStates] = useState([]);
    const [stateId, setStateId] = useState(initialStateId || null);
    const [selectedState, setSelectedState] = useState(null);
    const [selectedLga, setSelectedLga] = useState(null);
    const [selectedWard, setWard] = useState(null);
    const [selectedPu, setSelectedPu] = useState(null);
    const [isLoadingPuData, setIsLoadingPuData] = useState(false);
    const [electionType, setElectionType] = useState(initialElectionType || null);

    // Setting up states for InfiniteScroll
    // const [scrollData, setScrollData] = useState();
    // const [hasMoreValue, setHasMoreValue] = useState(true);
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const [contributorName, setContributorName] = React.useState(
        globalThis?.localStorage?.getItem(KEY_CONTRIBUTOR) || generateUsername()
    );
    const [displayName, setDisplayName] = React.useState(null);
    const [isContribFormValid, setIsContribFormValid] = React.useState(null);
    const [currentUser, setCurrentUser] = React.useState(null);

    const [stats, setStats] = useState({state: [], ward: []});

    const [isOpen, setIsOpen] = useState(false);

    const [anchorEl, setAnchorEl] = React.useState(null);
    const open = Boolean(anchorEl);

    const handleMenuClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleDrawerToggle = () => {
        setMobileOpen((prevState) => !prevState);
    };

    const drawerWidth = 240;

    const fetchStates = async () => {
        const response = await axios.get(`/api/states?electionType=${electionType}`);
        setStates(response.data);
    };

    async function saveContributorName(newValue, dispName) {
        const contribId = _.trim(newValue)
        const dispNameClean = _.trim(dispName);
        localStorage.setItem(KEY_CONTRIBUTOR, contribId);

        let user;

        if(currentUser){
            user = await axios.put(`/api/users/${currentUser.id}`, {contributorId: contribId, displayName: dispNameClean});
        } else {
            user = await axios.post(`/api/users`, {contributorId: contribId, displayName: dispNameClean});
        }

        setContributorName(contribId);
        setDisplayName(dispNameClean);

        console.log("saved user data:", user);
    }


    useEffect(async () => {
        const res = await axios.get(`/api/states/stats?electionType=${electionType}`);
        let rows = [];
        const {state: stateData, ward: wardData, validationReturned} = res.data.data;

        for (const state of STATES) {
            const stat = _.find(stateData || res.data.data, s => s.id === state.id);
            const submitted = _.toInteger(stat?.submittedCount || 0);
            const row = {
                id: state.id,
                resultGuberCount: state.resultGuberCount,
                progress: (submitted / state.resultCount) * 100,
                submittedCount: submitted,
                resultCount: state.resultCount,
                wardCount: state.wardCount,
                lgaCount: state.lgaCount,
                puCount: state.puCount,
                name: state.name,
            };
            rows.push(row);
        }

        const stats = {state: rows, ward: wardData,
            validationReturned, validationReturnedWards: validationReturned.map(r => r.wardId)};

        console.log('STATS', stats);

        setStats(stats);
    }, [stateId, electionType]);

    useEffect(async () => {
        setIsContribFormValid(_.trim(contributorName) && _.trim(displayName || '') && _.trim(contributorName) !== _.trim(displayName || ''));
    }, [displayName, contributorName]);

    useEffect(async () => {

        setElectionType(localStorage.getItem(KEY_ELECTION_TYPE) || ElectionType.PRESIDENTIAL);
        const contributor = localStorage.getItem(KEY_CONTRIBUTOR);

        if (!contributor || contributor === 'null') {
            const contribName = contributorName === 'null' ? generateUsername() : contributorName
            localStorage.setItem(KEY_CONTRIBUTOR, contribName);

            setContributorName(contribName);
            console.log("initialized contributor name:", contribName);
        } else {
            try{
                const resp = await axios.get(`/api/users/${_.trim(encodeURIComponent(contributor))}`);
                setCurrentUser(resp.data.data);
                setDisplayName(resp.data.data?.displayName || displayName);
                setContributorName(resp.data.data?.contributorId || contributor);
            } catch (e) {
                console.error('Unable to fetch user by conributor id:', contributor, e.stack);
            }
        }

        await fetchStates();
    }, []);

    useEffect(async () => {
        console.log("fetching for state:", stateId);
        if (!stateId) {
            setSelectedPu(null);
            setSelectedState(null);
            return;
        }

        const response = await axios.get(`/api/states/${stateId}`);
        //console.log('LGA', response.data);

        setSelectedState(response.data);
    }, [stateId]);

    useEffect(async () => {
        console.log("fetching for Ward:", selectedWard);

        if (!selectedWard) {
            setWard(null);
            setSelectedPu(null);
            return;
        }

        try {
            setIsLoadingPuData(true);

            const headers = {
                'x-election-type': electionType
            };

            const response = await axios.get(`/api/pus/${selectedWard._id}`, {headers});
            console.log("PUS", response.data);

            setSelectedPu(response.data);
        } finally {
            setIsLoadingPuData(false);
        }
    }, [selectedWard, electionType]);

    const handleClose = () => {
        setIsOpen(false);
        setContributorName(localStorage.getItem(KEY_CONTRIBUTOR));
    };

    let xlsMenu = [];

    if(selectedLga){
        xlsMenu.push(<MenuItem onClick={handleMenuClose} key={'menu-1'}>
            <Link href={`/api/downloads/${selectedLga.lga.lga_id}?stateId=${selectedLga.state.state_id}`} underline="none">
                {`Download LGA "${selectedLga.lga.name}"`}
            </Link>
        </MenuItem>);

        xlsMenu.push(<Divider key={'menu-divider'}/>);
    }

    xlsMenu.push(
        <MenuItem onClick={handleMenuClose} key={'menu-collated'}>
            <Link href={`/api/downloads${stateId ? `?stateId=${stateId}&electionType=${electionType}` : ''}`} underline="none">
                {`Download Collated${stateId ? ` ${_.find(STATES, (s) => s.id === _.toInteger(stateId))?.name}` : ''} (.xlsx)`}
            </Link>
        </MenuItem>);

    let view = xlsMenu;
    if (selectedPu) {
        view = _.concat(
            [<MenuItem onClick={handleMenuClose} key={'menu-3'}>
                <Link href={`/api/downloads/${selectedPu.wards[0]._id}?stateId=${stateId}`} underline="none">
                    {`Download Ward "${selectedPu.wards[0].name}"`}
                </Link>
            </MenuItem>], xlsMenu);
    }

    const MainView = mainComponent ? mainComponent : MainBody;

    return (
        <>
            <MetaHead />
            <Box sx={{ display: "flex" }}>
                <CssBaseline />
                <AppBar component="nav" color={'info'}>
                    <Toolbar>

                        { !suppressDrawer &&
                        <IconButton
                            color="inherit"
                            aria-label="open drawer"
                            edge="start"
                            onClick={handleDrawerToggle}
                            sx={{ mr: 2, display: { sm: "block" } }}
                        >
                            <MenuIcon />
                        </IconButton>
                        }

                        <Box display="flex" alignItems="center" style={{ width: "100%" }}>
                            <Box flexGrow={1}>
                                <Typography variant="h6" sx={{ my: 2 }}>
                                    {pageTitle || selectedState?.name}
                                </Typography>
                            </Box>
                            <Stack direction={"row"}>
                                <div>
                                    <Button
                                        id="basic-button"
                                        aria-controls={open ? "basic-menu" : undefined}
                                        aria-haspopup="true"
                                        aria-expanded={open ? "true" : undefined}
                                        onClick={handleMenuClick}
                                        color={"secondary"}
                                        sx={{mt: 2, mr: 2}}
                                    >
                                        <DownloadRoundedIcon/>
                                    </Button>

                                    <Menu
                                        id="basic-menu"
                                        anchorEl={anchorEl}
                                        open={open}
                                        onClose={handleMenuClose}
                                        MenuListProps={{
                                            "aria-labelledby": "basic-button",
                                        }}>
                                        {view}
                                    </Menu>
                                </div>

                                <IconButton
                                    onClick={() => setIsOpen(!isOpen)}
                                    sx={{ mt: 1, ml: 1, mr: 1 }}
                                >
                                    <AccountCircle fontSize={'large'} />
                                </IconButton>
                            </Stack>
                        </Box>
                    </Toolbar>
                </AppBar>
                <Box component="nav">
                    <Drawer
                        variant="temporary"
                        anchor="left"
                        open={mobileOpen}
                        container={globalThis?.window?.document?.body}
                        onClose={() => {
                            console.log(arguments);
                        }}
                        ModalProps={{
                            keepMounted: true, // Better open performance on mobile.
                            onBackdropClick: handleDrawerToggle,
                        }}
                        sx={{
                            display: { xs: !suppressDrawer ? "block" : "none", sm: "none" },
                            "& .MuiDrawer-paper": {
                                boxSizing: "border-box",
                                width: drawerWidth,
                            },
                        }}
                    >
                        <DrawerView handleDrawerToggle={handleDrawerToggle}
                                    state={selectedState} lga={selectedLga}
                                    ward={selectedWard} pu={selectedPu}
                                    setWard={setWard} setLga={setSelectedLga}
                                    stats={stats} stateId={stateId} setStateId={setStateId} states={states}
                                    electionType={electionType} setElectionType={setElectionType}
                        />
                    </Drawer>
                    <Drawer
                        variant="permanent"
                        sx={{
                            display: { xs: "none", sm: !suppressDrawer ? "block" : "none" },
                            "& .MuiDrawer-paper": {
                                boxSizing: "border-box",
                                width: drawerWidth,
                            },
                        }}
                        open
                    >
                        <DrawerView handleDrawerToggle={handleDrawerToggle} state={selectedState} lga={selectedLga} pu={selectedPu}
                                    setWard={setWard} setLga={setSelectedLga} stats={stats}
                                    stateId={stateId} setStateId={setStateId} states={states} electionType={electionType} setElectionType={setElectionType} />
                    </Drawer>
                </Box>

                <Grid
                    container
                    spacing={1}
                    sx={{ pb: 18 }}
                    alignItems="center"
                    justifyContent={"center"}
                    style={{ maxWidth: "100%", height: "100vh", overflowY: "scroll" }}
                >
                    <MainView isLoadingPuData={isLoadingPuData} selectedPu={selectedPu} stats={stats} electionType={electionType} {...(mainComponentProps || {})}/>
                </Grid>

                <AccountDiaglogView handleClose={handleClose} isOpen={isOpen} setIsOpen={setIsOpen}
                                    displayName={displayName} contributorName={contributorName}
                                    setDisplayName={setDisplayName} setContributorName={setContributorName}
                                    isContribFormValid={isContribFormValid} saveContributorName={saveContributorName}/>
            </Box>
            <Analytics />
        </>
    );
};


