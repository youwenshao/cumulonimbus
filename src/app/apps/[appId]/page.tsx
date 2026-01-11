import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { AppRuntime } from './AppRuntime';
import { GeneratedRuntime } from './GeneratedRuntime';
import type { ProjectSpec } from '@/lib/scaffolder/types';
import type { DataRecord } from '@/lib/primitives/types';
import type { GeneratedCode } from '@/lib/scaffolder/code-generator';

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
  const generatedCode = app.generatedCode as unknown as GeneratedCode | null;

  // If we have generated code, use the GeneratedRuntime
  // Otherwise fall back to the primitive-based AppRuntime
  if (generatedCode?.pageComponent) {
    return (
      <GeneratedRuntime
        appId={app.id}
        name={app.name}
        description={app.description}
        spec={spec}
        generatedCode={generatedCode.pageComponent}
        initialData={data}
      />
    );
  }

  // Fallback to primitive-based runtime
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
