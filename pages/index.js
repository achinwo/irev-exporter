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
    CircularProgress, Collapse, CssBaseline, Divider, Drawer, FormControlLabel, IconButton,
    LinearProgress, Link,
    List,
    ListItem,
    ListItemButton,
    ListItemText, ListSubheader, Stack, Tab, Tabs, TextField, Toolbar
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

const PollingUnitView = ({pollingUnit}) => {
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    const pu = pollingUnit;
    return (
        <Grid key={pu._id} item xs={12} sm={12} md={12} lg={12} style={{maxWidth: "100%"}}>
            <Card elevation={1} style={{maxWidth: "100%"}}>
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
                                    <iframe width={'100%'} height={'70vh'} src={pu.document?.url} frameBorder={0}
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
                                        ['LP', 'PDP', 'APC', 'NNPP'].map((tag) => {
                                            return <TextField label={tag}
                                                              inputProps={{inputMode: 'numeric', pattern: '[0-9]*'}}
                                                              variant="filled"/>
                                        })
                                    }
                                    <br/>
                                    <FormControlLabel
                                        label="Is PU name correct?"
                                        control={
                                            <Checkbox
                                                checked={true}
                                                onChange={() => {
                                                }}
                                            />
                                        }
                                    />
                                    <FormControlLabel
                                        label="Is result legible?"
                                        control={
                                            <Checkbox
                                                checked={true}
                                                onChange={() => {
                                                }}
                                            />
                                        }
                                    />
                                    <br/>
                                    <Button variant="text">Submit</Button>
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
        </Grid>
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
        <Box onClick={handleDrawerToggle} sx={{textAlign: 'center'}}>

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
                                                                    onClick={() => setWard(ward)}
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

    const handleOnRowsScrollEnd = () => {
        setHasMoreValue(false);
    };

    const fetchStates = async () => {
        const response = await axios.get('/api/states');
        setStates(response.data);
    }

    useEffect(async () => {
        await fetchStates();
    }, []);

    useEffect(async () => {
        console.log('fetching for ', stateId);
        if (!stateId) {
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
                    <Box sx={{display: {xs: 'block', sm: 'block'}, ml: globalThis?.window?.screen?.width < 600 ? '1em' : '10em'}} style={{maxWidth: '80vw'}}>
                        {
                            <Tabs
                                value={stateId ? stateId - 1 : null}
                                onChange={(event, newValue) => setStateId(newValue + 1)}
                                variant="scrollable"
                                xs={{}}
                                scrollButtons
                                allowScrollButtonsMobile
                                textColor="secondary"
                                indicatorColor="secondary"
                                aria-label="scrollable auto tabs example"
                            >
                                {
                                    states.map((state, idx) => {
                                        return <Tab id={_.toString(state.id - 1)} label={state.name}
                                                    key={`tab-${idx}`}/>
                                    })
                                }

                            </Tabs>
                        }
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

            <Grid container spacing={1} sx={{}} style={{maxWidth: '100%', height: '90vh'}}>

                <Grid xs={12}>
                    <Box sx={{mt: 18}} style={{maxHeight: '100%'}}>
                        {isLoadingPuData ?
                            <CircularProgress
                                color={"success"}
                                className={classes.progress}
                                size={200}
                            />
                            :
                            selectedPu?.data ? (
                            <>
                                <InfiniteScroll
                                    dataLength={selectedPu?.data?.length}
                                    next={handleOnRowsScrollEnd}
                                    hasMore={hasMoreValue}
                                    scrollThreshold={1}
                                    loader={<LinearProgress/>}
                                    // Let's get rid of second scroll bar
                                    style={{overflow: "unset"}}
                                >
                                    <Grid container spacing={2} className={classes.pokemonCardsArea}>
                                        {selectedPu?.data?.map((pu, index) => PollingUnitView({
                                            pollingUnit: pu,
                                            key: index
                                        }))}
                                    </Grid>
                                </InfiniteScroll>
                            </>
                        ) : (
                            <Box sx={{ml: 50}}>
                                <Card style={{width: '50vw'}}>
                                    <CardContent>
                                        <Typography variant={'h6'} style={{color: 'gray'}} sx={{mt: 12}}>Select a State
                                            and then a polling unit from the left panel</Typography>
                                    </CardContent>
                                </Card>
                            </Box>
                        )}
                    </Box>
                </Grid>
            </Grid>

        </Box>
    );
};

export default App;
