// Auth layout — centred, no sidebar
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 p-4">
      {children}
    </div>
  );
}
