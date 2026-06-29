"use client";

import { Settings, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLogoFlowStore } from "@/store/useLogoFlowStore";
import type { ModelConfig, ModelsResponse, ProviderConfig } from "@/types/logo";

const FALLBACK_MODELS: ModelsResponse = {
  textModels: [{ id: "gpt-5.5", label: "Gpt 5.5", kind: "text" }],
  imageModels: [{ id: "gpt-image-2-vip", label: "Gpt Image 2 Vip", kind: "image" }],
  defaults: {
    analysis: { apiKey: "", baseUrl: "https://www.right.codes/codex/v1", model: "gpt-5.5" },
    image: { apiKey: "", baseUrl: "https://www.right.codes/draw/v1", model: "gpt-image-2-vip" },
  },
};

export function ModelSettingsButton() {
  const modelConfig = useLogoFlowStore((state) => state.modelConfig);
  const setModelConfig = useLogoFlowStore((state) => state.setModelConfig);
  const [isOpen, setOpen] = useState(false);
  const [canPortal, setCanPortal] = useState(false);
  const [modelsData, setModelsData] = useState<ModelsResponse>(FALLBACK_MODELS);
  const [modelsError, setModelsError] = useState<string | null>(null);

  useEffect(() => {
    setCanPortal(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    async function loadModels() {
      try {
        const response = await fetch("/api/models");
        if (!response.ok) throw new Error("request failed");
        const result = (await response.json()) as ModelsResponse;
        if (cancelled) return;
        setModelsData(result);
        setModelsError(null);
      } catch {
        if (!cancelled) setModelsError("模型列表加载失败。");
      }
    }

    void loadModels();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  return (
    <>
      <button
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#141823]/10 bg-white/65 px-3 text-sm text-muted transition hover:border-accent/30 hover:bg-white hover:text-ink"
        type="button"
        onClick={() => setOpen(true)}
        aria-label="打开模型配置"
      >
        <Settings size={16} />
        <span className="hidden sm:inline">模型配置</span>
      </button>
      {isOpen && canPortal
        ? createPortal(
            <ModelSettingsDialog
              config={modelConfig}
              defaults={modelsData.defaults}
              modelsError={modelsError}
              onChange={setModelConfig}
              onClose={() => setOpen(false)}
            />,
            document.body,
          )
        : null}
    </>
  );
}

function ModelSettingsDialog({
  config,
  defaults,
  modelsError,
  onChange,
  onClose,
}: {
  config: ModelConfig;
  defaults: ModelConfig;
  modelsError: string | null;
  onChange: (config: ModelConfig) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<ModelConfig>(config);

  function updateProvider(kind: keyof ModelConfig, patch: Partial<ProviderConfig>) {
    setDraft((current) => ({
      ...current,
      [kind]: {
        ...current[kind],
        ...patch,
      },
    }));
  }

  function applyDefaults(kind: keyof ModelConfig) {
    setDraft((current) => ({
      ...current,
      [kind]: {
        ...current[kind],
        baseUrl: defaults[kind].baseUrl || current[kind].baseUrl,
        model: defaults[kind].model || current[kind].model,
      },
    }));
  }

  function save() {
    onChange(draft);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#141823]/30 p-4 sm:p-5" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <div
        className="flex max-h-[calc(100dvh-32px)] w-full max-w-[560px] flex-col overflow-hidden rounded-[26px] border border-[#141823]/10 bg-white shadow-[0_32px_86px_rgba(20,24,35,0.18)] sm:max-h-[calc(100dvh-40px)] sm:rounded-[30px]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#141823]/[0.06] p-5 pb-4 sm:p-6 sm:pb-5">
          <div>
            <h2 className="text-2xl font-semibold">模型配置</h2>
            <p className="mt-2 text-sm leading-6 text-muted">分析模型和生图模型都使用 OpenAI-compatible 接口。配置保存在当前浏览器本地。</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#141823]/10 bg-white text-muted transition hover:bg-[#f8faff] hover:text-ink"
            aria-label="关闭模型配置"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {modelsError ? <div className="rounded-2xl border border-[#f6d7a8] bg-[#fff8eb] px-4 py-3 text-sm font-medium text-[#8a5a12]">{modelsError}</div> : null}
          <ProviderSection
            config={draft.analysis}
            title="分析模型"
            baseUrlPlaceholder="https://api.example.com/v1"
            modelPlaceholder="gpt-5.5"
            onApplyDefault={() => applyDefaults("analysis")}
            onChange={(patch) => updateProvider("analysis", patch)}
          />
          <ProviderSection
            config={draft.image}
            title="生图模型"
            baseUrlPlaceholder="https://api.example.com/v1"
            modelPlaceholder="gpt-image-2-vip"
            onApplyDefault={() => applyDefaults("image")}
            onChange={(patch) => updateProvider("image", patch)}
          />
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-[#141823]/[0.06] bg-white p-5 pt-4 sm:flex-row sm:justify-end sm:p-6 sm:pt-5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#141823]/10 bg-white px-4 font-medium text-ink transition hover:bg-[#f8faff]"
          >
            取消
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!draft.analysis.baseUrl.trim() || !draft.analysis.model.trim() || !draft.image.baseUrl.trim() || !draft.image.model.trim()}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-accent px-5 font-medium text-white shadow-[0_12px_26px_rgba(0,59,115,0.24)] transition hover:bg-[#002f5c] disabled:cursor-not-allowed disabled:opacity-45"
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
}

function ProviderSection({
  baseUrlPlaceholder,
  config,
  modelPlaceholder,
  onApplyDefault,
  onChange,
  title,
}: {
  baseUrlPlaceholder: string;
  config: ProviderConfig;
  modelPlaceholder: string;
  onApplyDefault: () => void;
  onChange: (patch: Partial<ProviderConfig>) => void;
  title: string;
}) {
  return (
    <section className="mt-5 rounded-[22px] border border-[#141823]/10 bg-[#f8faff]/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-muted">{title}</h3>
        <button type="button" onClick={onApplyDefault} className="text-xs font-semibold text-accent hover:text-[#002f5c]">
          使用默认
        </button>
      </div>
      <div className="mt-4 grid gap-3">
        <ModelField label="API Key" type="password" value={config.apiKey} placeholder="sk-..." onChange={(apiKey) => onChange({ apiKey })} />
        <ModelField label="Base URL" value={config.baseUrl} placeholder={baseUrlPlaceholder} onChange={(baseUrl) => onChange({ baseUrl })} />
        <ModelField label="模型名称" value={config.model} placeholder={modelPlaceholder} onChange={(model) => onChange({ model })} />
      </div>
    </section>
  );
}

function ModelField({
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: "password" | "text";
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 rounded-2xl border border-[#141823]/10 bg-white px-4 text-[15px] font-medium text-ink outline-none transition placeholder:text-[#9aa2b3] focus:border-accent focus:ring-4 focus:ring-accent/10"
      />
    </label>
  );
}
