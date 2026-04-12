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
  return rows.map(r => ({ id: r.get('Id'), nome: r.get('Item'), ordem: Number(r.get('Ordem')) }))
             .sort((a, b) => a.ordem - b.ordem);
}

export async function adicionarItemBase(nome: string) {
  const doc = await conectar();
  const sheet = doc.sheetsByTitle['lista'];
  const rows = await sheet.getRows();
  await sheet.addRow({ Id: Date.now().toString(), Item: nome, Ordem: rows.length + 1 });
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
      row.set('Ordem', item.ordem);
      await row.save();
    }
  }
  revalidatePath('/lista');
}

// --- FUNÇÕES DO MERCADO (SNAPSHOT MENSAL) ---

export async function iniciarMercadoAction() {
  const doc = await conectar();
  const listaSheet = doc.sheetsByTitle['lista'];
  const itens = await listaSheet.getRows();

  const meses = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  const agora = new Date();
  const nomeAba = `${meses[agora.getMonth()]}${agora.getFullYear().toString().slice(-2)}`;

  let mercadoSheet = doc.sheetsByTitle[nomeAba];
  if (!mercadoSheet) {
    mercadoSheet = await doc.addSheet({ 
      title: nomeAba, 
      headerValues: ['Id', 'Item', 'Comprado', 'Preco', 'Qtd', 'Total', 'Mercado', 'Finalizado'] 
    });
    
    const novosDados = itens.map(i => ({
      Id: i.get('Id'),
      Item: i.get('Item'),
      Comprado: 'NÃO',
      Preco: '0',
      Qtd: '0',
      Total: '0',
      Mercado: '',
      Finalizado: 'NÃO'
    }));
    await mercadoSheet.addRows(novosDados);
  }

  const rows = await mercadoSheet.getRows();
  return {
    nomeAba,
    mercadoNome: rows[0]?.get('Mercado') || '',
    finalizado: rows[0]?.get('Finalizado') === 'SIM',
    itens: rows.map(r => ({
      id: r.get('Id'),
      nome: r.get('Item'),
      comprado: r.get('Comprado') === 'SIM',
      preco: Number(r.get('Preco')) || 0,
      qtd: Number(r.get('Qtd')) || 0
    }))
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
    row.set('Total', ((dados.preco || 0) * (dados.qtd || 0)).toFixed(2));
    if (dados.mercadoNome !== undefined) row.set('Mercado', dados.mercadoNome);
    await row.save();
  }
}

export async function finalizarCompraAction(aba: string, mercadoNome: string) {
  const doc = await conectar();
  const sheet = doc.sheetsByTitle[aba];
  const rows = await sheet.getRows();
  
  for (const row of rows) {
    row.set('Finalizado', 'SIM');
    row.set('Mercado', mercadoNome);
    await row.save();
  }
}