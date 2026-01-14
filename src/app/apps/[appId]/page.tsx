import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { AppRuntime } from './AppRuntime';
import { GeneratedRuntime } from './GeneratedRuntime';
import { V2Runtime } from './V2Runtime';
import { V2SandboxRuntime } from './V2SandboxRuntime';
import type { ProjectSpec } from '@/lib/scaffolder/types';
import type { DataRecord } from '@/lib/primitives/types';
import type { GeneratedCode } from '@/lib/scaffolder/code-generator';
import type { Schema } from '@/lib/scaffolder-v2/types';

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

  // For v2 apps, use Schema type; for v1 apps, use ProjectSpec
  const spec = app.version === 'v2'
    ? (app.spec as unknown as Schema)
    : (app.spec as unknown as ProjectSpec);
  const data = (app.data || []) as DataRecord[];
  const generatedCode = app.generatedCode as unknown as GeneratedCode | null;
  const componentFiles = app.componentFiles as Record<string, string> | null;
  const executionMode = (app as unknown as { executionMode?: string }).executionMode || 'schema';

  // Check if this is a sandbox app (freeform AI-generated)
  if (executionMode === 'sandbox' || (app.version === 'v2' && componentFiles?.['App.tsx'])) {
    // Get bundled code from component files
    const bundledCode = componentFiles?.['App.tsx'] || componentFiles?.['bundled'] || '';
    
    if (bundledCode) {
      return (
        <V2SandboxRuntime
          appId={app.id}
          name={app.name}
          description={app.description}
          bundledCode={bundledCode}
          schema={spec as unknown as Schema}
          componentFiles={componentFiles || {}}
          initialData={data}
        />
      );
    }
  }

  // Check if this is a V2 app (schema-based)
  if (app.version === 'v2') {
    return (
      <V2Runtime
        appId={app.id}
        name={app.name}
        description={app.description}
        schema={spec as Schema}
        layout={app.layoutDefinition as any}
        componentFiles={componentFiles as any}
        initialData={data}
      />
    );
  }

  // If we have generated code, use the GeneratedRuntime
  // Otherwise fall back to the primitive-based AppRuntime
  if (generatedCode?.pageComponent) {
    return (
      <GeneratedRuntime
        appId={app.id}
        name={app.name}
        description={app.description}
        spec={spec as ProjectSpec}
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
      spec={spec as ProjectSpec}
      initialData={data}
    />
  );
}
