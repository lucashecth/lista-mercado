"use client";

import { useState, useEffect } from "react";
import { Trash2, ArrowUp, ArrowDown, Plus, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { buscarListaBase, adicionarItemBase, removerItemBase, reordenarItensBase } from "../actions";

export default function ListaView() {
  const [itens, setItens] = useState<{id: string, nome: string, ordem: number}[]>([]);
  const [novoItem, setNovoItem] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    buscarListaBase().then(dados => {
      setItens(dados);
      setCarregando(false);
    });
  }, []);

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
    
    // Atualiza ordens
    const paraSalvar = novos.map((item, i) => ({ id: item.id, ordem: i + 1 }));
    setItens(novos.map((item, i) => ({ ...item, ordem: i + 1 })));
    await reordenarItensBase(paraSalvar);
  };

  if (carregando) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-20">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="p-2 bg-white rounded-full shadow-sm text-slate-600">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-black text-slate-800">Minha Lista Base</h1>
      </div>
      <h1 className="text-2xl font-black text-slate-800 mb-6">Minha Lista Base</h1>
      
      <div className="flex gap-2 mb-6 sticky top-4 z-20">
        <input 
          value={novoItem} 
          onChange={e => setNovoItem(e.target.value)}
          placeholder="Adicionar produto..."
          className="flex-1 p-4 rounded-2xl border-none shadow-lg focus:ring-2 focus:ring-blue-500 text-lg"
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd} className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg active:scale-95"><Plus /></button>
      </div>

      <div className="space-y-3">
        {itens.map((item, index) => (
          <div key={item.id} className="flex items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex flex-col gap-2">
              <button onClick={() => mover(index, 'sobe')} className="text-slate-300 hover:text-blue-500"><ArrowUp size={18}/></button>
              <button onClick={() => mover(index, 'desce')} className="text-slate-300 hover:text-blue-500"><ArrowDown size={18}/></button>
            </div>
            <span className="flex-1 font-semibold text-slate-700">{item.nome}</span>
            <button onClick={() => handleRemove(item.id)} className="text-red-400 p-2"><Trash2 size={20}/></button>
          </div>
        ))}
      </div>
    </main>
  );
}