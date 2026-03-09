import React from 'react'
import { Container, Typography, Button } from '@mui/material'
import { useNavigate } from 'react-router-dom'
// Decorative card fan illustration
const CardFanIllustration = () => (
  <svg
    width="200"
    height="140"
    viewBox="0 0 200 140"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="opacity-20"
  >
    {/* Card 1 - leftmost */}
    <rect
      x="30"
      y="20"
      width="60"
      height="90"
      rx="6"
      fill="#3F51B5"
      transform="rotate(-25 60 65)"
    />
    {/* Card 2 */}
    <rect
      x="50"
      y="15"
      width="60"
      height="90"
      rx="6"
      fill="#5C6BC0"
      transform="rotate(-12 80 60)"
    />
    {/* Card 3 - center */}
    <rect x="70" y="10" width="60" height="90" rx="6" fill="#7986CB" />
    {/* Card 4 */}
    <rect
      x="90"
      y="15"
      width="60"
      height="90"
      rx="6"
      fill="#5C6BC0"
      transform="rotate(12 120 60)"
    />
    {/* Card 5 - rightmost */}
    <rect
      x="110"
      y="20"
      width="60"
      height="90"
      rx="6"
      fill="#3F51B5"
      transform="rotate(25 140 65)"
    />
    {/* Page lines on center card (story element) */}
    <line
      x1="82"
      y1="35"
      x2="118"
      y2="35"
      stroke="white"
      strokeWidth="3"
      strokeLinecap="round"
      opacity="0.6"
    />
    <line
      x1="82"
      y1="50"
      x2="118"
      y2="50"
      stroke="white"
      strokeWidth="3"
      strokeLinecap="round"
      opacity="0.6"
    />
    <line
      x1="82"
      y1="65"
      x2="105"
      y2="65"
      stroke="white"
      strokeWidth="3"
      strokeLinecap="round"
      opacity="0.6"
    />
  </svg>
)
export const LandingPage: React.FC = () => {
  const navigate = useNavigate()
  return (
    <div className="flex-grow bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col">
      <Container
        maxWidth="lg"
        className="flex-grow flex flex-col justify-center py-16"
      >
        <div className="text-center max-w-3xl mx-auto">
          <Typography
            variant="h2"
            color="textPrimary"
            className="mb-6 font-extrabold tracking-tight text-gray-900"
          >
            Your team's best hand for agile estimation
          </Typography>
          <Typography
            variant="h5"
            color="textSecondary"
            className="mb-10 text-gray-600 font-normal"
          >
            Deal out story points with confidence. No sign-up required — create
            a session in seconds and start estimating.
          </Typography>

          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={() => navigate('/create')}
              className="py-3 px-8 text-lg"
            >
              Create Game
            </Button>
            <Button
              variant="outlined"
              color="primary"
              size="large"
              onClick={() => navigate('/join')}
              className="py-3 px-8 text-lg bg-white"
            >
              Join Game
            </Button>
          </div>

          {/* Decorative element */}
          <div className="flex justify-center">
            <CardFanIllustration />
          </div>
        </div>
      </Container>
    </div>
  )
}
