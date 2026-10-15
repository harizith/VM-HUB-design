"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Database, Loader2, Paperclip, Terminal } from "lucide-react";
import * as XLSX from "xlsx";

export default function AdminAgentChat({ onTimetableUpdated }: { onTimetableUpdated?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "agent"; content: string; data?: any }[]>([
    {
      role: "agent",
      content: "Connected to VM-HUB ERP Operations Console (v4.8.2). Execute administrative queries, bulk data mutations, or attach institutional Excel files for batch processing (e.g., 'Update user designation to Professor', 'Find all faculty in CSE department', 'Show timetable entries for Day Order III')."
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachedData, setAttachedData] = useState<any[] | null>(null);
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setAttachedFileName(file.name);
    setIsLoading(true);

    try {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        if (bstr) {
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);
          setAttachedData(data);
          setMessages(prev => [...prev, { role: "agent", content: `(Attached ${file.name} with ${data.length} records. Ready to execute bulk import or verification.)` }]);
        }
        setIsLoading(false);
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      setMessages(prev => [...prev, { role: "agent", content: "Failed to parse spreadsheet file." }]);
      setIsLoading(false);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setIsLoading(true);

    try {
      const payload: any = { 
        query: userMessage,
        history: messages
          .filter(m => !m.content.startsWith("(Attached"))
          .map(m => ({
            role: m.role === "agent" ? "assistant" : "user",
            content: m.content
          }))
      };
      if (attachedData) {
        payload.attachedData = attachedData;
      }

      const res = await fetch("/api/admin/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      setMessages(prev => [...prev, { 
        role: "agent", 
        content: data.reply || "Operation completed.", 
        data: data.data 
      }]);
      
      if (attachedData) {
        setAttachedData(null);
        setAttachedFileName(null);
      }
      
      if (data.success && onTimetableUpdated && data.data?.isWrite) {
        onTimetableUpdated();
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: "agent", content: "Error executing database command." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: "fixed",
          bottom: "1.5rem",
          right: "1.5rem",
          backgroundColor: "var(--royal-blue)",
          color: "white",
          border: "none",
          borderRadius: "9999px",
          padding: "0.75rem 1.25rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          boxShadow: "0 4px 20px rgba(29, 78, 216, 0.4)",
          cursor: "pointer",
          zIndex: 9999,
          fontWeight: "600",
          fontSize: "0.85rem",
          transition: "transform 0.2s ease"
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
        onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
      >
        <Terminal size={18} />
        DB Console
      </button>
    );
  }

  return (
    <div style={{
      position: "fixed",
      bottom: "1.5rem",
      right: "1.5rem",
      width: "420px",
      maxWidth: "calc(100vw - 3rem)",
      height: "540px",
      backgroundColor: "var(--bg-card)",
      borderRadius: "14px",
      boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
      display: "flex",
      flexDirection: "column",
      border: "1px solid var(--border-subtle)",
      zIndex: 9999,
      overflow: "hidden"
    }}>
      {/* Console Header */}
      <div style={{
        padding: "0.85rem 1rem",
        backgroundColor: "#1e293b",
        color: "white",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid var(--border-subtle)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "700", fontSize: "0.85rem" }}>
          <Database size={16} className="text-blue-400" />
          ERP Operations Console
          <span style={{ fontSize: "0.7rem", padding: "0.1rem 0.4rem", borderRadius: "4px", backgroundColor: "rgba(56, 189, 248, 0.15)", color: "var(--sky-blue)" }}>
            v4.8
          </span>
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages Window */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem", backgroundColor: "var(--bg-page)" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ 
            alignSelf: m.role === "user" ? "flex-end" : "flex-start",
            maxWidth: "88%"
          }}>
            <div style={{
              padding: "0.65rem 0.85rem",
              borderRadius: "8px",
              backgroundColor: m.role === "user" ? "var(--royal-blue)" : "var(--bg-input)",
              color: m.role === "user" ? "#ffffff" : "var(--text-main)",
              border: m.role === "agent" ? "1px solid var(--border-subtle)" : "none",
              fontSize: "0.825rem",
              lineHeight: "1.45",
              whiteSpace: "pre-wrap",
              fontFamily: m.role === "agent" ? "inherit" : "inherit"
            }}>
              {m.content}
            </div>
            {m.data && m.data.sqlQuery && (
              <div style={{ 
                marginTop: "0.4rem", 
                display: "flex", 
                flexDirection: "column", 
                gap: "0.4rem",
                maxHeight: "240px",
                overflowY: "auto",
              }}>
                <div style={{ padding: "0.4rem 0.6rem", backgroundColor: "#020617", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--sky-blue)", fontFamily: "monospace" }}>Query Executed:</span>
                  <pre style={{ margin: "0.2rem 0 0 0", fontSize: "0.7rem", color: "#94a3b8", overflowX: "auto" }}>
                    {m.data.sqlQuery}
                  </pre>
                </div>
                {m.data.records && m.data.records.length > 0 && (
                  <div style={{ overflowX: "auto", border: "1px solid var(--border-subtle)", borderRadius: "6px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.7rem", textAlign: "left" }}>
                      <thead>
                        <tr style={{ backgroundColor: "var(--bg-card-header)" }}>
                          {Object.keys(m.data.records[0]).slice(0, 4).map(k => (
                            <th key={k} style={{ padding: "0.3rem 0.5rem", borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {m.data.records.slice(0, 5).map((row: any, idx: number) => (
                          <tr key={idx} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                            {Object.keys(m.data.records[0]).slice(0, 4).map(k => (
                              <td key={k} style={{ padding: "0.3rem 0.5rem", color: "var(--text-main)" }}>{String(row[k])}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", fontSize: "0.8rem", padding: "0.5rem" }}>
            <Loader2 size={14} className="animate-spin" />
            Executing database operation...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {attachedFileName && (
        <div style={{ padding: "0.4rem 0.75rem", backgroundColor: "rgba(56, 189, 248, 0.1)", borderTop: "1px solid var(--border-subtle)", fontSize: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--sky-blue)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
            Attached: {attachedFileName} ({attachedData?.length} records)
          </span>
          <button onClick={() => { setAttachedData(null); setAttachedFileName(null); }} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input Tray */}
      <div style={{
        padding: "0.6rem 0.75rem",
        backgroundColor: "var(--bg-card)",
        borderTop: "1px solid var(--border-subtle)",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem"
      }}>
        <label 
          title="Attach Excel file for bulk operations"
          style={{
            cursor: "pointer",
            padding: "0.5rem",
            borderRadius: "6px",
            backgroundColor: "var(--bg-input)",
            border: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)"
          }}>
          <Paperclip size={15} />
          <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} style={{ display: "none" }} />
        </label>
        <input 
          type="text" 
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          placeholder="Execute administrative command or query..."
          style={{
            flex: 1,
            padding: "0.6rem 0.75rem",
            borderRadius: "6px",
            border: "1px solid var(--border-subtle)",
            backgroundColor: "var(--bg-input)",
            color: "var(--text-main)",
            outline: "none",
            fontSize: "0.825rem"
          }}
        />
        <button 
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          style={{
            padding: "0.6rem 0.75rem",
            borderRadius: "6px",
            backgroundColor: "var(--royal-blue)",
            color: "white",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: (!input.trim() || isLoading) ? 0.6 : 1
          }}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
