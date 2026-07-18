"use client";

import { ArrowLeft, FileJson2, Loader2, ShieldCheck, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { WorkbenchFrame } from "@/components/universal/WorkbenchFrame";

export default function NewPackPage() {
  const router = useRouter();
  const [source, setSource] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function importPack() {
    setError(null);
    setSubmitting(true);
    try {
      const payload = JSON.parse(source) as { id?: string };
      const response = await fetch("/api/packs/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "导入失败");
      router.push(`/packs/${encodeURIComponent(result.id)}`);
    } catch (caught) {
      setError(caught instanceof SyntaxError ? "JSON 格式不正确，请检查逗号、引号与括号。" : caught instanceof Error ? caught.message : "导入失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <WorkbenchFrame current="packs">
      <div className="uc-list-page uc-new-pack">
        <Link className="uc-back-link" href="/packs"><ArrowLeft size={14} />返回创作包</Link>
        <span className="uc-eyebrow">CUSTOM PACK</span>
        <h1>导入创作包</h1>
        <p>上传或粘贴声明式 JSON。系统会先通过同一套 Schema 校验，只有合法配置才会写入本地工作区。</p>

        <div className="uc-import-layout">
          <section className="uc-import-editor">
            <div className="uc-import-toolbar">
              <div><FileJson2 size={18} /><strong>{fileName || "创作包 JSON"}</strong></div>
              <label className="uc-secondary-button"><Upload size={15} />选择文件<input type="file" accept="application/json,.json" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; setFileName(file.name); setSource(await file.text()); setError(null); }} /></label>
            </div>
            <label className="sr-only" htmlFor="uc-pack-json">创作包 JSON</label>
            <textarea id="uc-pack-json" value={source} onChange={(event) => setSource(event.target.value)} spellCheck={false} placeholder={'{\n  "id": "my-pack",\n  "name": "我的创作包",\n  ...\n}'} />
            {error ? <div className="uc-inline-error" role="alert">{error}</div> : null}
            <div className="uc-import-actions"><span>导入后仍可从详情页导出、克隆或删除自定义包。</span><button className="uc-primary-button" disabled={!source.trim() || submitting} onClick={() => void importPack()}>{submitting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}校验并导入</button></div>
          </section>
          <aside className="uc-import-notes">
            <ShieldCheck size={22} />
            <h2>安全边界</h2>
            <p>仅接受字段、流程、决策模块与成果编译器的声明式配置。</p>
            <ul><li>不执行 JavaScript</li><li>不加载 Node 模块</li><li>不允许动态 import</li><li>非法 ID 与未知字段会被拒绝</li></ul>
            <Link href="/packs">从内置示例导出 JSON →</Link>
          </aside>
        </div>
      </div>
    </WorkbenchFrame>
  );
}
