import type { NextPage } from 'next'

interface props {
  statusCode?: number
}

const Error: NextPage<props> = ({ statusCode }) => {
  return (
    <div className="min-h-screen bg-mafia-dark text-white flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">Error {statusCode || '?'}</h1>
        <p className="text-xl text-gray-400 mb-8">
          {statusCode === 404
            ? 'Page not found'
            : statusCode === 500
            ? 'Server error'
            : 'Something went wrong'}
        </p>
        <a href="/" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition">
          Return to Home
        </a>
      </div>
    </div>
  )
}

export default Error
