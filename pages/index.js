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
  FormControl,
  IconButton,
  InputLabel,
  Link,
  Menu,
  MenuItem,
  Select,
  Stack,
  Toolbar,
} from "@mui/material";
import axios from "axios";
import Box from "@mui/material/Box";
import _ from "lodash";
import MenuIcon from "@mui/icons-material/Menu";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import { Analytics } from "@vercel/analytics/react";
import PersonIcon from "@mui/icons-material/Person";
import MetaHead from "../src/MetaHead";
import {DrawerView} from '../src/drawer_view';
import {MainBody} from '../src/main_view';
import {STATES} from "../src/ref_data";
import {AccountView} from "../src/account_view";

export const KEY_CONTRIBUTOR = "contributor-name";

const App = () => {
  const [states, setStates] = useState([]);
  const [stateId, setStateId] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [selectedLga, setSelectedLga] = useState(null);
  const [selectedWard, setWard] = useState(null);
  const [selectedPu, setSelectedPu] = useState(null);
  const [isLoadingPuData, setIsLoadingPuData] = useState(false);

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
    const response = await axios.get("/api/states");
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
    const res = await axios.get('/api/states/stats');
    let rows = [];
    const {state: stateData, ward: wardData} = res.data.data;

    for (const state of STATES) {
      const stat = _.find(stateData || res.data.data, s => s.id === state.id);
      const submitted = _.toInteger(stat?.submittedCount || 0);
      const row = {
        id: state.id,
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

    setStats({state: rows, ward: wardData});
  }, [stateId]);

  useEffect(async () => {
    setIsContribFormValid(_.trim(contributorName) && _.trim(displayName || '') && _.trim(contributorName) !== _.trim(displayName || ''));
  }, [displayName, contributorName]);

  useEffect(async () => {

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
      const response = await axios.get(`/api/pus/${selectedWard._id}`);
      console.log("PUS", response.data);

      setSelectedPu(response.data);
    } finally {
      setIsLoadingPuData(false);
    }
  }, [selectedWard]);

  const handleClose = () => {
    setIsOpen(false);
    setContributorName(localStorage.getItem(KEY_CONTRIBUTOR));
  };

  let xlsMenu = <>
    {selectedLga ?
        <>
          <MenuItem onClick={handleMenuClose}>
            <Link href={`/api/downloads/${selectedLga.lga.lga_id}?stateId=${selectedLga.state.state_id}`} underline="none">
              {`Download LGA "${selectedLga.lga.name}"`}
            </Link>
          </MenuItem>
          <Divider/>
        </>
        : null
    }
    <MenuItem onClick={handleMenuClose}>
    <Link href={`/api/downloads?stateId=${stateId}`} underline="none">
      {`Download Collated "${_.find(STATES, (s) => s.id === _.toInteger(stateId))?.name}" (.xlsx)`}
    </Link>
  </MenuItem>
  </>;

  let view = xlsMenu;
  if (selectedPu) {
    view = <>
      <MenuItem onClick={handleMenuClose}>
        <Link href={`/api/downloads/${selectedPu.wards[0]._id}?stateId=${stateId}`} underline="none">
          {`Download Ward "${selectedPu.wards[0].name}"`}
        </Link>
      </MenuItem>
      {xlsMenu}
    </>
  }

  return (
    <>
      <MetaHead />
      <Box sx={{ display: "flex" }}>
        <CssBaseline />
        <AppBar component="nav">
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: "block" } }}
            >
              <MenuIcon />
            </IconButton>

            <Box display="flex" alignItems="center" style={{ width: "100%" }}>
              <Box flexGrow={1}>
                <Typography variant="h6" sx={{ my: 2 }}>
                  {selectedState?.name}
                </Typography>
              </Box>
              <Stack direction={"row"}>
                  <div>
                    {
                        stateId &&
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
                    }

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


                <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
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

                <IconButton
                  onClick={() => setIsOpen(!isOpen)}
                  sx={{ mt: 1, ml: 1, mr: 1 }}
                >
                  <PersonIcon />
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
              display: { xs: "block", sm: "none" },
              "& .MuiDrawer-paper": {
                boxSizing: "border-box",
                width: drawerWidth,
              },
            }}
          >
            <DrawerView handleDrawerToggle={handleDrawerToggle} state={selectedState} lga={selectedLga} ward={selectedWard} pu={selectedPu} setWard={setWard} setLga={setSelectedLga} stats={stats} />
          </Drawer>
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: "none", sm: "block" },
              "& .MuiDrawer-paper": {
                boxSizing: "border-box",
                width: drawerWidth,
              },
            }}
            open
          >
            <DrawerView handleDrawerToggle={handleDrawerToggle} state={selectedState} lga={selectedLga} pu={selectedPu} setWard={setWard} setLga={setSelectedLga} stats={stats} />
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
          <MainBody isLoadingPuData={isLoadingPuData} selectedPu={selectedPu} stats={stats}/>
        </Grid>

        <AccountView handleClose={handleClose} isOpen={isOpen} setIsOpen={setIsOpen}
                     displayName={displayName} contributorName={contributorName}
                     setDisplayName={setDisplayName} setContributorName={setContributorName}
                     isContribFormValid={isContribFormValid} saveContributorName={saveContributorName}/>
      </Box>
      <Analytics />
    </>
  );
};

export default App;
