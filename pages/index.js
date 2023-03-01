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
    ListItemIcon,
    ListItemText, ListSubheader, Tab, Tabs, TextField, Toolbar
} from "@mui/material";
import {makeStyles} from "@material-ui/styles";
import axios from "axios";
import InfiniteScroll from "react-infinite-scroll-component";
import {styled} from '@mui/material/styles';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import {InboxIcon} from "@heroicons/react/24/outline";
import _ from 'lodash';
import ExpandLess from '@mui/icons-material/ExpandLess';
import MenuIcon from '@mui/icons-material/Menu';
import ExpandMore from '@mui/icons-material/ExpandMore';

const Item = styled(Paper)(({theme}) => ({
    backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
    ...theme.typography.body2,
    padding: theme.spacing(1),
    textAlign: 'center',
    color: theme.palette.text.secondary,
}));

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
    const [pokemonData, setPokemonData] = useState();
    const [states, setStates] = useState([]);
    const [stateId, setStateId] = useState(null);
    const [selectedState, setSelectedState] = useState(null);
    const [selectedLga, setSelectedLga] = useState(null);
    const [selectedWard, setWard] = useState(null);
    const [selectedPu, setSelectedPu] = useState(null);

    // Setting up states for InfiniteScroll
    const [scrollData, setScrollData] = useState();
    const [hasMoreValue, setHasMoreValue] = useState(true);
    const [mobileOpen, setMobileOpen] = React.useState(false);

    const handleDrawerToggle = () => {
        setMobileOpen((prevState) => !prevState);
    };

    const drawerWidth = 240;
    const navItems = ['Home', 'About', 'Contact'];

    const drawer = (
        <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ my: 2 }}>
                {selectedState?.name}
            </Typography>
            <Divider />
                <List subheader={<ListSubheader component="div" id="nested-list-subheader">LGAs</ListSubheader>}>
                    {
                        selectedState.lgas.data.map((lga, idx) => {
                            return (
                                <>
                                    <ListItemButton onClick={() => setSelectedLga(lga)} key={idx}>
                                        <ListItemText primary={lga.lga.name}/>
                                        {lga.lga.lga_id === selectedLga?.lga.lga_id ? <ExpandLess/> :
                                            <ExpandMore/>}
                                    </ListItemButton>

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

        const response = await axios.get(`/api/pus/${selectedWard._id}`);
        console.log('PUS', response.data);

        setSelectedPu(response.data);

    }, [selectedWard]);

    return (
            <Box sx={{ display: 'flex' }}>
                <CssBaseline />
                <AppBar component="nav" color="success">
                    <Toolbar>
                        <IconButton
                            color="inherit"
                            aria-label="open drawer"
                            edge="start"
                            onClick={handleDrawerToggle}
                            sx={{ mr: 2, display: { sm: 'block' } }}
                        >
                            <MenuIcon />
                        </IconButton>
                        <Box sx={{ display: { xs: 'block', sm: 'block' } }}>
                            {
                                <Tabs
                                    value={stateId ? stateId - 1 : null}
                                    onChange={(event, newValue) => setStateId(newValue + 1)}
                                    variant="scrollable"
                                    scrollButtons="auto"
                                    textColor="secondary"
                                    indicatorColor="secondary"
                                    aria-label="scrollable auto tabs example"
                                >
                                    {
                                        states.map((state, idx) => {
                                            return <Tab id={_.toString(state.id - 1)} label={state.name} key={idx}/>
                                        })
                                    }

                                </Tabs>
                            }
                        </Box>
                    </Toolbar>
                </AppBar>
                <Box component="nav">
                    <Drawer
                        variant="persistent"
                        open={mobileOpen}
                        onClose={handleDrawerToggle}
                        ModalProps={{
                            keepMounted: true, // Better open performance on mobile.
                        }}
                        sx={{
                            display: { xs: 'block', sm: 'block' },
                            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                        }}
                    >
                        {drawer}
                    </Drawer>
                </Box>

            <Grid container spacing={1} sx={{}} style={{maxWidth: '100%', height: '90vh'}}>

                <Grid xs={12}>
                    <Box sx={{mt: 18}} style={{maxHeight: '100%'}}>
                        <>
                            {selectedPu?.data ? (
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
                                            {selectedPu?.data?.map((pu, index) => PollingUnitView({pollingUnit: pu}))}
                                        </Grid>
                                    </InfiniteScroll>
                                </>
                            ) : (
                                // <CircularProgress
                                //     color={"success"}
                                //     className={classes.progress}
                                //     size={200}
                                // />
                                <Typography sx={{mt: 12}}>Select Polling Unit</Typography>
                            )}
                        </>
                    </Box>
                </Grid>
            </Grid>

        </Box>
    );
};

export default App;
