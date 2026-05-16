"use client";

import { useState, useEffect } from "react";
import { Trash2, Plus, Loader2, ArrowLeft, GripVertical } from "lucide-react";
import Link from "next/link";
import { buscarListaBase, adicionarItemBase, removerItemBase, reordenarItensBase, toggleItemAtivoAction } from "../actions";

export default function ListaView() {
  const [itens, setItens] = useState<{id: string, nome: string, ordem: number, ativo: boolean}[]>([]);
  const [novoItem, setNovoItem] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [indiceArrastado, setIndiceArrastado] = useState<number | null>(null);

  useEffect(() => {
    buscarListaBase().then(dados => {
      setItens(dados);
      setCarregando(false);
    });
  }, []);

  // Lógica do Switch funcional
  const handleToggleAtivo = async (id: string, statusAtual: boolean) => {
    const novoStatus = !statusAtual;
    // Altera o visual na hora
    setItens(prev => prev.map(i => i.id === id ? { ...i, ativo: novoStatus } : i));
    // Grava na planilha
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

  // --- LÓGICA COMRPREENSIVA DE REORDENAÇÃO (MOUSE + TOQUE CELULAR) ---
  const executarMudancaOrdem = async (origem: number, destino: number) => {
    if (origem === destino || destino < 0 || destino >= itens.length) return;
    
    const listaModificada = [...itens];
    const [itemMovido] = listaModificada.splice(origem, 1);
    listaModificada.splice(destino, 0, itemMovido);

    const dadosParaSalvar = listaModificada.map((item, i) => ({ id: item.id, ordem: i + 1 }));
    setItens(listaModificada.map((item, i) => ({ ...item, ordem: i + 1 })));
    
    await reordenarItensBase(dadosParaSalvar);
  };

  // Drag clássico (Desktop)
  const handleDragStart = (index: number) => setIndiceArrastado(index);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (indexDestino: number) => {
    if (indiceArrastado !== null) {
      executarMudancaOrdem(indiceArrastado, indexDestino);
      setIndiceArrastado(null);
    }
  };

  // Drag por Toque (Mobile iPhone/Android)
  const handleTouchStart = (index: number) => {
    setIndiceArrastado(index);
  };

  const handleTouchEnd = (e: React.TouchEvent, indexOrigem: number) => {
    const toque = e.changedTouches[0];
    // Descobre qual elemento está abaixo do dedo no momento em que ele levanta da tela
    const elementoNoPonto = document.elementFromPoint(toque.clientX, toque.clientY);
    const cardAlvo = elementoNoPonto?.closest("[data-index]");
    
    if (cardAlvo) {
      const indexDestino = parseInt(cardAlvo.getAttribute("data-index") || "");
      if (!isNaN(indexDestino)) {
        executarMudancaOrdem(indexOrigem, indexDestino);
      }
    }
    setIndiceArrastado(null);
  };

  if (carregando) return (
    <div className="flex h-screen items-center justify-center bg-slate-950">
      <Loader2 className="animate-spin text-blue-500" size={40} />
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-950 p-4 pb-20 select-none">
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
          className="flex-1 p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 text-lg"
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd} className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg active:scale-95"><Plus /></button>
      </div>

      <div className="space-y-3">
        {itens.map((item, index) => (
          <div 
            key={item.id}
            data-index={index} // Atributo crucial para a identificação do toque
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(index)}
            onTouchStart={() => handleTouchStart(index)}
            onTouchEnd={(e) => handleTouchEnd(e, index)}
            className={`flex items-center gap-3 p-4 rounded-2xl border shadow-sm transition-all ${
              indiceArrastado === index ? 'opacity-30 border-blue-500 bg-slate-950' : 
              item.ativo ? 'bg-slate-900 border-slate-800' : 'bg-slate-950 border-slate-900/40 opacity-40'
            }`}
          >
            {/* Ícone de puxador visual */}
            <div className="text-slate-600 touch-none">
              <GripVertical size={20} />
            </div>

            {/* Switch Customizado Funcional */}
            <button 
              onClick={() => handleToggleAtivo(item.id, item.ativo)}
              className={`w-12 h-6 shrink-0 rounded-full transition-colors relative flex items-center px-1 ${item.ativo ? 'bg-green-600' : 'bg-slate-700'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${item.ativo ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>

            {/* Nome do Item */}
            <span className={`flex-1 font-semibold ${item.ativo ? 'text-slate-200' : 'text-slate-600 line-through'}`}>
              {item.nome}
            </span>

            {/* Lixeira */}
            <button 
              onClick={() => handleRemove(item.id)} 
              className="text-red-900/60 hover:text-red-500 p-2 rounded-lg transition-colors"
            >
              <Trash2 size={20} />
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}