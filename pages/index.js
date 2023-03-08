import React, { useState, useEffect } from "react";
import {
  Grid,
  Card,
  Typography,
  CardContent,
  CardMedia,
  capitalize,
} from "@material-ui/core";
import { generateUsername } from "unique-username-generator";
import { PollingUnitView } from "../src/polling_unit_view";
import {
  AppBar,
  Avatar,
  Button, CardHeader,
  Checkbox, Chip,
  CircularProgress,
  Collapse,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  InputLabel,
  LinearProgress,
  Link,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemSecondaryAction,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Toolbar,
} from "@mui/material";
import { makeStyles } from "@material-ui/styles";
import axios from "axios";
import InfiniteScroll from "react-infinite-scroll-component";
import Box from "@mui/material/Box";
import _ from "lodash";
import ExpandLess from "@mui/icons-material/ExpandLess";
import MenuIcon from "@mui/icons-material/Menu";
import ExpandMore from "@mui/icons-material/ExpandMore";
import CloseIcon from "@mui/icons-material/Close";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import { Analytics } from "@vercel/analytics/react";
import PersonIcon from "@mui/icons-material/Person";
import LoadingButton from "@mui/lab/LoadingButton";
import { Alert } from "@mui/lab";
import MetaHead from "../src/MetaHead";

const useStyles = makeStyles({
  pokemonCardsArea: {
    paddingTop: "30px",
    paddingLeft: "15%",
    paddingRight: "15%",
    width: "100%",
  },
  pokemonImage: {
    height: "160px",
    width: "160px",
  },
  progress: {
    position: "fixed",
    top: "50%",
    left: "50%",
    marginTop: "-100px",
    marginLeft: "-100px",
  },
});

export const KEY_CONTRIBUTOR = "contributor-name";

import FaceIcon from '@mui/icons-material/Face';

const WardSummaryView = ({ward, puData}) => {
  let puDataList = _.compact(_.sortBy(_.values(puData), (v) => v.createdAt));
  puDataList = _.filter(puDataList, (d) => d.wardId === ward._id);

  return <Stack direction={'row'} spacing={1}>
    <Chip label={`#${ward.code}`} size="small" />
    {
      !_.isEmpty(puDataList) ?
          <>
            <Chip label={`${puDataList.length}`} color="secondary" title={`Results submitted`}  variant="outlined" size="small" />
            <Chip sx={{maxWidth: 100}} title={`Last contributor ${_.last(puDataList).contributorUsername}`} icon={<FaceIcon />} label={_.last(puDataList).contributorUsername} color="primary"  variant="outlined" size="small" />
          </>

          : null
    }
  </Stack>
}

