import Navbar from './Navbar.jsx';

export default function Layout({ children }) {
  return (
    <div
      className="min-h-screen flex flex-col transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)' }}
    >
      <Navbar />
      <main className="flex-1 flex flex-col w-full">{children}</main>
    </div>
  );
}
