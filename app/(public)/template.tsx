/** A template re-mounts on every navigation, giving each page a soft entrance. */
export default function PublicTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
