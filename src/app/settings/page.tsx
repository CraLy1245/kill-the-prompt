"use client";

import { BrainCircuit, Image as ImageIcon, KeyRound, Loader2, Play, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { WorkbenchFrame } from "@/components/universal/WorkbenchFrame";
import type { PublicModelRoleStatus } from "@/types/universal";

type StatusResponse = { analysis: PublicModelRoleStatus; execution: PublicModelRoleStatus; executionImage: PublicModelRoleStatus };

export default function SettingsPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    fetch("/api/models/status").then((response) => { if (!response.ok) throw new Error(); return response.json(); }).then(setStatus).catch(() => setError(true));
  }, []);
  return (
    <WorkbenchFrame current="settings">
      <div className="uc-list-page">
        <span className="uc-eyebrow">SERVER MODEL ROLES</span>
        <h1>模型设置</h1>
        <p>业务模型只分为分析模型和执行模型。密钥仅从服务端环境变量读取，浏览器不会接收或保存 API Key。</p>
        {error ? <div className="uc-inline-error" role="alert">无法读取服务端模型状态。</div> : null}
        {!status && !error ? <div className="uc-loading-page"><Loader2 className="animate-spin" />读取模型状态…</div> : null}
        {status ? <div className="uc-settings-grid">
          <ModelRoleCard icon={<BrainCircuit size={20} />} title="分析模型" description="理解需求、生成方向与决策模块、构建 ArtifactSpec、解析修改 Patch。" models={[status.analysis]} variables="ANALYSIS_MODEL_BASE_URL / API_KEY / ID" />
          <ModelRoleCard icon={<Play size={20} />} title="执行模型" description="只消费已确认的 ArtifactSpec；文本驱动生成文章、网页和 PRD，图片驱动调用生图接口。" models={[status.execution, status.executionImage]} variables="EXECUTION_MODEL_* / EXECUTION_IMAGE_*" />
        </div> : null}
        <div className="uc-safety-banner"><ShieldCheck size={20} /><div><strong>没有 Demo 静默降级</strong><p>任一模型未配置或返回结果无法通过 Schema 校验时，流程会明确失败并保留原项目状态，不会用固定模板伪装成真实结果。</p></div></div>
      </div>
    </WorkbenchFrame>
  );
}

function ModelRoleCard({ icon, title, description, models, variables }: { icon: ReactNode; title: string; description: string; models: PublicModelRoleStatus[]; variables: string }) {
  return <article className="uc-setting-card">{icon}<h2>{title}</h2><p>{description}</p><div className="uc-model-status-list">{models.map((model, index) => <div key={`${model.role}-${index}`}><span>{index === 0 ? <KeyRound size={14} /> : <ImageIcon size={14} />}{index === 0 ? "文本接口" : "图片接口"}</span><strong className={model.configured ? "configured" : "missing"}>{model.configured ? "已配置" : "未配置"}</strong><small>{model.model || "未设置模型 ID"}<br />{model.baseUrl}</small></div>)}</div><code>{variables}</code></article>;
}
