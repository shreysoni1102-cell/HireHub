import Navbar from './Navbar.jsx';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500 transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        HireHub — demo job portal · Built with React &amp; Express
      </footer>
    </div>
  );
}
