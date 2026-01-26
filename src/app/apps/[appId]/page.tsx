import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { AppRuntime } from './AppRuntime';
import { GeneratedRuntime } from './GeneratedRuntime';
import { V2Runtime } from './V2Runtime';
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
  let spec: Schema | ProjectSpec;
  try {
    spec = app.version === 'v2'
      ? (typeof app.spec === 'string' ? JSON.parse(app.spec) : app.spec) as unknown as Schema
      : (typeof app.spec === 'string' ? JSON.parse(app.spec) : app.spec) as unknown as ProjectSpec;
  } catch (e) {
    console.error('Failed to parse app spec:', e);
    spec = app.version === 'v2' ? { name: '', label: '', fields: [] } : { name: '', description: '', dataStore: { name: '', label: '', fields: [] }, views: [], category: '', features: {} } as any;
  }
  
  let data: DataRecord[] = [];
  try {
    data = (typeof app.data === 'string' ? JSON.parse(app.data) : (app.data || [])) as DataRecord[];
  } catch (e) {
    console.error('Failed to parse app data:', e);
  }
  
  let generatedCode: GeneratedCode | null = null;
  try {
    generatedCode = (typeof app.generatedCode === 'string' 
      ? JSON.parse(app.generatedCode) 
      : app.generatedCode) as unknown as GeneratedCode | null;
  } catch (e) {
    console.error('Failed to parse generated code:', e);
  }
    
  let componentFiles: Record<string, string> | null = null;
  try {
    componentFiles = (typeof app.componentFiles === 'string'
      ? JSON.parse(app.componentFiles)
      : app.componentFiles) as Record<string, string> | null;
  } catch (e) {
    console.error('Failed to parse component files:', e);
  }

  // Check if this is a V2 app (schema-based)
  if (app.version === 'v2') {
    let layout = null;
    try {
      layout = typeof app.layoutDefinition === 'string' ? JSON.parse(app.layoutDefinition) : app.layoutDefinition as any;
    } catch (e) {
      console.error('Failed to parse layout definition:', e);
    }

    return (
      <V2Runtime
        appId={app.id}
        name={app.name}
        description={app.description}
        schema={spec as Schema}
        layout={layout}
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
