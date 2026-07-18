import { WorkspaceClient } from "@/components/universal/WorkspaceClient";
export default async function WorkspacePage({ params }: { params: Promise<{ projectId: string }> }) { return <WorkspaceClient projectId={(await params).projectId} />; }
