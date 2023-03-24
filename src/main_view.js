import React, {useEffect, useState} from "react";
import _ from "lodash";
import {
    Card,
    CardContent,
    CardHeader,
    CircularProgress,
    Grid,
    LinearProgress,
    Snackbar,
    Typography
} from "@mui/material";
import InfiniteScroll from "react-infinite-scroll-component";
import Box from "@mui/material/Box";
import {PollingUnitView} from "./polling_unit_view";
import {Alert} from "@mui/lab";
import {DataGrid} from "@mui/x-data-grid";


export function MainBody({ isLoadingPuData, selectedPu, stats, electionType}) {
    //const classes = useStyles();

    let [puData, setPuData] = useState({});
    let [isSubmitting, setIsSubmitting] = useState(false);
    const [open, setOpen] = React.useState(false);
    const [alert, setAlert] = React.useState({});
    const [scrollPointer, setScrollPointer] = React.useState(0);


    useEffect(() => {
        if (!alert || !alert.message) {
            setOpen(false);
        } else {
            setOpen(true);
        }
    }, [alert]);

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
                                    electionType={electionType}
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
            { field: 'id', headerName: 'ID', width: 50 },
            {
                field: 'name',
                headerName: 'State',
                width: 120,
            },
            {
                field: 'progress',
                headerName: 'Progress',
                type: 'string',
                width: 100,
                renderCell: (params) => {
                    return `${params.value.toFixed(2)}%`
                }
            },
            {
                field: 'puCount',
                headerName: 'Polling Units',
                type: 'number',
                width: 100,
            },
            {
                field: 'lgaCount',
                headerName: 'LGAs',
                type: 'number',
                width: 100,
            },
            {
                field: 'wardCount',
                headerName: 'Wards',
                type: 'number',
                width: 100,
            },
            {
                field: 'resultCount',
                headerName: 'IReV Results (Pres)',
                type: 'number',
                width: 140,
            },
            {
                field: 'resultGuberCount',
                headerName: 'IReV Results (Gov)',
                type: 'number',
                width: 140,
            },
            {
                field: 'submittedCount',
                headerName: 'Transcribed',
                type: 'number',
                width: 100,
            }
        ];

        return (
            <Grid xs={12} sm={6} md={8} sx={{ mt: 20 }} style={{}}>
                <Card>
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
                                rows={stats.state}
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