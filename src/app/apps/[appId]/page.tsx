import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { AppRuntime } from './AppRuntime';
import { GeneratedRuntime } from './GeneratedRuntime';
import { V2Runtime } from './V2Runtime';
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

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/abdc0eda-3bc5-4723-acde-13a524455249',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:33',message:'App data loaded',data:{appId:app.id,appVersion:app.version,specKeys:Object.keys(spec),hasViews:'views' in spec,hasDataStore:'dataStore' in spec,hasFields:'fields' in spec,hasLayout:app.layoutDefinition !== null,generatedCodeExists:!!generatedCode?.pageComponent,componentFiles:app.componentFiles,layoutDefinition:app.layoutDefinition},sessionId:'debug-session',runId:'v2-runtime-fix',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion

  // Check if this is a V2 app
  if (app.version === 'v2') {
    return (
      <V2Runtime
        appId={app.id}
        name={app.name}
        description={app.description}
        schema={spec}
        layout={app.layoutDefinition as any}
        componentFiles={app.componentFiles as any}
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
