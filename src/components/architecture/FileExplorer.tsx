import React, { useState } from 'react';
import { FolderTree, Code2, Copy, Check, Download } from 'lucide-react';
import { ARCHITECTURE_FILES, ArchFile } from '../../data/architectureFiles';
import { downloadTextFile } from '../../utils/download';

/** Selector de archivos + visor de código con copiar/descargar. */
export const FileExplorer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<ArchFile>(ARCHITECTURE_FILES[0]);
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => downloadTextFile(selectedFile.name, selectedFile.content);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* File Tree Selector */}
      <div className="lg:col-span-1 p-4 rounded-2xl bg-[#0f0f0f] border border-white/10 space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">
          <FolderTree className="w-4 h-4 text-emerald-400" />
          Archivos del Proyecto:
        </div>

        {ARCHITECTURE_FILES.map(file => {
          const isSelected = selectedFile.name === file.name;
          return (
            <button
              key={file.name}
              onClick={() => setSelectedFile(file)}
              className={`w-full text-left px-3 py-2.5 rounded-md text-xs font-mono transition-all flex items-center justify-between ${
                isSelected
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="truncate">
                <div className="truncate text-white">{file.name}</div>
                <div className="text-[10px] text-slate-500">{file.path}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Code Viewer Panel */}
      <div className="lg:col-span-3 rounded-2xl border border-white/10 overflow-hidden bg-[#0f0f0f] shadow-2xl flex flex-col justify-between">
        <div className="px-5 py-3.5 bg-black border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-emerald-400" />
              <span className="font-mono text-xs font-bold text-white">{selectedFile.name}</span>
              <span className="text-[10px] font-mono text-slate-500">({selectedFile.language})</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">{selectedFile.description}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-xs font-mono text-slate-300 border border-white/10"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-500 text-black font-bold hover:bg-emerald-400 text-xs font-mono transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar</span>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 overflow-x-auto max-h-[500px] overflow-y-auto font-mono text-xs leading-relaxed text-slate-300 bg-black">
          <pre>{selectedFile.content}</pre>
        </div>
      </div>
    </div>
  );
};
