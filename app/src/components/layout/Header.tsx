import { Box, Button, TextField, Select, MenuItem } from '@mui/material';
import './Header.css';

interface HeaderProps {
  onPrevPage: () => void;
  onNextPage: () => void;
  onLogout: () => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  nameFilterInput: string;
  setNameFilterInput: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  resetPagination: () => void;
}

export function Header({
  onPrevPage,
  onNextPage,
  onLogout,
  pageSize,
  setPageSize,
  nameFilterInput,
  setNameFilterInput,
  statusFilter,
  setStatusFilter,
  resetPagination
}: HeaderProps) {
  return (
    <Box className="header-container">
      <Box className="header-content">
        <Box className="header-top-row">
          <h1>Maroon Admin Panel</h1>

          <Button variant="outlined" color="error" onClick={onLogout}>
            Logout
          </Button>
        </Box>

        <Box className="header-filters-row">
          <Box className="header-filters">
            <Select
              size="small"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                resetPagination();
              }}
            >
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={20}>20</MenuItem>
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={100}>100</MenuItem>
            </Select>

            <TextField
              size="small"
              label="Search by name"
              value={nameFilterInput}
              onChange={(e) => {
                setNameFilterInput(e.target.value);
                resetPagination();
              }}
            />

            <Select
              size="small"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                resetPagination();
              }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="waitlisted">Waitlisted</MenuItem>
            </Select>
          </Box>

          <Box className="header-pagination">
            <Button size="medium" color="primary" onClick={onPrevPage}>
              Prev Page
            </Button>
            <Button size="medium" color="primary" sx={{ ml: 1 }} onClick={onNextPage}>
              Next Page
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
