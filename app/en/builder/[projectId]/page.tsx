import BuilderWorkspace from "./builder-workspace";

interface BuilderPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function BuilderPage({ params }: BuilderPageProps) {
  const { projectId } = await params;

  return <BuilderWorkspace projectId={projectId} />;
}
