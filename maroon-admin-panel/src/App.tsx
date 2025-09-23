import { useState } from 'react'
import { Stack, Card, CardContent, Box, Avatar, Grid, Paper, Typography, Button, TextField, Chip } from '@mui/material';
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'

const queryClient = new QueryClient()

const makeRequest = async ({ queryKey }) => {
  const [, page, lastItemViewed] = queryKey;
  const params = new URLSearchParams({
        password: '12345678910',
  });

  if (lastItemViewed) {
    params.set('last_viewed_uuid', lastItemViewed);
  }
  const url = '/admin/users?' + params.toString();
  console.log(url);
  const response = await fetch(url);
  const result = await response.json();
  console.log(result);
  return result;
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
        <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main' }}>
          {user.name.charAt(0)}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0, gap: 1 }}>
          <Typography variant="h6" component="div" noWrap>
            {user.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {user.email}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Joined: {joinDate}
          </Typography>
          <Box >
            <Typography variant="body2">
              Demographics
            </Typography>
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
          </Box>
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
          </Box>
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
              <Typography variant="caption" color="darkblue" sx={{ fontWeight: 'medium' }}>
                {prompt.question}
              </Typography>
              <Typography variant="body2" 
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

  return (
    <Paper sx={{ bgcolor: 'grey.600' }}>
      <Grid container spacing={1}>
        <Grid item size={3}>
          {renderNameInfo(user)}
          {renderStatus(user)}
        </Grid>
        <Grid item size={4}>
          {renderPrompts(user)}
        </Grid>
        <Grid item size={4}>
          {renderImages(user)}
        </Grid>
        <Grid item size={1}>
          Approval button here
        </Grid>
      </Grid>
    </Paper>
    
  )
  
}

function Header({onPrevPage, onNextPage}) {
  return (
    <div>
      <h1>
        Maroon Admin Panel
      </h1>
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

function AppContent() {
  // for back pages keep a map of page index to lastItemViewed
  // TODO: see if open search returns a max size
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
      // stupid but works
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

  if (isPending) return 'Loading...'
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
      <Header onPrevPage={handlePrevPage} onNextPage={handleNextPage}/>
      <Users users={data.body}/>
    </>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}

export default App
