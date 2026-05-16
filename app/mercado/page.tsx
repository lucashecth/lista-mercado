"use client";

import { useState, useEffect } from "react";
import { Trash2, ArrowUp, ArrowDown, Plus, Loader2, ArrowLeft, ToggleLeft, ToggleRight } from "lucide-react";
import Link from "next/link";
import { buscarListaBase, adicionarItemBase, removerItemBase, reordenarItensBase, toggleItemAtivoAction } from "../actions";

export default function ListaView() {
  const [itens, setItens] = useState<{id: string, nome: string, ordem: number, ativo: boolean}[]>([]);
  const [novoItem, setNovoItem] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    buscarListaBase().then(dados => {
      setItens(dados);
      setCarregando(false);
    });
  }, []);

  const handleToggleAtivo = async (id: string, statusAtual: boolean) => {
    const novoStatus = !statusAtual;
    // Update Local para ser instantâneo
    setItens(itens.map(i => i.id === id ? { ...i, ativo: novoStatus } : i));
    // Update Google
    await toggleItemAtivoAction(id, novoStatus);
  };

  const handleAdd = async () => {
    if (!novoItem.trim()) return;
    const nomeTemp = novoItem;
    setNovoItem("");
    await adicionarItemBase(nomeTemp);
    const atualizados = await buscarListaBase();
    setItens(atualizados);
  };

  const handleRemove = async (id: string) => {
    await removerItemBase(id);
    setItens(itens.filter(i => i.id !== id));
  };

  const mover = async (index: number, direcao: 'sobe' | 'desce') => {
    const novos = [...itens];
    const target = direcao === 'sobe' ? index - 1 : index + 1;
    if (target < 0 || target >= novos.length) return;
    [novos[index], novos[target]] = [novos[target], novos[index]];
    const paraSalvar = novos.map((item, i) => ({ id: item.id, ordem: i + 1 }));
    setItens(novos.map((item, i) => ({ ...item, ordem: i + 1 })));
    await reordenarItensBase(paraSalvar);
  };

  if (carregando) return (
    <div className="flex h-screen items-center justify-center bg-slate-950">
      <Loader2 className="animate-spin text-blue-500" size={40} />
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-950 p-4 pb-20">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="p-2 bg-slate-900 rounded-full text-slate-300">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-black text-white">Minha Lista Base</h1>
      </div>
      
      <div className="flex gap-2 mb-6 sticky top-4 z-20 bg-slate-950/80 backdrop-blur-md pb-2">
        <input 
          value={novoItem} 
          onChange={e => setNovoItem(e.target.value)}
          placeholder="Adicionar produto..."
          className="flex-1 p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 placeholder-slate-500 focus:ring-2 focus:ring-blue-500"
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd} className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg active:scale-95"><Plus /></button>
      </div>

      <div className="space-y-3">
        {itens.map((item, index) => (
          <div key={item.id} className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${item.ativo ? 'bg-slate-900 border-slate-800' : 'bg-slate-950 border-slate-900 opacity-50'}`}>
            
            {/* Switch Customizado */}
            <button 
              onClick={() => handleToggleAtivo(item.id, item.ativo)}
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${item.ativo ? 'bg-green-600' : 'bg-slate-700'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${item.ativo ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>

            <span className={`flex-1 font-semibold ${item.ativo ? 'text-slate-200' : 'text-slate-500'}`}>{item.nome}</span>

            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-1">
                <button onClick={() => mover(index, 'sobe')} className="text-slate-600 hover:text-blue-400"><ArrowUp size={16}/></button>
                <button onClick={() => mover(index, 'desce')} className="text-slate-600 hover:text-blue-400"><ArrowDown size={16}/></button>
              </div>
              <button onClick={() => handleRemove(item.id)} className="text-red-900/50 hover:text-red-500 p-2"><Trash2 size={20}/></button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}