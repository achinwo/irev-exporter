import React, {useState, useEffect} from "react";
import {
    Grid,
    Card,
    Typography,
    CardContent,
    CardMedia,
    capitalize
} from "@material-ui/core";
import {
    AppBar,
    Button,
    Checkbox,
    CircularProgress,
    Collapse,
    CssBaseline,
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
    ListItemButton, ListItemSecondaryAction,
    ListItemText,
    ListSubheader,
    MenuItem,
    Select,
    Stack,
    Tab,
    Tabs,
    TextField,
    Toolbar
} from "@mui/material";
import {makeStyles} from "@material-ui/styles";
import axios from "axios";
import InfiniteScroll from "react-infinite-scroll-component";
import Box from '@mui/material/Box';
import _ from 'lodash';
import ExpandLess from '@mui/icons-material/ExpandLess';
import MenuIcon from '@mui/icons-material/Menu';
import ExpandMore from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';

const useStyles = makeStyles({
    pokemonCardsArea: {
        paddingTop: "30px",
        paddingLeft: "15%",
        paddingRight: "15%",
        width: "100%"
    },
    pokemonImage: {
        height: "160px",
        width: "160px"
    },
    progress: {
        position: "fixed",
        top: "50%",
        left: "50%",
        marginTop: "-100px",
        marginLeft: "-100px"
    }
});


