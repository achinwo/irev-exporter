import {
    Button, Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Stack,
    TextField
} from "@mui/material";
import React from "react";
import VerifiedSharpIcon from '@mui/icons-material/VerifiedSharp';
import _ from 'lodash';

export function fullValidator(dataOrRole) {
    const roleVal = _.toInteger(_.isPlainObject(dataOrRole) ? dataOrRole.role : dataOrRole) || 0;
    return roleVal >= 2;
}

export const AccountDiaglogView = ({handleClose, isOpen, setIsOpen, displayName, contributorName, setDisplayName, setContributorName, isContribFormValid, saveContributorName, currentUser}) => {
    console.log('CURRENT_USER', currentUser);
    return <Dialog onClose={handleClose} open={isOpen}>
      <DialogTitle style={{width: '100%', display: 'flex', flexDirection: 'row'}}>
          <span style={{marginRight: 'auto', flexGrow: 1 }}>Polling Data Contributor</span>
          <span style={{marginLeft: 'auto', flexShrink: 1}}><Chip color={fullValidator(currentUser) ? 'success' : 'warning'} label={`Validation${fullValidator(currentUser) ? '' : ' (LIMITED)'}`} icon={<VerifiedSharpIcon />}/></span>
      </DialogTitle>
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