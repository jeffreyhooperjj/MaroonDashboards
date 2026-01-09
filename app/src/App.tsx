import { useState, useEffect } from 'react'
import { Card, CardContent, Box, Typography, Button, TextField, CircularProgress } from '@mui/material';
import './App.css'
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'
import { Amplify } from 'aws-amplify';
import { signIn, signOut, getCurrentUser, fetchAuthSession, confirmSignIn } from 'aws-amplify/auth';
import { Header } from './components/layout/Header';
import { UserList } from './components/users/UserList';

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
  const [, page, lastItemViewed, pageSize] = queryKey;

  const session = await fetchAuthSession();
  const token = session.tokens?.accessToken?.toString();
  console.log(token)

  const params = new URLSearchParams();
  if (lastItemViewed) {
    params.set('last_viewed_uuid', lastItemViewed);
  }
  if (pageSize) params.set("page_size", pageSize)

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


function AppContent({ onLogout }) {
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [pageItemMapping, setPageItemMapping] = useState({})
  const [lastItemViewed, setLastItemViewed] = useState(null)
  const [nameFilterInput, setNameFilterInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [userName, setUserName] = useState('');
  
  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const user = await getCurrentUser();
        const session = await fetchAuthSession();
        const givenName = session.tokens?.idToken?.payload?.given_name || '';
        const familyName = session.tokens?.idToken?.payload?.family_name || '';
        setUserName(`${givenName} ${familyName}`.trim());
      } catch (error) {
        console.error('Error fetching user name:', error);
      }
    };
    fetchUserName();
  }, []);

  const { isPending, error, data } = useQuery({
    queryKey: ['users', page, lastItemViewed, pageSize],
    queryFn: makeRequest,
  });

  // Client-side filtering
  const filteredUsers = data?.body?.filter(user => {
    // Name filter
    const nameMatch = !nameFilterInput || 
      user.name?.toLowerCase().includes(nameFilterInput.toLowerCase());
    
    // Status filter
    const statusMatch = statusFilter === 'all' ||
      (statusFilter === 'waitlisted' && user.waitlisted) ||
      (statusFilter === 'approved' && !user.waitlisted);
    
    return nameMatch && statusMatch;
  }) || [];

  useEffect(() => {
    if (!data) return;
  
    // If filters result in empty data on ANY page
    if (data.body.length === 0 && page > 0) {
      setLastItemViewed(null);
      setPageItemMapping({});
      setPage(0);
    }
  }, [data, page]);

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
  };

  const resetPagination = () => {
    setLastItemViewed(null);
    setPageItemMapping({});
    setPage(0);
  };


  if (filteredUsers.length === 0) {
    return (
      <>
        <header>
          <Header
            onPrevPage={handlePrevPage}
            onNextPage={handleNextPage}
            onLogout={onLogout}
            userName={userName}
    
            pageSize={pageSize}
            setPageSize={setPageSize}
    
            nameFilterInput={nameFilterInput}
            setNameFilterInput={setNameFilterInput}
    
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
    
            resetPagination={resetPagination}
          />
        </header>
  
        <section style={{ paddingTop: '180px' }}>
          <Typography sx={{ mt: 3 }}>No users found</Typography>
        </section>

        <footer>
          <p>Exclusive property of Date Maroon Group</p>
        </footer>
      </>
    );
  }
  
  return (
      <>
        <header>
          <Header
            onPrevPage={handlePrevPage}
            onNextPage={handleNextPage}
            onLogout={onLogout}
            userName={userName}
      
            pageSize={pageSize}
            setPageSize={setPageSize}
      
            nameFilterInput={nameFilterInput}
            setNameFilterInput={setNameFilterInput}
      
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
      
            resetPagination={resetPagination}
          />
        </header>
  
        <section style={{ paddingTop: '180px' }}>
          <UserList users={filteredUsers} />
        </section>

        <footer>
          <p>Exclusive property of Date Maroon Group</p>
        </footer>
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
