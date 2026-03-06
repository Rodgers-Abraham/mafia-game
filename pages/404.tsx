export default function Custom404() {
  return (
    <div className="min-h-screen bg-mafia-dark text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-gray-400 text-xl mb-8">Room not found</p>
        <a href="/" className="text-blue-400 hover:underline text-lg">
          Back to Home
        </a>
      </div>
    </div>
  )
}