import { Logo } from "@/components/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-[#f8f9ff]">
      <div className="mb-8">
        <Logo variant="lockup" theme="color" height={40} />
      </div>
      {children}
    </div>
  );
}
