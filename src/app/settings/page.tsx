"use client";

import { BrainCircuit, Check, Eye, EyeOff, Image as ImageIcon, KeyRound, ListRestart, Loader2, Play, Save, ShieldCheck, Trash2 } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { WorkbenchFrame } from "@/components/universal/WorkbenchFrame";
import type { ModelRole, PublicModelRoleStatus } from "@/types/universal";

type StatusResponse = { analysis: PublicModelRoleStatus; execution: PublicModelRoleStatus; executionImage: PublicModelRoleStatus };
type DiscoveryResponse = { baseUrl: string; discoveredModels: string[]; textModels: string[]; imageModels: string[]; recommendedTextModel: string; recommendedImageModel?: string };

export default function SettingsPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    fetch("/api/models/status").then((response) => { if (!response.ok) throw new Error(); return response.json(); }).then(setStatus).catch(() => setLoadError(true));
  }, []);

  return (
    <WorkbenchFrame current="settings">
      <div className="uc-list-page uc-model-settings-page">
        <span className="uc-eyebrow">OPENAI-COMPATIBLE MODELS</span>
        <h1>模型设置</h1>
        <p>填写调用端点和 API Key 后获取 OpenAI-compatible 模型列表，再从下拉框为每个角色选择模型。</p>
        {loadError ? <div className="uc-inline-error" role="alert">无法读取本机模型配置。</div> : null}
        {!status && !loadError ? <div className="uc-loading-page"><Loader2 className="animate-spin" />读取模型状态…</div> : null}
        {status ? <div className="uc-settings-grid">
          <ModelRoleForm role="analysis" icon={<BrainCircuit size={20} />} title="分析模型" description="理解需求、生成方向与决策、构建 ArtifactSpec、解析修改 Patch。" status={status.analysis} onStatus={setStatus} />
          <ModelRoleForm role="execution" icon={<Play size={20} />} title="执行模型" description="生成文章、网页、PRD 和图片。文本与图片模型会从同一个端点自动发现。" status={status.execution} imageStatus={status.executionImage} onStatus={setStatus} />
        </div> : null}
        <div className="uc-safety-banner"><ShieldCheck size={20} /><div><strong>密钥仅保存在本机服务端</strong><p>配置写入被 Git 忽略的 `.local-data/model-settings.json`，接口响应不会返回 API Key。模型不可用时流程会明确失败，不会降级成 Demo。</p></div></div>
      </div>
    </WorkbenchFrame>
  );
}