const DrawerView = ({handleDrawerToggle, state, lga, ward, pu, setWard, setLga}) => {
  const selectedState = state;
  const selectedLga = lga;
  const setSelectedLga = setLga;
  const selectedWard = ward;
  const puData = (pu || {}).polling_data;
  console.log('DRAWER PU', pu);

  return <Box sx={{textAlign: "center"}}>
    <Box display="flex" alignItems="center">
      <Box flexGrow={1}>
        <Typography variant="h6" sx={{my: 2}}>
          {selectedState?.name}
        </Typography>
      </Box>
      <Box>
        <IconButton onClick={handleDrawerToggle}>
          <CloseIcon/>
        </IconButton>
      </Box>
    </Box>

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
                              secondary={<WardSummaryView ward={ward} puData={puData}/>}
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

const App = () => {
  const classes = useStyles();
  const [states, setStates] = useState([]);
  const [stateId, setStateId] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [selectedLga, setSelectedLga] = useState(null);
  const [selectedWard, setWard] = useState(null);
  const [selectedPu, setSelectedPu] = useState(null);
  const [isLoadingPuData, setIsLoadingPuData] = useState(false);

  // Setting up states for InfiniteScroll
  const [scrollData, setScrollData] = useState();
  const [hasMoreValue, setHasMoreValue] = useState(true);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [contributorName, setContributorName] = React.useState(
    globalThis?.localStorage?.getItem(KEY_CONTRIBUTOR) || generateUsername()
  );

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

  function saveContributorName(newValue) {
    localStorage.setItem(KEY_CONTRIBUTOR, newValue);
    console.log("saved contributor name:", contributorName);
  }

  useEffect(async () => {
    const contributor = localStorage.getItem(KEY_CONTRIBUTOR);

    if (!contributor) {
      saveContributorName(contributorName);
      console.log("initialized contributor name:", contributorName);
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
    <Link href={`/api/downloads`} underline="none">
      {`Download Collated (.xlsx)`}
    </Link>
  </MenuItem>
  </>;

  let view = xlsMenu;
  if (selectedPu) {
    view = <>
      <MenuItem onClick={handleMenuClose}>
        <Link href={`/api/downloads/${selectedPu.wards[0]._id}`} underline="none">
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
                    <Button
                      id="basic-button"
                      aria-controls={open ? "basic-menu" : undefined}
                      aria-haspopup="true"
                      aria-expanded={open ? "true" : undefined}
                      onClick={handleMenuClick}
                      color={"secondary"}
                      sx={{ mt: 2, mr: 2 }}
                    >
                      <DownloadRoundedIcon />
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
            <DrawerView handleDrawerToggle={handleDrawerToggle} state={selectedState} lga={selectedLga} ward={selectedWard} pu={selectedPu} setWard={setWard} setLga={setSelectedLga} />
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
            <DrawerView handleDrawerToggle={handleDrawerToggle} state={selectedState} lga={selectedLga} pu={selectedPu} setWard={setWard} setLga={setSelectedLga} />
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
          <MainBody isLoadingPuData={isLoadingPuData} selectedPu={selectedPu} />
        </Grid>

        <Dialog onClose={handleClose} open={isOpen}>
          <DialogTitle>Polling Data Contributor</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Setting a contributor username ascribes all result data entry to
              you.
            </DialogContentText>
            <TextField
              autoFocus
              margin="dense"
              id="name"
              label="Contributor Username"
              fullWidth
              value={contributorName}
              variant="standard"
              onChange={(evt) => setContributorName(evt.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                saveContributorName(contributorName);
                setIsOpen(false);
              }}
            >
              Update
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
      <Analytics />
    </>
  );
};

function MainBody({ isLoadingPuData, selectedPu }) {
  //const classes = useStyles();

  let [puData, setPuData] = useState({});
  let [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = React.useState(false);
  const [alert, setAlert] = React.useState({});
  const [scrollPointer, setScrollPointer] = React.useState(0);
  const [statsRows, setStatsRows] = React.useState([]);

  useEffect(async () => {
    const res = await axios.get('/api/states/stats');
    let rows = [];
    const stats = res.data.data;

    for (const state of STATES) {
      const stat = _.find(stats, s => s.id === state.id);
      const submitted = _.toInteger(stat?.submittedCount || 0);
      const row = {
        id: state.id,
        progress: `${((submitted / state.resultCount) * 100).toFixed(2)}%`,
        submittedCount: submitted,
        resultCount: state.resultCount,
        wardCount: state.wardCount,
        lgaCount: state.lgaCount,
        puCount: state.puCount,
        name: state.name,
      };
      rows.push(row);
    }

    setStatsRows(rows);
  }, [isSubmitting]);

  useEffect(() => {
    if (!alert || !alert.message) {
      setOpen(false);
    } else {
      setOpen(true);
    }
  }, [alert]);

  const handleClick = () => {
    setOpen(true);
  };

  const handleClose = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }

    setAlert(null);
  };

  useEffect(() => {
    setPuData(
      _.isEmpty(selectedPu) ? puData : _.cloneDeep(selectedPu.polling_data)
    );

    const newScrollPointer = _.isEmpty(selectedPu?.data) ? 0 : Math.min(4, selectedPu?.data?.length);
    console.log('SCROLL:', newScrollPointer);
    setScrollPointer(newScrollPointer);

  }, [selectedPu]);

  if (isLoadingPuData) {
    return <CircularProgress color={"success"} size={200} />;
  }

  if (selectedPu?.data) {
    return (
      <Grid xs={12} sm={10} lg={8} style={{ maxHeight: "100%" }}>
        <InfiniteScroll
          dataLength={selectedPu?.data?.length}
          next={() => null}
          hasMore={false}
          scrollThreshold={1}
          loader={<LinearProgress />}
          // Let's get rid of second scroll bar
          style={{ overflow: "unset", marginTop: "8em" }}
        >
          {selectedPu?.data?.map((pu, index) => {
            const setPuDataById = (res) => {
              setPuData((prev) => {
                prev[pu.pu_code] = _.assign(prev[pu.pu_code] || {}, res);
                return { ...prev };
              });
            };

            return (
              <Box style={{ height: "100%", width: "100%" }} sx={{ mb: 5 }}>
                <PollingUnitView
                  pollingUnit={pu}
                  key={`pus-${index}`}
                  puData={puData[pu.pu_code] || { puCode: pu.pu_code }}
                  setPuData={setPuDataById}
                  isSubmitting={isSubmitting}
                  setIsSubmitting={setIsSubmitting}
                  setAlert={setAlert}
                />
              </Box>
            );
          })}
        </InfiniteScroll>
        <Snackbar open={open} autoHideDuration={6000} onClose={handleClose}>
          <Alert
            onClose={handleClose}
            severity={alert?.severity || "success"}
            sx={{ width: "100%" }}
          >
            {alert?.message || ""}
          </Alert>
        </Snackbar>
      </Grid>
    );
  } else {

    const columns = [
      { field: 'id', headerName: 'ID', width: 90 },
      {
        field: 'name',
        headerName: 'State',
        width: 150,
      },
      {
        field: 'progress',
        headerName: 'Progress',
        type: 'string',
        width: 110,
      },
      {
        field: 'puCount',
        headerName: 'Polling Units',
        type: 'number',
        width: 150,
      },
      {
        field: 'lgaCount',
        headerName: 'LGAs',
        type: 'number',
        width: 150,
      },
      {
        field: 'wardCount',
        headerName: 'Wards',
        type: 'number',
        width: 150,
      },
      {
        field: 'resultCount',
        headerName: 'IReV Results',
        type: 'number',
        width: 110,
      },
      {
        field: 'submittedCount',
        headerName: 'Transcribed',
        type: 'number',
        width: 110,
      }
    ];

    return (
      <Grid sm={3} sx={{ mt: 20 }} style={{}}>
        <Card style={{ width: "60vw" }}>
          <CardHeader>

          </CardHeader>
          <CardContent>
            <Typography
                variant={"h6"}
                style={{ color: "gray" }}
                sx={{ mt: 4, mb: 4 }}
            >
              Select a State and then a polling unit from the left panel
            </Typography>
            <Box sx={{ height: 500, width: '100%' }}>
                <DataGrid
                    rows={statsRows}
                    columns={columns}
                    disableRowSelectionOnClick
                />
              </Box>
          </CardContent>
        </Card>
      </Grid>
    );
  }
}

import { DataGrid } from '@mui/x-data-grid';
import {STATES} from "../src/ref_data";

function mobileCheck() {
  let check = false;
  try {
    (function (a) {
      if (
        /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(
          a
        ) ||
        /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
          a.substr(0, 4)
        )
      )
        check = true;
    })(
      globalThis?.navigator?.userAgent ||
        globalThis?.navigator?.vendor ||
        globalThis?.window?.opera
    );
  } catch (e) {
    return check;
  }
  return check;
}

export default App;
