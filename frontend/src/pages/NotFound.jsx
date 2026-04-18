import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center max-w-md p-8">
        <div className="text-7xl font-black text-gray-200 mb-4">404</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
        <p className="text-gray-600 mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/" className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
            Home
          </Link>
          <Link to="/member/login" className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition">
            Member Login
          </Link>
        </div>
      </div>
    </div>
  )
}
