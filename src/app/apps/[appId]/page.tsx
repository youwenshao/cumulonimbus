import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { AppRuntime } from './AppRuntime';
import type { ProjectSpec } from '@/lib/scaffolder/types';
import type { DataRecord } from '@/lib/primitives/types';

interface PageProps {
  params: Promise<{ appId: string }>;
}

export default async function AppPage({ params }: PageProps) {
  const session = await getServerSession();
  const { appId } = await params;
  
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=' + encodeURIComponent(`/apps/${appId}`));
  }

  const app = await prisma.app.findFirst({
    where: {
      id: appId,
      userId: session.user.id,
    },
  });

  if (!app) {
    redirect('/dashboard');
  }

  const spec = app.spec as unknown as ProjectSpec;
  const data = (app.data || []) as DataRecord[];

  return (
    <AppRuntime
      appId={app.id}
      name={app.name}
      description={app.description}
      spec={spec}
      initialData={data}
    />
  );
}