function ModelRoleForm({ role, icon, title, description, status, imageStatus, onStatus }: { role: ModelRole; icon: ReactNode; title: string; description: string; status: PublicModelRoleStatus; imageStatus?: PublicModelRoleStatus; onStatus: (status: StatusResponse) => void }) {
  const [endpoint, setEndpoint] = useState(status.baseUrl);
  const [apiKey, setApiKey] = useState("");
  const [textModel, setTextModel] = useState(status.model);
  const [imageModel, setImageModel] = useState(imageStatus?.model ?? "");
  const [textModels, setTextModels] = useState(() => filterTextModels(status.availableModels));
  const [imageModels, setImageModels] = useState(() => filterImageModels(status.availableModels));
  const [showKey, setShowKey] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setEndpoint(status.baseUrl);
    setTextModel(status.model);
    setImageModel(imageStatus?.model ?? "");
    setTextModels(filterTextModels(status.availableModels));
    setImageModels(filterImageModels(status.availableModels));
  }, [imageStatus?.model, status.availableModels, status.baseUrl, status.model]);

  async function discoverModels() {
    setDiscovering(true); setMessage(null);
    try {
      const response = await fetch("/api/models/discover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role, endpoint, apiKey: apiKey || undefined }) });
      const data = await response.json() as DiscoveryResponse & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "无法获取模型列表");
      setEndpoint(data.baseUrl); setTextModels(data.textModels); setImageModels(data.imageModels);
      setTextModel((value) => data.textModels.includes(value) ? value : data.recommendedTextModel);
      if (role === "execution") setImageModel((value) => data.imageModels.includes(value) ? value : data.recommendedImageModel || "");
      setMessage({ type: "success", text: `已获取 ${data.discoveredModels.length} 个模型，请确认选择后保存。` });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "无法获取模型列表" });
    } finally { setDiscovering(false); }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setMessage(null);
    try {
      const response = await fetch("/api/models/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role, endpoint, apiKey: apiKey || undefined, textModel, imageModel: role === "execution" ? imageModel || undefined : undefined }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "保存失败");
      onStatus(data); setApiKey(""); setMessage({ type: "success", text: "连接成功，所选模型已保存。" });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "模型配置保存失败" });
    } finally { setSaving(false); }
  }

  async function clearConfig() {
    setSaving(true); setMessage(null);
    try {
      const response = await fetch("/api/models/status", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "清除失败");
      onStatus(data); setApiKey(""); setMessage({ type: "success", text: "本机保存的配置已清除。" });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "清除失败" });
    } finally { setSaving(false); }
  }

  return (
    <article className="uc-setting-card uc-model-form-card" data-testid={`model-role-${role}`}>
      <div className="uc-model-card-head"><span>{icon}</span><strong className={status.configured ? "configured" : "missing"}>{status.configured ? <><Check size={13} />已配置</> : "未配置"}</strong></div>
      <h2>{title}</h2><p>{description}</p>
      <form onSubmit={save} className="uc-model-form">
        <label><span>调用端点</span><input type="url" value={endpoint} onChange={(event) => setEndpoint(event.target.value)} placeholder="https://api.example.com/v1" required /><small>可填写 API 根地址，也可粘贴完整的 /chat/completions 或 /responses 地址。</small></label>
        <label><span>API Key</span><div className="uc-key-input"><KeyRound size={15} /><input type={showKey ? "text" : "password"} value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={status.configured ? "已保存；留空表示继续使用原 Key" : "sk-..."} autoComplete="off" /><button type="button" onClick={() => setShowKey((value) => !value)} aria-label={showKey ? "隐藏 API Key" : "显示 API Key"}>{showKey ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
        <button className="uc-discover-button" type="button" onClick={() => void discoverModels()} disabled={discovering || !endpoint.trim() || (!status.configured && !apiKey.trim())}>{discovering ? <Loader2 size={15} className="animate-spin" /> : <ListRestart size={15} />}获取模型列表</button>
        <label><span>文本模型</span><select value={textModel} onChange={(event) => setTextModel(event.target.value)} required disabled={!modelOptions(textModel, textModels).length}><option value="" disabled>请先获取模型列表</option>{modelOptions(textModel, textModels).map((model) => <option key={model} value={model}>{model}</option>)}</select><small>{textModels.length ? `已发现 ${textModels.length} 个文本模型，请从列表中选择。` : "获取模型列表后才能选择文本模型。"}</small></label>
        {role === "execution" ? <label><span>图片模型（可选）</span><div className="uc-model-input-with-icon"><ImageIcon size={15} /><select value={imageModel} onChange={(event) => setImageModel(event.target.value)}><option value="">不使用图片模型</option>{modelOptions(imageModel, imageModels).map((model) => <option key={model} value={model}>{model}</option>)}</select></div><small>{imageModels.length ? `已发现 ${imageModels.length} 个图片模型；不需要图片生成时可选择“不使用图片模型”。` : "当前列表没有识别到图片模型。"}</small></label> : null}
        {message ? <div className={`uc-model-message ${message.type}`} role={message.type === "error" ? "alert" : "status"}>{message.text}</div> : null}
        <div className="uc-model-form-actions">{status.configured ? <button className="uc-text-button danger" type="button" onClick={() => void clearConfig()} disabled={saving}><Trash2 size={14} />清除配置</button> : <span />}
          <button className="uc-primary-button" type="submit" disabled={saving || discovering || !endpoint.trim() || !textModel.trim() || (!status.configured && !apiKey.trim())}>{saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}测试并保存选择</button></div>
      </form>
    </article>
  );
}

function filterImageModels(models: string[]) {
  return models.filter((model) => /(image|dall|flux|imagen)/i.test(model));
}

function filterTextModels(models: string[]) {
  const text = models.filter((model) => !/(image|dall|flux|imagen|embedding|whisper|tts|audio)/i.test(model));
  return text.length ? text : models;
}

function modelOptions(selected: string, discovered: string[]) {
  return [...new Set([selected, ...discovered].filter(Boolean))];
}
