"use client";

import { useState, useEffect } from "react";
import { Check, X, Loader2, ShoppingCart, ArrowLeft, Store, Scale, Search } from "lucide-react";
import Link from "next/link";
import { iniciarMercadoAction, atualizarCompraAction, finalizarCompraAction } from "../actions";

export default function EstouNoMercadoView() {
  const [sessao, setSessao] = useState<{nomeAba: string, itens: any[], mercadoNome: string, finalizado: boolean} | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [selecionado, setSelecionado] = useState<any>(null);
  const [confirmarFinalizacao, setConfirmarFinalizacao] = useState(false);
  const [busca, setBusca] = useState("");
  const [modoModal, setModoModal] = useState<'QTD' | 'PESO'>('QTD');
  const [form, setForm] = useState({ preco: "", qtd: "1", peso: "", valorTotal: "" });

  useEffect(() => {
    iniciarMercadoAction().then(dados => {
      setSessao(dados);
      setCarregando(false);
    }).catch(() => setCarregando(false));
  }, []);

  const toggleItem = async (item: any) => {
    if (sessao?.finalizado) return;

    if (item.comprado) {
      const novosItens = sessao!.itens.map(i => i.id === item.id ? { ...i, comprado: false, preco: 0, qtd: '0', total: 0 } : i);
      setSessao({ ...sessao!, itens: novosItens });
      await atualizarCompraAction(sessao!.nomeAba, item.id, { comprado: false, preco: 0, qtd: '0', total: 0, mercadoNome: sessao!.mercadoNome });
    } else {
      setSelecionado(item);
      setModoModal('QTD');
      setForm({ preco: "", qtd: "1", peso: "", valorTotal: "" });
    }
  };

  const confirmarItem = async () => {
    let precoSave = 0, qtdSave = "", totalSave = 0;

    if (modoModal === 'QTD') {
      precoSave = parseFloat(form.preco.replace(',', '.')) || 0;
      const qtdNumerica = parseFloat(form.qtd.replace(',', '.')) || 1;
      qtdSave = qtdNumerica.toString(); 
      totalSave = precoSave * qtdNumerica; 
    } else {
      totalSave = parseFloat(form.valorTotal.replace(',', '.')) || 0;
      qtdSave = form.peso ? form.peso : "1 un"; 
      precoSave = totalSave; 
    }

    const novosItens = sessao!.itens.map(i => 
      i.id === selecionado.id ? { ...i, comprado: true, preco: precoSave, qtd: qtdSave, total: totalSave } : i
    );
    setSessao({ ...sessao!, itens: novosItens });
    await atualizarCompraAction(sessao!.nomeAba, selecionado.id, { comprado: true, preco: precoSave, qtd: qtdSave, total: totalSave, mercadoNome: sessao!.mercadoNome });
    setSelecionado(null);
    setBusca(""); 
  };

  const finalizarCompra = async () => {
    setCarregando(true);
    await finalizarCompraAction(sessao!.nomeAba, sessao!.mercadoNome);
    setSessao({ ...sessao!, finalizado: true });
    setConfirmarFinalizacao(false);
    setCarregando(false);
  };

  const total = sessao?.itens.reduce((acc, i) => acc + (i.total || 0), 0) || 0;
  const itensFiltrados = sessao?.itens.filter(item => item.nome.toLowerCase().includes(busca.toLowerCase())) || [];

  if (carregando) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="animate-spin text-green-500" size={40} />
      </div>
    );
  }

  if (!sessao) return null;

  return (
    <main className="min-h-screen bg-slate-950 p-4 pb-40">
      
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-4">
        <Link href="/" className="p-2 bg-slate-900 rounded-full text-slate-300">
          <ArrowLeft size={24} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-black text-white">{sessao.nomeAba}</h1>
          <div className="flex items-center gap-2 text-slate-400">
            <Store size={14} />
            <input 
              disabled={sessao.finalizado}
              value={sessao.mercadoNome}
              onChange={e => setSessao({...sessao, mercadoNome: e.target.value})}
              placeholder="Nome do Mercado..."
              className="bg-transparent border-none p-0 text-sm focus:ring-0 w-full text-slate-300 placeholder-slate-600"
            />
          </div>
        </div>
      </div>

      {/* BUSCA */}
      <div className="relative mb-6 sticky top-4 z-10">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search size={20} className="text-slate-500" />
        </div>
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar produto..."
          className="w-full bg-slate-900 py-4 pl-12 pr-4 rounded-2xl border border-slate-800 shadow-sm text-white placeholder-slate-500 font-medium focus:ring-2 focus:ring-green-500 transition-shadow"
        />
        {busca && (
          <button onClick={() => setBusca("")} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-200">
            <X size={20} />
          </button>
        )}
      </div>

      {/* LISTA */}
      <div className="space-y-3">
        {itensFiltrados.length === 0 ? (
          <div className="text-center py-10 text-slate-600 font-medium">Nenhum produto em modo compra.</div>
        ) : (
          itensFiltrados.map(item => (
            <div 
              key={item.id} 
              onClick={() => toggleItem(item)}
              className={`flex items-center p-4 rounded-2xl border-2 transition-all ${item.comprado ? 'bg-green-950/30 border-green-900' : 'bg-slate-900 border-slate-800 shadow-sm'}`}
            >
              <div className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center shrink-0 ${item.comprado ? 'bg-green-600 border-green-600' : 'border-slate-600'}`}>
                {item.comprado && <Check size={14} className="text-white" />}
              </div>
              
              <div className={`flex-1 flex flex-col ${item.comprado ? 'opacity-50' : ''}`}>
                <span className={`font-bold ${item.comprado ? 'text-green-500 line-through' : 'text-slate-200'}`}>{item.nome}</span>
                {item.comprado && (
                  <span className="text-xs text-green-500/70 font-medium">{item.qtd} {isNaN(Number(item.qtd)) ? '' : 'un'}</span>
                )}
              </div>

              {item.comprado && (
                <span className="font-mono font-black text-green-400 text-lg">R$ {item.total?.toFixed(2)}</span>
              )}
            </div>
          ))
        )}
      </div>

      {/* TOTAL E FINALIZAÇÃO */}
      <div className="fixed bottom-6 right-6 left-6 flex flex-col gap-2 z-20">
        <button 
          onClick={() => !sessao.finalizado && setConfirmarFinalizacao(true)}
          disabled={sessao.finalizado}
          className={`w-full p-6 rounded-[28px] shadow-2xl flex justify-between items-center border transition-all ${sessao.finalizado ? 'bg-slate-800 border-slate-700' : 'bg-slate-900 border-slate-700 active:scale-95'}`}
        >
          <div className="text-left">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{sessao.finalizado ? "COMPRA ENCERRADA" : "ENCERRAR COMPRA"}</p>
            <p className="text-3xl font-black text-green-400">R$ {total.toFixed(2).replace('.', ',')}</p>
          </div>
          <ShoppingCart className="text-slate-600" size={32} />
        </button>
      </div>

      {/* MODAL DETALHES COMPRA */}
      {selecionado && !sessao.finalizado && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-[60]">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-t-[32px] sm:rounded-[32px] p-8 shadow-2xl">
            <h2 className="text-2xl font-black mb-6 text-white">{selecionado.nome}</h2>
            
            <div className="flex bg-slate-950 p-1 rounded-xl mb-6">
              <button 
                onClick={() => setModoModal('QTD')}
                className={`flex-1 py-3 text-sm font-black rounded-lg transition-all ${modoModal === 'QTD' ? 'bg-slate-800 text-blue-400 shadow-sm' : 'text-slate-500'}`}
              >
                POR QTD
              </button>
              <button 
                onClick={() => setModoModal('PESO')}
                className={`flex-1 py-3 text-sm font-black rounded-lg transition-all flex items-center justify-center gap-2 ${modoModal === 'PESO' ? 'bg-slate-800 text-orange-400 shadow-sm' : 'text-slate-500'}`}
              >
                <Scale size={16} /> POR PESO
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              {modoModal === 'QTD' ? (
                <>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase">Preço Un.</label>
                    <input type="number" step="0.01" value={form.preco} onChange={e => setForm({...form, preco: e.target.value})} className="w-full p-4 bg-slate-950 text-white rounded-2xl text-xl font-bold border border-slate-800" placeholder="0,00" autoFocus />
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase">Quantidade</label>
                    <input type="number" step="0.5" value={form.qtd} onChange={e => setForm({...form, qtd: e.target.value})} className="w-full p-4 bg-slate-950 text-white rounded-2xl text-xl font-bold text-center border border-slate-800" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-black text-orange-500 uppercase">Peso/Volume</label>
                    <input type="text" value={form.peso} onChange={e => setForm({...form, peso: e.target.value})} className="w-full p-4 bg-orange-950/20 text-orange-400 rounded-2xl text-xl font-bold border border-orange-900/50" placeholder="Ex: 0.5kg" autoFocus />
                  </div>
                  <div>
                    <label className="text-xs font-black text-orange-500 uppercase">Valor Final</label>
                    <input type="number" step="0.01" value={form.valorTotal} onChange={e => setForm({...form, valorTotal: e.target.value})} className="w-full p-4 bg-orange-950/20 text-orange-400 rounded-2xl text-xl font-bold text-center border border-orange-900/50" placeholder="0,00" />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setSelecionado(null)} className="flex-1 py-4 font-bold text-slate-400 hover:bg-slate-800 rounded-2xl">Cancelar</button>
              <button onClick={confirmarItem} className={`flex-[2] text-white py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-transform ${modoModal === 'QTD' ? 'bg-blue-600' : 'bg-orange-600'}`}>
                {modoModal === 'QTD' ? 'SALVAR QTD' : 'SALVAR PESO'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO ENCERRAMENTO */}
      {confirmarFinalizacao && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 z-[70]">
          <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-8 w-full max-w-sm text-center shadow-2xl">
            <div className="w-20 h-20 bg-orange-500/20 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingCart size={40} />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Encerrar compra?</h2>
            <p className="text-slate-400 mb-8">Após encerrar, você não poderá mais editar os valores ou itens desta lista.</p>
            <div className="flex flex-col gap-3">
              <button onClick={finalizarCompra} className="w-full bg-green-600 text-white py-4 rounded-2xl font-black shadow-lg">SIM, ENCERRAR</button>
              <button onClick={() => setConfirmarFinalizacao(false)} className="w-full py-4 font-bold text-slate-400 hover:bg-slate-800 rounded-2xl">VOLTAR</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}