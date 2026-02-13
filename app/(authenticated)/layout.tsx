import { redirect } from 'next/navigation';
import { ReactQueryProvider } from '@/components/providers/react-query-provider';
import { SidebarProvider } from '@/components/providers/sidebar-provider';
import { Sidebar } from '@/components/sidebar';
import { TopHeader } from '@/components/top-header';
import { getSessionCookie } from '@/lib/auth';

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSessionCookie();
  
  if (!session) {
    redirect('/');
  }

  return (
    <ReactQueryProvider>
      <SidebarProvider>
        <div className="flex min-h-screen bg-background">
          <Sidebar />
          <div className="flex flex-1 flex-col w-full min-w-0">
            <TopHeader />
            <main className="flex-1 p-6 w-full">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ReactQueryProvider>
  );
}
