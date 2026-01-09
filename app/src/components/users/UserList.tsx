import { Box } from '@mui/material';
import { UserRow } from './UserRow';
import './UserList.css';

interface UserListProps {
  users: any[];
}

export function UserList({ users }: UserListProps) {
  return (
    <Box className="user-list-container">
      {users.map((user) => (
        <Box className="user-list-item" key={user.user_uuid}>
          <UserRow user={user} />
        </Box>
      ))}
    </Box>
  );
}
