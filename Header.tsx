import React from 'react'
import { AppBar, Toolbar, Typography, Button, Container } from '@mui/material'
import { useNavigate, useLocation } from 'react-router-dom'
// Custom Storyhand logo - fanned cards with a book/page motif
const StoryhandLogo = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-white"
  >
    {/* Back card */}
    <rect
      x="2"
      y="4"
      width="12"
      height="16"
      rx="2"
      fill="currentColor"
      opacity="0.4"
      transform="rotate(-15 8 12)"
    />
    {/* Middle card */}
    <rect
      x="6"
      y="3"
      width="12"
      height="16"
      rx="2"
      fill="currentColor"
      opacity="0.7"
    />
    {/* Front card with page lines (story element) */}
    <rect
      x="8"
      y="2"
      width="12"
      height="16"
      rx="2"
      fill="currentColor"
      transform="rotate(10 14 10)"
    />
    {/* Page lines on front card */}
    <line
      x1="11"
      y1="7"
      x2="17"
      y2="6"
      stroke="#4F46E5"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <line
      x1="11"
      y1="10"
      x2="17"
      y2="9"
      stroke="#4F46E5"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <line
      x1="11"
      y1="13"
      x2="15"
      y2="12.5"
      stroke="#4F46E5"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
)
export const Header: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const isLanding = location.pathname === '/'
  return (
    <AppBar
      position="static"
      color="inherit"
      elevation={1}
      className="z-50 border-b border-gray-200"
    >
      <Container maxWidth="xl">
        <Toolbar
          disableGutters
          className="flex justify-between items-center h-16"
        >
          <div
            className="flex items-center cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <div className="bg-indigo-600 p-2 rounded-lg mr-3 group-hover:bg-indigo-700 transition-colors">
              <StoryhandLogo />
            </div>
            <Typography
              variant="h6"
              color="primary"
              className="font-bold tracking-tight"
            >
              Storyhand
            </Typography>
          </div>

          {!isLanding && (
            <Button
              color="inherit"
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-900"
            >
              Exit
            </Button>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  )
}
