import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Stack,
    TextField
} from "@mui/material";
import React from "react";


export const AccountView = ({handleClose, isOpen, setIsOpen, displayName, contributorName, setDisplayName, setContributorName, isContribFormValid, saveContributorName}) => {
  return <Dialog onClose={handleClose} open={isOpen}>
      <DialogTitle>Polling Data Contributor</DialogTitle>
      <DialogContent>
          <DialogContentText>
              Setting a Contributor ID ascribes all result data entry to
              you. Note that this should be kept private!
              <br/>
              Your display name can be shared and will appear on exports like daily Leaderboards.
          </DialogContentText>
          <Stack spacing={2} direction={'column'}>
              <TextField
                  autoFocus
                  margin="dense"
                  id="name"
                  label="Display Name"
                  fullWidth
                  value={displayName}
                  variant="standard"
                  onChange={(evt) => setDisplayName(evt.target.value)}
              />
              <TextField
                  autoFocus
                  margin="dense"
                  id="name"
                  label="Contributor ID"
                  fullWidth
                  value={contributorName}
                  variant="standard"
                  onChange={(evt) => setContributorName(evt.target.value)}
              />
          </Stack>

      </DialogContent>
      <DialogActions>
          <Button onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button disabled={!isContribFormValid}
                  onClick={() => {
                      saveContributorName(contributorName, displayName);
                      setIsOpen(false);
                  }}
          >
              Update
          </Button>
      </DialogActions>
  </Dialog>
}