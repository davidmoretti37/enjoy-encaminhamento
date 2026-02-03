import LandingHeader from "./LandingHeader";
import LandingFooter from "./LandingFooter";

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      <main>{children}</main>
      <LandingFooter />
    </div>
  );
}
