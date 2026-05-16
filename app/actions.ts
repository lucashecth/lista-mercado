"use server";

import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { revalidatePath } from 'next/cache';

const formatarChave = (chave?: string) => {
  if (!chave) return '';
  return chave.replace(/^"|"$/g, '').replace(/\\n/g, '\n');
};

const jwt = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: formatarChave(process.env.GOOGLE_PRIVATE_KEY),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function conectar() {
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, jwt);
  await doc.loadInfo();
  return doc;
}

// --- FUNÇÕES DA LISTA BASE ---

export async function buscarListaBase() {
  const doc = await conectar();
  const sheet = doc.sheetsByTitle['lista'];
  const rows = await sheet.getRows();
  
  const itens = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const nome = row.get('Item');
    if (!nome) continue;
    
    let id = row.get('Id');
    let ordem = row.get('Ordem');
    let ativo = row.get('Ativo');
    
    // Auto-ID e Auto-Ordem + Default para Ativo
    if (!id || !ordem || !ativo) {
      if (!id) { id = `planilha_${Date.now()}_${i}`; row.set('Id', id); }
      if (!ordem) { ordem = (i + 1).toString(); row.set('Ordem', ordem); }
      if (!ativo) { ativo = 'SIM'; row.set('Ativo', 'SIM'); }
      await row.save();
    }
    
    itens.push({ 
      id, 
      nome, 
      ordem: Number(ordem) || 0,
      ativo: ativo === 'SIM'
    });
  }
  return itens.sort((a, b) => a.ordem - b.ordem);
}

export async function toggleItemAtivoAction(id: string, novoStatus: boolean) {
  const doc = await conectar();
  const sheet = doc.sheetsByTitle['lista'];
  const rows = await sheet.getRows();
  const row = rows.find(r => r.get('Id') === id);
  if (row) {
    row.set('Ativo', novoStatus ? 'SIM' : 'NÃO');
    await row.save();
  }
  revalidatePath('/lista');
}

export async function adicionarItemBase(nome: string) {
  const doc = await conectar();
  const sheet = doc.sheetsByTitle['lista'];
  const rows = await sheet.getRows();
  await sheet.addRow({ 
    Id: Date.now().toString(), 
    Item: nome, 
    Ordem: (rows.length + 1).toString(),
    Ativo: 'SIM' // Item novo sempre nasce ligado
  });
  revalidatePath('/lista');
}

export async function removerItemBase(id: string) {
  const doc = await conectar();
  const sheet = doc.sheetsByTitle['lista'];
  const rows = await sheet.getRows();
  const row = rows.find(r => r.get('Id') === id);
  if (row) await row.delete();
  revalidatePath('/lista');
}

export async function reordenarItensBase(itensAtualizados: { id: string, ordem: number }[]) {
  const doc = await conectar();
  const sheet = doc.sheetsByTitle['lista'];
  const rows = await sheet.getRows();
  for (const item of itensAtualizados) {
    const row = rows.find(r => r.get('Id') === item.id);
    if (row) {
      row.set('Ordem', item.ordem.toString());
      await row.save();
    }
  }
  revalidatePath('/lista');
}

// --- FUNÇÕES DO MERCADO (FILTRADO E SEGURO) ---

export async function iniciarMercadoAction() {
  const doc = await conectar();
  const itensBase = await buscarListaBase();
  
  // FILTRO: Só leva para o mercado o que estiver ATIVO (ON)
  const itensAtivos = itensBase.filter(i => i.ativo);
  
  const meses = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  const agora = new Date();
  const nomeAba = `${meses[agora.getMonth()]}${agora.getFullYear().toString().slice(-2)}`;

  let mercadoSheet = doc.sheetsByTitle[nomeAba];
  
  // Cenário A: Aba nova
  if (!mercadoSheet) {
    mercadoSheet = await doc.addSheet({ 
      title: nomeAba, 
      headerValues: ['Id', 'Item', 'Comprado', 'Preco', 'Qtd', 'Total', 'Market', 'Finalizado'] 
    });
    const novosDados = itensAtivos.map(i => ({
      Id: i.id, Item: i.nome, Comprado: 'NÃO', Preco: '0', Qtd: '0', Total: '0', Market: '', Finalizado: 'NÃO'
    }));
    if (novosDados.length > 0) await mercadoSheet.addRows(novosDados);
  } else {
    // Cenário B: Incremental (já existe a aba, mas tem itens ativos novos na base)
    const rowsMercado = await mercadoSheet.getRows();
    const idsNoMercado = new Set(rowsMercado.map(r => r.get('Id')));
    
    const novosFaltando = itensAtivos.filter(i => !idsNoMercado.has(i.id));
    if (novosFaltando.length > 0) {
      const novosDados = novosFaltando.map(i => ({
        Id: i.id, Item: i.nome, Comprado: 'NÃO', Preco: '0', Qtd: '0', Total: '0', 
        Market: rowsMercado[0]?.get('Market') || '', Finalizado: rowsMercado[0]?.get('Finalizado') || 'NÃO'
      }));
      await mercadoSheet.addRows(novosDados);
    }
  }

  const rows = await mercadoSheet.getRows();
  return {
    nomeAba,
    mercadoNome: rows[0]?.get('Market') || '',
    finalizado: rows[0]?.get('Finalizado') === 'SIM',
    itens: rows.map(r => ({
      id: r.get('Id'),
      nome: r.get('Item'),
      comprado: r.get('Comprado') === 'SIM',
      preco: Number(r.get('Preco')) || 0,
      qtd: r.get('Qtd') || '0',
      total: Number(r.get('Total')?.toString().replace(',', '.')) || 0
    })).filter(i => i.id)
  };
}

export async function atualizarCompraAction(aba: string, id: string, dados: any) {
  const doc = await conectar();
  const sheet = doc.sheetsByTitle[aba];
  const rows = await sheet.getRows();
  const row = rows.find(r => r.get('Id') === id);
  if (row) {
    row.set('Comprado', dados.comprado ? 'SIM' : 'NÃO');
    row.set('Preco', dados.preco || 0);
    row.set('Qtd', dados.qtd || 0);
    row.set('Total', dados.total !== undefined ? dados.total : 0);
    if (dados.mercadoNome !== undefined) row.set('Market', dados.mercadoNome);
    await row.save();
  }
}

export async function finalizarCompraAction(aba: string, mercadoNome: string) {
  const doc = await conectar();
  const sheet = doc.sheetsByTitle[aba];
  const rows = await sheet.getRows();
  for (const row of rows) {
    row.set('Finalizado', 'SIM');
    row.set('Market', mercadoNome);
    await row.save();
  }
}