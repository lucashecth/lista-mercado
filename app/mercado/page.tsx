"use client";

import { useState } from "react";
import { Check, X, Loader2, ShoppingCart } from "lucide-react";
import { iniciarMercadoAction, atualizarCompraAction } from "../actions";

export default function EstouNoMercadoView() {
  const [sessao, setSessao] = useState<{nomeAba: string, itens: any[]} | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [selecionado, setSelecionado] = useState<any>(null);
  const [form, setForm] = useState({ preco: "", qtd: "1" });

  const iniciar = async () => {
    setCarregando(true);
    const dados = await iniciarMercadoAction();
    setSessao(dados);
    setCarregando(false);
  };

  const confirmarItem = async () => {
    const preco = parseFloat(form.preco.replace(',', '.')) || 0;
    const qtd = parseInt(form.qtd) || 1;
    
    // Update local
    const novosItens = sessao!.itens.map(i => 
      i.id === selecionado.id ? { ...i, comprado: true, preco, qtd } : i
    );
    setSessao({ ...sessao!, itens: novosItens });
    
    // Update Google
    await atualizarCompraAction(sessao!.nomeAba, selecionado.id, { comprado: true, preco, qtd });
    setSelecionado(null);
  };

  const total = sessao?.itens.reduce((acc, i) => acc + (i.preco * i.qtd), 0) || 0;

  if (!sessao) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
        <ShoppingCart size={64} className="text-slate-300 mb-6" />
        <button 
          onClick={iniciar}
          disabled={carregando}
          className="w-full max-w-xs bg-green-600 text-white font-black py-6 rounded-3xl shadow-2xl active:scale-95 transition disabled:opacity-50"
        >
          {carregando ? <Loader2 className="animate-spin mx-auto" /> : "ESTOU NO MERCADO!"}
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-32">
      <h1 className="text-2xl font-black text-slate-800 mb-6 flex items-center justify-between">
        {sessao.nomeAba} <span className="text-sm font-normal text-slate-400">Snapshot da lista base</span>
      </h1>

      <div className="space-y-3">
        {sessao.itens.map(item => (
          <div 
            key={item.id} 
            onClick={() => !item.comprado && (setSelecionado(item), setForm({ preco: "", qtd: "1" }))}
            className={`flex items-center p-4 rounded-2xl border-2 transition-all ${item.comprado ? 'bg-green-50 border-green-200' : 'bg-white border-white shadow-sm'}`}
          >
            <div className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center ${item.comprado ? 'bg-green-500 border-green-500' : 'border-slate-200'}`}>
              {item.comprado && <Check size={14} className="text-white" />}
            </div>
            <span className={`flex-1 font-bold ${item.comprado ? 'text-green-800 line-through opacity-50' : 'text-slate-700'}`}>{item.nome}</span>
            {item.comprado && <span className="font-mono font-bold text-green-700">R$ {(item.preco * item.qtd).toFixed(2)}</span>}
          </div>
        ))}
      </div>

      {/* MODAL */}
      {selecionado && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] p-8 shadow-2xl animate-in slide-in-from-bottom">
            <h2 className="text-2xl font-black mb-6 text-slate-800">{selecionado.nome}</h2>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase">Preço Un.</label>
                <input type="number" step="0.01" value={form.preco} onChange={e => setForm({...form, preco: e.target.value})} className="w-full p-4 bg-slate-100 rounded-2xl text-xl font-bold" placeholder="0,00" autoFocus />
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase">Quantidade</label>
                <input type="number" value={form.qtd} onChange={e => setForm({...form, qtd: e.target.value})} className="w-full p-4 bg-slate-100 rounded-2xl text-xl font-bold text-center" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setSelecionado(null)} className="flex-1 py-4 font-bold text-slate-400">Cancelar</button>
              <button onClick={confirmarItem} className="flex-[2] bg-green-600 text-white py-4 rounded-2xl font-black shadow-lg">SALVAR</button>
            </div>
          </div>
        </div>
      )}

      {/* TOTAL FLUTUANTE */}
      <div className="fixed bottom-6 right-6 left-6 bg-slate-900 text-white p-6 rounded-[28px] shadow-2xl flex justify-between items-center border border-white/10">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Acumulado</p>
          <p className="text-3xl font-black text-green-400">R$ {total.toFixed(2).replace('.', ',')}</p>
        </div>
        <ShoppingCart className="text-white/20" size={32} />
      </div>
    </main>
  );
}