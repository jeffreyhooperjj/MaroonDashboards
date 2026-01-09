import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Paper, Grid, Typography, Button,
  Chip, Select, MenuItem, Snackbar, Alert, Stack, IconButton
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
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [imagesToLoad, setImagesToLoad] = useState<Set<number>>(new Set([0, 1]));
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
      setIsWaitlisted(false);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => {
      setSnackbar({ open: true, message: 'Failed to approve user', severity: 'error' });
    },
  });

  useEffect(() => {
    const pictures = user.pictures || [];
    if (pictures.length === 0) return;
    
    setImagesToLoad(prev => {
      const newSet = new Set(prev);
      newSet.add(currentPhotoIndex);
      const nextIndex = currentPhotoIndex === pictures.length - 1 ? 0 : currentPhotoIndex + 1;
      newSet.add(nextIndex);
      return newSet;
    });
  }, [currentPhotoIndex, user.pictures]);

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
    if (pictures.length === 0) return <Typography>No photos</Typography>;
    
    const currentPicture = pictures[currentPhotoIndex];
    
    return (
      <Box className="user-images-column">
        <Box sx={{ position: 'relative', width: '100%', mb: 1 }}>
          <Paper
            sx={{
              width: '100%',
              height: 300,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'grey.800',
              position: 'relative'
            }}
          >
            {!imageLoadStates[currentPhotoIndex] && !imageErrorStates[currentPhotoIndex] && (
              <img 
                src={loadingSvg} 
                style={{
                  width: '60px',
                  height: '60px',
                  position: 'absolute'
                }} 
                alt="Loading" 
              />
            )}
            {imageErrorStates[currentPhotoIndex] ? (
              <img 
                src={alertSvg} 
                style={{
                  width: '60px',
                  height: '60px'
                }} 
                alt="Error loading image" 
              />
            ) : (
              <>
                {imagesToLoad.has(currentPhotoIndex) ? (
                  <img 
                    src={currentPicture.download_link} 
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      opacity: imageLoadStates[currentPhotoIndex] ? 1 : 0
                    }} 
                    alt={`User photo ${currentPhotoIndex + 1}`}
                    onLoad={() => setImageLoadStates(prev => ({ ...prev, [currentPhotoIndex]: true }))}
                    onError={() => setImageErrorStates(prev => ({ ...prev, [currentPhotoIndex]: true }))}
                  />
                ) : (
                  <img 
                    src={loadingSvg} 
                    style={{
                      width: '60px',
                      height: '60px'
                    }} 
                    alt="Loading" 
                  />
                )}
              </>
            )}
            
            {pictures.length > 1 && (() => {
              const nextIndex = currentPhotoIndex === pictures.length - 1 ? 0 : currentPhotoIndex + 1;
              return imagesToLoad.has(nextIndex) && !imageLoadStates[nextIndex] && !imageErrorStates[nextIndex] ? (
                <img 
                  src={pictures[nextIndex].download_link}
                  style={{ display: 'none' }}
                  alt="Preload"
                  onLoad={() => setImageLoadStates(prev => ({ ...prev, [nextIndex]: true }))}
                  onError={() => setImageErrorStates(prev => ({ ...prev, [nextIndex]: true }))}
                />
              ) : null;
            })()}
            
            {pictures.length > 1 && (
              <>
                <IconButton
                  onClick={() => setCurrentPhotoIndex((prev) => prev === 0 ? pictures.length - 1 : prev - 1)}
                  sx={{
                    position: 'absolute',
                    left: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    bgcolor: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
                  }}
                >
                  ←
                </IconButton>
                <IconButton
                  onClick={() => setCurrentPhotoIndex((prev) => prev === pictures.length - 1 ? 0 : prev + 1)}
                  sx={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    bgcolor: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
                  }}
                >
                  →
                </IconButton>
              </>
            )}
          </Paper>
          
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: 0.5, 
            mt: 1,
            alignItems: 'center'
          }}>
            {pictures.map((_: any, index: number) => (
              <Box
                key={index}
                onClick={() => setCurrentPhotoIndex(index)}
                sx={{
                  width: currentPhotoIndex === index ? 12 : 8,
                  height: currentPhotoIndex === index ? 12 : 8,
                  borderRadius: '50%',
                  bgcolor: currentPhotoIndex === index ? 'primary.main' : 'grey.500',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  '&:hover': { bgcolor: currentPhotoIndex === index ? 'primary.main' : 'grey.400' }
                }}
              />
            ))}
            <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
              {currentPhotoIndex + 1} / {pictures.length}
            </Typography>
          </Box>
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