const PollingUnitView = ({pollingUnit, puData, setPuDataById}) => {

    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    const pu = pollingUnit;

    const submitPollingData = async () => {
        const url = `/api/pus/${pu._id}`;
        console.log('submitted pu data url:', url);

        const data = puData[pu._id] || {votesLp: undefined, votesNnpp: undefined, votesPdp: undefined, votesApc: undefined};
        const resp = await axios.post(url, {pu, puData: data});
        console.log('submitted pu data', resp);
    }

    //<Grid key={pu._id} item xs={12} sm={12} md={12} lg={12} style={{maxWidth: "100%"}}>
    return (

            <Card elevation={4} xs={{mt: 20}} style={{maxWidth: "100%"}}>
                <CardContent align="center" style={{maxWidth: "100%"}}>
                    <Typography>{capitalize(`${pu.name}`)}</Typography>
                    <Typography>{`PU Code: ${pu.pu_code}`}</Typography>
                    <Typography>{`Updated: ${new Date(pu.updated_at).toLocaleDateString("en-US", options)}`}</Typography>
                    {pu.document?.url ?
                        <>
                            <Link href={pu.document?.url} rel="noopener noreferrer" target="_blank" sx={{mb: 4}}>Document
                                Link</Link>
                            <CardMedia style={{maxWidth: "100%", minHeight: '70vh'}}>
                                <div style={{maxWidth: "100%", height: '100%', position: 'relative'}}>
                                    <iframe width={'80%'} height={'70vh'} src={pu.document?.url} frameBorder={0}
                                            seamless style={{height: '70vh', marginTop: '1em'}}/>
                                </div>

                                <Box
                                    component="form"
                                    sx={{
                                        '& > :not(style)': {m: 1, width: '25ch'},
                                    }}
                                    noValidate
                                    autoComplete="off"
                                >
                                    {
                                        ['Lp', 'Pdp', 'Apc', 'Nnpp'].map((tag, key) => {
                                            const values = puData[pu._id] || {};
                                            return <TextField label={tag.toUpperCase()}
                                                              key={key}
                                                              value={values[`votes${tag}`]}
                                                              onChange={(evt) => {
                                                                  values[`votes${tag}`] = evt.target.value;
                                                                  setPuDataById((prev) => {
                                                                      prev[pu._id] = _.assign(prev[pu._id], values);
                                                                      return prev;
                                                                  });
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
                                                checked={(puData[pu._id] || {}).isPuNameCorrect}
                                                onChange={(evt) => {
                                                    setPuDataById((prev) => {
                                                        prev[pu._id] = prev[pu._id] || {};
                                                        prev[pu._id].isPuNameCorrect = evt.target.value;
                                                        return prev;
                                                    });
                                                }}
                                            />
                                        }
                                    />
                                    <FormControlLabel
                                        label="Is result legible?"
                                        control={
                                            <Checkbox
                                                checked={(puData[pu._id] || {}).isResultLegible}
                                                onChange={(evt) => {
                                                    setPuDataById((prev) => {
                                                        prev[pu._id] = prev[pu._id] || {};
                                                        prev[pu._id].isResultLegible = evt.target.value;
                                                        return prev;
                                                    });
                                                }}
                                            />
                                        }
                                    />
                                    <br/>
                                    <Button variant="text"
                                            onClick={() => submitPollingData()}
                                    >Submit</Button>
                                </Box>
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

    const handleDrawerToggle = () => {
        setMobileOpen((prevState) => !prevState);
    };

    const drawerWidth = 240;

    const drawer = (
        <Box sx={{textAlign: 'center'}}>

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
            <List subheader={<ListSubheader component="div" id="nested-list-subheader">LGAs</ListSubheader>}>
                {
                    (selectedState?.lgas?.data || []).map((lga, idx) => {
                        return (
                            <>
                                <ListItem onClick={() => setSelectedLga(lga)} key={idx}>
                                    <ListItemText primary={lga.lga.name}/>
                                    {lga.lga.lga_id === selectedLga?.lga.lga_id ? <ExpandLess/> :
                                        <ExpandMore/>}
                                </ListItem>

                                <Collapse in={lga.lga.lga_id === selectedLga?.lga.lga_id}
                                          timeout="auto" unmountOnExit key={idx}>
                                    <List component="div" disablePadding>

                                        {
                                            lga.wards.map((ward) => {
                                                return (
                                                    <ListItemButton sx={{pl: 4}}
                                                                    onClick={() => {
                                                                        setWard(ward);
                                                                        handleDrawerToggle();
                                                                    }}
                                                                    selected={ward._id === selectedWard?._id}>
                                                        <ListItemText
                                                            primary={ward.name}
                                                            secondary={`Ward Number: ${ward.code}`}/>
                                                    </ListItemButton>
                                                )
                                            })
                                        }
                                    </List>
                                </Collapse>
                            </>
                        )
                    })
                }
            </List>
        </Box>
    );



    const fetchStates = async () => {
        const response = await axios.get('/api/states');
        setStates(response.data);
    }

    useEffect(async () => {
        await fetchStates();
    }, []);

    useEffect(async () => {
        console.log('fetching for state:', stateId);
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
        console.log('fetching for Ward:', selectedWard);

        if (!selectedWard) {
            setWard(null);
            setSelectedPu(null);
            return;
        }

        try{
            setIsLoadingPuData(true);
            const response = await axios.get(`/api/pus/${selectedWard._id}`);
            console.log('PUS', response.data);

            setSelectedPu(response.data);
        }finally {
            setIsLoadingPuData(false);
        }


    }, [selectedWard]);



    return (
        <Box sx={{display: 'flex'}}>
            <CssBaseline/>
            <AppBar component="nav">
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{mr: 2, display: {sm: 'block'}}}
                    >
                        <MenuIcon/>
                    </IconButton>

                        <Box display="flex" alignItems="center" style={{width:'100%'}}>
                            <Box flexGrow={1}>
                                <Typography variant="h6" sx={{my: 2}}>
                                    {selectedState?.name}
                                </Typography>
                            </Box>
                            <Box>
                                <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
                                    <InputLabel>State</InputLabel>
                                    <Select
                                        labelId="demo-simple-select-helper-label"
                                        value={stateId ? stateId - 1 : null}
                                        onChange={(event) => setStateId(event.target.value === "" ? null : _.toInteger(event.target.value) + 1)}
                                        label="State">
                                        <MenuItem value="">
                                            <em>None</em>
                                        </MenuItem>

                                        {
                                            states.map((state, idx) => {
                                                return <MenuItem value={_.toString(state.id - 1)} key={`tab-${idx}`}>{state.name}</MenuItem>
                                            })
                                        }
                                    </Select>
                                    <FormHelperText>Select a state</FormHelperText>
                                </FormControl>
                            </Box>
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
                        onBackdropClick: handleDrawerToggle
                    }}
                    sx={{
                        display: {xs: 'block', sm: 'none'},
                        '& .MuiDrawer-paper': {boxSizing: 'border-box', width: drawerWidth},
                    }}>
                    {drawer}
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{
                        display: {xs: 'none', sm: 'block'},
                        '& .MuiDrawer-paper': {boxSizing: 'border-box', width: drawerWidth},
                    }}
                    open
                >
                    {drawer}
                </Drawer>
            </Box>

            <Grid container spacing={1} sx={{pb: 18}} alignItems="center"
                  justifyContent={'center'} style={{maxWidth: '100%', height: '100vh', overflowY: 'scroll'}}>
                    <MainBody isLoadingPuData={isLoadingPuData} selectedPu={selectedPu}/>
            </Grid>

        </Box>
    );
};

function MainBody({isLoadingPuData, selectedPu}) {
    const classes = useStyles();

    const [puData, setPuDataById] = useState({
        votesLp: undefined,
        isResultLegible: false,
        isPuNameCorrect: false,
        votesNnpp: undefined,
        votesPdp: undefined,
        votesApc: undefined})

    if (isLoadingPuData) {
        return <CircularProgress
            color={"success"}
            className={classes.progress}
            size={200}
        />
    }

    if (selectedPu?.data) {
     return <Grid xs={12} sm={10} lg={8} style={{maxHeight: '100%'}}>
         <InfiniteScroll

             dataLength={selectedPu?.data?.length}
             next={() => null}
             hasMore={false}
             scrollThreshold={1}
             loader={<LinearProgress/>}
             // Let's get rid of second scroll bar
             style={{overflow: "unset", marginTop: '8em'}}>
             {selectedPu?.data?.map((pu, index) => {
                 return <Box style={{height: '100%', width: '100%'}} sx={{mb: 5}}>
                     <PollingUnitView
                     pollingUnit={pu}
                     key={`pus-${index}`}
                     puData={puData} setPuDataById={setPuDataById}/>
                 </Box>
             })}
         </InfiniteScroll>
     </Grid>

    } else {
        return <Grid sm={3} sx={{mt: 18}} style={{maxHeight: '100%'}}>
        <Card style={{width: '50vw'}}>
            <CardContent>
                <Typography variant={'h6'} style={{color: 'gray'}} sx={{mt: 12}}>Select a State
                    and then a polling unit from the left panel</Typography>
            </CardContent>
        </Card>
            </Grid>
    }
}

function mobileCheck() {
    let check = false;
    try {
        (function (a) {
            if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true;
        })(globalThis?.navigator?.userAgent || globalThis?.navigator?.vendor || globalThis?.window?.opera);
    }catch (e) {
        return check;
    }
    return check;
};

export default App;
