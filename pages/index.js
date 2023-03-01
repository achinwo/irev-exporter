import React, { useState, useEffect } from "react";
import {
  Grid,
  Card,
  Typography,
  CardContent,
  CardMedia,
  capitalize
} from "@material-ui/core";
import {
    CircularProgress, Collapse,
    LinearProgress, Link,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText, ListSubheader
} from "@mui/material";
import { makeStyles } from "@material-ui/styles";
import axios from "axios";
import InfiniteScroll from "react-infinite-scroll-component";
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import {InboxIcon} from "@heroicons/react/24/outline";
import _ from 'lodash';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';

const Item = styled(Paper)(({ theme }) => ({
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

  const loadScrollData = async () => {
    try {
      setScrollData([]);
    } catch (err) {
      console.log(err);
    }
  };

  const handleOnRowsScrollEnd = () => {
      setHasMoreValue(false);
  };

  const fetchPrimaryPokemonData = async () => {
    try {
      // await axios
      //     .get("https://pokeapi.co/api/v2/pokemon?limit=649")
      //     .then((response) => {
      //       const data = response.data.results;
      //       const newPokemonData = [];
      //       data.forEach((pokemon, index) => {
      //         newPokemonData.push({
      //           id: index + 1,
      //           name: pokemon.name,
      //           imgUrl: `https://unpkg.com/pokeapi-sprites@2.0.2/sprites/pokemon/other/dream-world/${
      //               index + 1
      //           }.svg`
      //         });
      //       });
      //       setPokemonData(newPokemonData);
      //       // Let's set up primary array of items to render in InfiniteScroll
      //       setScrollData(newPokemonData.slice(0, 16));
      //     });
    } catch (err) {
      console.log(err);
    }
  };

  const fetchStates = async () => {
    const response = await axios.get('/api/states');
    setStates(response.data);
  }

  useEffect(async () => {
        await fetchPrimaryPokemonData();
        await fetchStates();
  }, []);

    useEffect(async () => {
        console.log('fetching for ', stateId);
        if(!stateId) {
            setSelectedState(null);
            return;
        }

        const response = await axios.get(`/api/states/${stateId}`);
        //console.log('LGA', response.data);

        setSelectedState(response.data);

    }, [stateId]);

    useEffect(async () => {
        console.log('fetching for Ward:', selectedWard);

        if(!selectedWard) {
            setWard(null);
            return;
        }

        const response = await axios.get(`/api/pus/${selectedWard._id}`);
        console.log('PUS', response.data);

        setSelectedPu(response.data);

    }, [selectedWard]);

  const renderCards = (pu, pokemonIndex) => {
    //className={classes.pokemonImage}
    return (
        <Grid key={pu._id} item xs={12} sm={12} md={12} lg={12} style={{maxWidth: "100%", minHeight: '70vh'}} key={pokemonIndex}>
          <Card elevation={1} className={classes.pokemonCard} style={{maxWidth: "100%", minHeight: '70vh'}}>
            <CardContent align="center" style={{maxWidth: "100%", minHeight: '70vh'}}>
              <Typography>{"Name: " + capitalize(`${pu.name}`)}</Typography>
              <Typography>{`PU Code: ${pu.pu_code}`}</Typography>
              <Typography>{`Updated: ${pu.updated_at}`}</Typography>
                {pu.document?.url ?
                    <>
                        <Link href={pu.document?.url} rel="noopener noreferrer" target="_blank" sx={{mb: 4}}>Document Link</Link>
                        <CardMedia style={{maxWidth: "100%", minHeight: '70vh'}}>
                            <div style={{maxWidth: "100%", height: '100%', position: 'relative'}}>
                                <iframe  width={'100%'} height={'70vh'} src={pu.document?.url} frameBorder={0} seamless style={{height: '70vh'}}/>
                            </div>
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
  };

  return (
      <Grid container spacing={1} style={{maxWidth: '100%', height: '100vh'}}>
          <Grid xs={_.isEmpty(selectedState?.lgas) ? 4 : 2} style={{position: 'relative'}}>
              <Item style={{position: 'fixed', overflowY: 'scroll', height: '100vh'}}>
                  <List subheader={<ListSubheader component="div" id="nested-list-subheader">States</ListSubheader>}>
                      {
                          states.map((state, idx) => {
                              return (
                                  <ListItem key={idx}>
                                      <ListItemButton selected={stateId === state.id} onClick={() => setStateId( stateId === state.id ? null : state.id)}>
                                          <ListItemText primary={state.name} />
                                      </ListItemButton>
                                  </ListItem>
                              )
                          })
                      }
                  </List>
              </Item>
          </Grid>

          {
              _.isEmpty(selectedState?.lgas) ?
                  null
                  :
                  <Grid xs={2} style={{position: 'relative'}}>
                      <Item style={{position: 'fixed', overflowY: 'scroll', height: '100vh'}}>
                          <List subheader={<ListSubheader component="div" id="nested-list-subheader">LGAs</ListSubheader>}>
                              {
                                  selectedState.lgas.data.map((lga, idx) => {
                                      return (
                                          <>
                                              <ListItemButton onClick={() => setSelectedLga(lga)} key={idx}>
                                                  <ListItemText primary={lga.lga.name} />
                                                  {lga.lga.lga_id === selectedLga?.lga.lga_id ? <ExpandLess /> : <ExpandMore />}
                                              </ListItemButton>

                                              <Collapse in={lga.lga.lga_id === selectedLga?.lga.lga_id} timeout="auto" unmountOnExit key={idx}>
                                                  <List component="div" disablePadding>

                                                      {
                                                          lga.wards.map((ward) => {
                                                              return (
                                                                  <ListItemButton sx={{ pl: 4 }} onClick={() => setWard(ward) } selected={ward._id === selectedWard?._id}>
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


                                          // <ListItem>
                                          //     <ListItemButton selected={lga.lga.lga_id === selectedLga?.lga.lga_id} onClick={() => setSelectedLga(lga)}>
                                          //         <ListItemText primary={lga.lga.name} />
                                          //     </ListItemButton>
                                          // </ListItem>
                                      )
                                  })
                              }
                          </List>
                      </Item>
                  </Grid>
          }

          <Grid xs={8}>
              <Item sx={{}} style={{maxHeight: '100%'}}>
                  <>
                      {selectedPu?.data ? (
                          <>
                              <InfiniteScroll
                                  dataLength={selectedPu?.data?.length}
                                  next={handleOnRowsScrollEnd}
                                  hasMore={hasMoreValue}
                                  scrollThreshold={1}
                                  loader={<LinearProgress />}
                                  // Let's get rid of second scroll bar
                                  style={{ overflow: "unset" }}
                              >
                                  <Grid container spacing={2} className={classes.pokemonCardsArea}>
                                      {selectedPu?.data?.map((pu, index) => renderCards(pu, index))}
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
              </Item>
          </Grid>
      </Grid>


  );
};

export default App;
