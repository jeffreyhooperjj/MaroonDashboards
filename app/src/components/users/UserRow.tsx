import { useState } from 'react';
import {
  Box, Card, CardContent, Paper, Grid, Typography, Button,
  Chip, Select, MenuItem, Snackbar, Alert, Stack
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAuthSession } from 'aws-amplify/auth';
import verifiedBadge from '../../assets/verified-badge.svg';
import loadingSvg from '../../assets/loading.svg';
import alertSvg from '../../assets/alert.svg';
import './UserRow.css';

interface UserRowProps {
  user: any;
}

export function UserRow({ user }: UserRowProps) {
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [tier, setTier] = useState(user.tier ?? "tier4");
  const [isWaitlisted, setIsWaitlisted] = useState(user.waitlisted);
  const [imageLoadStates, setImageLoadStates] = useState<Record<number, boolean>>({});
  const [imageErrorStates, setImageErrorStates] = useState<Record<number, boolean>>({});
  const queryClient = useQueryClient();

  const approveUserMutation = useMutation({
    mutationFn: async ({ userUuid, userTier }: { userUuid: string; userTier: string }) => {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();
      const response = await fetch(`/admin/approve`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
          user_uuid: userUuid,
          tier: userTier,
        })
      });
      const result = await response.json();
      return result;
    },
    onSuccess: () => {
      setSnackbar({ open: true, message: 'User approved successfully!', severity: 'success' });
      // Update local state immediately
      setIsWaitlisted(false);
      // Invalidate and refetch users query
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => {
      setSnackbar({ open: true, message: 'Failed to approve user', severity: 'error' });
    },
  });

  const renderStatus = (user: any) => {
    const status = isWaitlisted ? 'Waitlisted' : 'Approved';
    const color = isWaitlisted ? 'warning' : 'success';

    return (
      <Chip
        label={status}
        color={color}
        variant="filled"
        sx={{ fontWeight: 'medium' }}
      />
    );
  };

  const renderNameInfo = (user: any) => {
    const joinDate = new Date(user.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ flex: 1, minWidth: 0, gap: 1 }}>
          <Card sx={{ bgcolor: 'grey.300' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                <Typography variant="h6" component="div" noWrap>
                  {user.name}
                </Typography>
                <img
                  src={verifiedBadge}
                  alt="Verified"
                  style={{
                    width: '24px',
                    height: '24px'
                  }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary" noWrap>
                {user.email}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Joined: {joinDate}
              </Typography>
              <Typography> Demographics </Typography>
              <Typography variant="body2">
                Age: {user.age}
              </Typography>
              <Typography variant="body2">
                Location: Lat: {user.location?.latitude?.toFixed(2)} Long: {user.location?.longitude?.toFixed(2)}
              </Typography>
              <Typography variant="body2">
                Job Industry: {user.job_industry}
              </Typography>
              <Typography variant="body2">
                Ethnicity: {user.ethnicity}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                {user.has_premium && (
                  <Chip
                    label="Premium"
                    size="small"
                    color="warning"
                    variant="outlined"
                  />
                )}
                {renderStatus(user)}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    );
  };

  const renderPrompts = (user: any) => {
    const prompts = user.prompts || [];
    return (
      <Stack spacing={1} sx={{ maxWidth: 400 }}>
        {prompts.map((prompt: any, index: number) => (
          <Card key={index} sx={{ bgcolor: 'grey.800' }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="body2" color="lightgray" sx={{ fontWeight: 'medium' }}>
                {prompt.question}
              </Typography>
              <Typography variant="caption" color="lightgray"
                sx={{
                  mt: 0.5,
                  wordWrap: 'break-word',
                  whiteSpace: 'normal'
                }}>
                {prompt.response}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>
    );
  };

  const renderImages = (user: any) => {
    const pictures = user.pictures || [];
    return (
      <Box className="user-images-column">
        <Box sx={{ display: 'flex', gap: 1 }}>
          {pictures.slice(0, 4).map((pic: any, index: number) => (
            <Box key={index} sx={{ textAlign: 'center' }}>
              <Paper
                sx={{
                  width: 64,
                  height: 80,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'grey.800'
                }}
              >
                {!imageLoadStates[index] && !imageErrorStates[index] && (
                  <img 
                    src={loadingSvg} 
                    style={{
                      width: '40px',
                      height: '40px',
                      position: 'absolute'
                    }} 
                    alt="Loading" 
                  />
                )}
                {imageErrorStates[index] ? (
                  <img 
                    src={alertSvg} 
                    style={{
                      width: '40px',
                      height: '40px'
                    }} 
                    alt="Error loading image" 
                  />
                ) : (
                  <img 
                    src={pictures[index].download_link} 
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      opacity: imageLoadStates[index] ? 1 : 0
                    }} 
                    alt={`User ${index + 1}`}
                    onLoad={() => setImageLoadStates(prev => ({ ...prev, [index]: true }))}
                    onError={() => setImageErrorStates(prev => ({ ...prev, [index]: true }))}
                  />
                )}
              </Paper>
              <Button
                size="small"
                sx={{ fontSize: '0.7rem', mt: 0.5 }}
                color="primary"
              >
                Download
              </Button>
            </Box>
          ))}
        </Box>
        <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
          <Select
            size="small"
            value={tier}
            onChange={(event) => {
              setTier(event.target.value);
            }}
            disabled={!isWaitlisted}
            sx={{ flex: 1 }}
          >
            <MenuItem value={"tier1"}>Tier 1</MenuItem>
            <MenuItem value={"tier2"}>Tier 2</MenuItem>
            <MenuItem value={"tier3"}>Tier 3</MenuItem>
            <MenuItem value={"tier4"}>Tier 4</MenuItem>
          </Select>
          <Button 
            variant="contained" 
            className="approve-button"
            onClick={approveUser} 
            disabled={!isWaitlisted}
            sx={{ flex: 1 }}
          >
            {approveUserMutation.isPending ? "Approving" : "Approve"}
          </Button>
        </Box>
      </Box>
    );
  };

  const approveUser = () => {
    if (!tier) {
      console.log("tier is not set");
      return;
    }
    approveUserMutation.mutate({ userUuid: user.user_uuid, userTier: tier })
  }

  return (
    <>
      <Paper sx={{ bgcolor: 'grey.600' }}>
        <Grid container spacing={.5}>
          <Grid item size={3}>
            {renderNameInfo(user)}
          </Grid>
          <Grid item size={4}>
            {renderPrompts(user)}
          </Grid>
          <Grid item size={5}>
            {renderImages(user)}
          </Grid>
        </Grid>
      </Paper>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  )

}
