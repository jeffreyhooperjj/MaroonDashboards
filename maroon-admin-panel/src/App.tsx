import { useState, useEffect } from 'react'
import { Stack, Card, CardContent, Box, Avatar, Grid,
          Paper, Typography, Button, TextField, Chip,
          CircularProgress, Snackbar, Alert, Select, MenuItem } from '@mui/material';
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useMutation,
} from '@tanstack/react-query'
import { Amplify } from 'aws-amplify';
import { signIn, signOut, getCurrentUser, fetchAuthSession, confirmSignIn } from 'aws-amplify/auth';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'us-east-2_C8nXVq1Aa',
      userPoolClientId: '1qcofc992ir7hvku5j8c38betj',
      region: 'us-east-2'
    }
  }
});

const queryClient = new QueryClient()

const makeRequest = async ({ queryKey }) => {
  const [, page, lastItemViewed] = queryKey;

  const session = await fetchAuthSession();
  const token = session.tokens?.accessToken?.toString();
  console.log(token)

  const params = new URLSearchParams();
  if (lastItemViewed) {
    params.set('last_viewed_uuid', lastItemViewed);
  }
  const url = '/admin/users?' + params.toString();

  console.log(url);
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const result = await response.json();
  console.log(result);
  return result;
}

function Login({ onLoginSuccess }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);


  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { isSignedIn } = await confirmSignIn({
        challengeResponse: otp
      });

      if (isSignedIn) {
        onLoginSuccess();
      }
    } catch (err) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  try {
    const { nextStep } = await signIn({
      username: phoneNumber,
      options: {
        authFlowType: 'CUSTOM_WITHOUT_SRP' // Changed from CUSTOM_WITH_SRP
      }
    });

    if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE') {
      setOtpSent(true);
    }
  } catch (err) {
    setError(err.message || 'Failed to send OTP');
    console.error('Sign in error:', err);
  } finally {
    setLoading(false);
  }
};

  const handleResendOTP = async () => {
    setError('');
    setLoading(true);
    
    try {
      // Re-initiate sign-in to resend OTP
      await signIn({
        username: phoneNumber,
        options: {
          authFlowType: 'CUSTOM_WITHOUT_SRP'
        }
      });
      setError('OTP resent successfully');
    } catch (err) {
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh' 
    }}>
      <Card sx={{ maxWidth: 400, width: '100%', p: 3 }}>
        <CardContent>
          <Typography variant="h5" component="h1" gutterBottom>
            Admin Login
          </Typography>
          
          {!otpSent ? (
            <form onSubmit={handleSendOTP}>
              <TextField
                fullWidth
                label="Phone Number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                margin="normal"
                placeholder="+1234567890"
                required
                helperText="Enter your phone number with country code"
              />
              {error && (
                <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                  {error}
                </Typography>
              )}
              <Button
                fullWidth
                variant="contained"
                type="submit"
                disabled={loading}
                sx={{ mt: 2 }}
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                We've sent a verification code to {phoneNumber}
              </Typography>
              <TextField
                fullWidth
                label="Verification Code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                margin="normal"
                placeholder="Enter 6-digit code"
                required
                inputProps={{ maxLength: 6 }}
              />
              {error && (
                <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                  {error}
                </Typography>
              )}
              <Button
                fullWidth
                variant="contained"
                type="submit"
                disabled={loading}
                sx={{ mt: 2 }}
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </Button>
              <Button
                fullWidth
                variant="text"
                onClick={handleResendOTP}
                disabled={loading}
                sx={{ mt: 1 }}
              >
                Resend Code
              </Button>
              <Button
                fullWidth
                variant="text"
                onClick={() => {
                  setOtpSent(false);
                  setOtp('');
                  setError('');
                }}
                sx={{ mt: 1 }}
              >
                Change Phone Number
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

function Users({users}) {
  return (
    <div>
        <UserRows users={users} />
    </div>
  )
}


function UserRows({users}) {
  return users.map((user) => (
    <Box margin={2}  >
      <UserRow user={user} />
    </Box>
  ));
}

function UserRow({user}) {
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [tier, setTier] = useState(user.tier ?? "tier4");

  const approveUserMutation = useMutation({
    mutationFn: async ({userUuid, userTier}) => {
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
    },
    onError: () => {
      setSnackbar({ open: true, message: 'Failed to approve user', severity: 'error' });
    },
  });
  const renderStatus = (user) => {
    const status = user.waitlisted ? 'Waitlisted' : 'Approved';
    const color = user.waitlisted ? 'warning' : 'success';
    
    return (
      <Chip 
        label={status} 
        color={color}
        variant="filled"
        sx={{ fontWeight: 'medium' }}
      />
    );
  };
  const renderNameInfo = (user) => {
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
              <Typography variant="h6" component="div" noWrap>
                {user.name}
              </Typography>
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
                  Location: Lat: {user.location?.latitude} Long: {user.location?.longitude}
                </Typography>
                <Typography variant="body2">
                  Job Industry: {user.job_industry}
                </Typography>
                <Typography variant="body2">
                  Ethnicity: {user.ethnicity}
                </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                <Chip 
                  label="Verified" 
                  size="small" 
                  variant="outlined"
                />
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

  const renderPrompts = (user) => {
    const prompts = user.prompts || [];
    return (
      <Stack spacing={1} sx={{maxWidth: 400}}>
        {prompts.map((prompt, index) => (
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

  const renderImages = (user) => {
    const pictures = user.pictures || [];
    return (
      <Box sx={{ display: 'flex', gap: 1 }}>
        {pictures.slice(0, 4).map((pic, index) => (
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
              <img src={pictures[index].download_link} style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }} />
            </Paper>
            <Button 
              size="small" 
              sx={{ fontSize: '0.7rem', mt: 0.5 }}
              color="darkblue"
            >
              Download
            </Button>
          </Box>
        ))}
      </Box>
    );
  };
  


  const approveUser = () => {
    if (!tier) {
      console.log("tier is not set");
      return;
    }
    approveUserMutation.mutate({userUuid: user.user_uuid, userTier: tier})
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
          <Grid item size={3.5}>
            {renderImages(user)}
          </Grid>
          <Grid item size={1}>
            <Select
              labelId="demo-simple-select-label"
              id="demo-simple-select"
              value={tier}
              label="User's Tier"
              onChange={(event) => {
                setTier(event.target.value);
              }}
              disabled={!user.waitlisted}
            >
            <MenuItem value={"tier1"}>Tier 1</MenuItem>
            <MenuItem value={"tier2"}>Tier 2</MenuItem>
            <MenuItem value={"tier3"}>Tier 3</MenuItem>
            <MenuItem value={"tier4"}>Tier 4</MenuItem>
          </Select>
            <Button variant="outlined" color="red" onClick={approveUser} disabled={!user.waitlisted}>{approveUserMutation.isPending ? "Approving" : "Approve"}</Button>
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


function Header({onPrevPage, onNextPage, onLogout}) {
  return (
    <div>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Maroon Admin Panel</h1>
        <Button 
          variant="outlined"
          color="error"
          onClick={onLogout}
        >
          Logout
        </Button>
      </Box>
      <Button 
        size="medium" 
        color="darkblue"
        onClick={onPrevPage}
      >
        Prev Page
      </Button>
      <Button 
        size="medium" 
        color="darkblue"
        onClick={onNextPage}
      >
        Next Page
      </Button>
    </div>
  )
}

function AppContent({ onLogout }) {
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [pageItemMapping, setPageItemMapping] = useState({})
  const [lastItemViewed, setLastItemViewed] = useState(null)

  const { isPending, error, data } = useQuery({
    queryKey: ['users', page, lastItemViewed],
    queryFn: makeRequest,
  })

  const handleNextPage = () => {
    if (data?.body?.length > 0) {
      const item = Number(data.last_evaluated_key.slice(1,-1))
      setLastItemViewed(item);
      setPageItemMapping((prev) => ({
        ...prev,
        [page]: item
      }))
      setPage(page + 1);
      console.log('page', page)
      console.log(pageItemMapping)
    }
  };

  const handlePrevPage = () => {
    if (!lastItemViewed) return;
    setLastItemViewed(pageItemMapping[page-2]);
    setPage(page-1);
    console.log("page", page);
  }

  if (isPending) return <CircularProgress size={40} color="inherit" />
  if (error) return 'An error has occurred: ' + error.message
  if (data.body.length === 0 && page > 0) {
    console.log("resetting")
    setLastItemViewed(null);
    setPageItemMapping({});
    setPage(0);
    return
  }
  if (data.body.length === 0) return 'No users found';

  return (
    <>
      <Header 
        onPrevPage={handlePrevPage} 
        onNextPage={handleNextPage}
        onLogout={onLogout}
      />
      <Users users={data.body}/>
    </>
  )
}


function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      await getCurrentUser();
      setIsAuthenticated(true);
    } catch {
      setIsAuthenticated(false);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isCheckingAuth) {
    return <div>Loading...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      {isAuthenticated ? (
        <AppContent onLogout={handleLogout} />
      ) : (
        <Login onLoginSuccess={() => setIsAuthenticated(true)} />
      )}
    </QueryClientProvider>
  )
}

export default App
